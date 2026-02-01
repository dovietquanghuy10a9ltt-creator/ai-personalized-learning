# backend/agents/assessment_agent.py
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from langchain.prompts import PromptTemplate
from rag.llm import llm
from rag.vector_store import get_vector_store
from db.models import QuestionBank, LearnerProfile, AssessmentResult
import json
import re

class AssessmentAgent:
    def __init__(self, db: Session):
        self.db = db
        self.vector_store = get_vector_store()

    def get_or_create_quiz(self, subject: str, num_questions: int = 20):
        # 1. KIỂM TRA KHO CÂU HỎI: Nếu sắp hết câu chưa dùng, hãy reset lại toàn bộ
        unused_count = self.db.query(QuestionBank).filter_by(subject=subject, is_used=False).count()
        if unused_count < num_questions:
            print(f"🔄 Kho câu hỏi môn {subject} sắp hết. Đang làm mới (Reset is_used)...")
            self.db.query(QuestionBank).filter_by(subject=subject).update({"is_used": False})
            self.db.commit()

        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        current_level = profile.current_level if profile else "Beginner"

        # 2. Lấy câu hỏi từ kho
        questions = self.db.query(QuestionBank).filter_by(
            subject=subject, difficulty=current_level, is_used=False
        ).order_by(func.random()).limit(num_questions).all()

        # 3. Nếu vẫn thiếu thì mới sinh thêm
        if len(questions) < num_questions:
            needed = num_questions - len(questions)
            self._generate_batch(subject, current_level, needed + 5)
            # Lấy lại sau khi đã sinh thêm
            questions = self.db.query(QuestionBank).filter_by(
                subject=subject, difficulty=current_level, is_used=False
            ).order_by(func.random()).limit(num_questions).all()

        return questions

    def _generate_batch(self, subject, level, batch_size):
        docs = self.vector_store.similarity_search(subject, k=6, filter={"subject": subject})
        context = "\n".join([d.page_content for d in docs]) if docs else "Kiến thức cơ bản"

        prompt = PromptTemplate(
            template="""
            Bạn là chuyên gia soạn đề thi. Tạo {num} câu hỏi trắc nghiệm ĐỘC NHẤT về "{topic}" ({level}).
            Yêu cầu: Đảo ngẫu nhiên vị trí đáp án đúng (A, B, C, D), không để đáp án đúng tập trung vào một chữ cái.
            
            ĐỊNH DẠNG JSON:
            [
              {{
                "question": "Nội dung...",
                "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
                "correct_answer": "Chữ cái và nội dung"
              }}
            ]
            """,
            input_variables=["num", "topic", "level", "context"]
        )

        try:
            response = (prompt | llm).invoke({"num": batch_size, "topic": subject, "level": level, "context": context})
            content = response.content if hasattr(response, 'content') else str(response)
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                for item in data:
                    if not self.db.query(QuestionBank).filter_by(content=item['question'].strip()).first():
                        db_q = QuestionBank(
                            subject=subject, difficulty=level, content=item['question'].strip(),
                            options=item['options'], correct_answer=item['correct_answer']
                        )
                        self.db.add(db_q)
                self.db.commit()
        except Exception as e:
            print(f"❌ Lỗi sinh đề: {e}")

    def submit_assessment(self, subject: str, user_answers: list):
        """
        Sửa lỗi điểm 107% và chặn lưu trùng lặp triệt để.
        """
        # --- 1. CHẶN LƯU TRÙNG ---
        now = datetime.now()
        recent_attempt = self.db.query(AssessmentResult).filter(
            AssessmentResult.subject == subject,
            AssessmentResult.timestamp >= now - timedelta(seconds=15)
        ).first()
        if recent_attempt:
            return {"status": "ignored", "score": recent_attempt.score}

        # --- 2. TÍNH ĐIỂM CHUẨN (Dựa trên số câu thực tế tìm thấy trong DB) ---
        q_ids = [a['question_id'] for a in user_answers]
        db_qs = self.db.query(QuestionBank).filter(QuestionBank.id.in_(q_ids)).all()
        
        # SỬA LỖI 107%: Tổng số câu phải dựa trên số câu tìm thấy trong DB
        actual_total = len(db_qs)
        if actual_total == 0: return {"score": 0}

        correct_count = 0
        wrong_topics = []

        for answer in user_answers:
            # Tìm câu hỏi tương ứng trong danh sách đã truy vấn
            q = next((x for x in db_qs if x.id == answer['question_id']), None)
            if q:
                u_ans = str(answer['selected_option']).strip().upper()[0] # Lấy chữ A, B, C, D
                c_ans = str(q.correct_answer).strip().upper()[0]
                
                if u_ans == c_ans:
                    correct_count += 1
                else:
                    wrong_topics.append(q.content)
                q.is_used = True

        # Đảm bảo điểm không bao giờ vượt quá 100
        score = min((correct_count / actual_total) * 100, 100.0)

        # --- 3. LƯU KẾT QUẢ ---
        new_result = AssessmentResult(
            subject=subject,
            score=round(score, 2),
            wrong_topics=" | ".join(wrong_topics[:5])
        )
        self.db.add(new_result)
        
        # Cập nhật Level
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        level = "Intermediate" if 50 <= score < 80 else ("Advanced" if score >= 80 else "Beginner")
        if profile:
            profile.current_level = level
            profile.avg_score = (profile.avg_score + score) / 2
        else:
            self.db.add(LearnerProfile(subject=subject, current_level=level, avg_score=score))

        self.db.commit()
        return {"score": score, "level": level}