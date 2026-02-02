# backend/agents/assessment_agent.py
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import OperationalError 
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

    def get_or_create_quiz(self, subject: str, num_questions: int = 10):
        try:
            # 1. KIỂM TRA TÀI LIỆU
            docs = self.vector_store.similarity_search(subject, k=1, filter={"subject": subject})
            if not docs:
                print(f"⚠️ Chưa tìm thấy tài liệu cho môn: {subject}")
                return None

            # 2. XÁC ĐỊNH TRÌNH ĐỘ
            profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
            current_level = profile.current_level if profile else "Beginner"

            # 3. KIỂM TRA KHO CÂU HỎI
            unused_count = self.db.query(QuestionBank).filter_by(
                subject=subject, difficulty=current_level, is_used=False
            ).count()
            
            if unused_count == 0:
                print(f"🌱 Kho {current_level} trống. Đang yêu cầu AI soạn đề mới (kèm giải thích) cho {subject}...")
                self._generate_batch(subject, current_level, num_questions + 5)
                unused_count = self.db.query(QuestionBank).filter_by(
                    subject=subject, difficulty=current_level, is_used=False
                ).count()

            if unused_count < num_questions and unused_count > 0:
                print(f"🔄 Làm mới trạng thái is_used cho môn {subject}...")
                self.db.query(QuestionBank).filter_by(subject=subject, difficulty=current_level).update({"is_used": False})
                self.db.commit()

            # 4. TRUY VẤN LẤY CÂU HỎI
            questions = self.db.query(QuestionBank).filter_by(
                subject=subject, difficulty=current_level, is_used=False
            ).order_by(func.random()).limit(num_questions).all()

            return questions

        except Exception as e:
            print(f"❌ Lỗi Agent: {e}")
            return None

    def _generate_batch(self, subject, level, batch_size):
        docs = self.vector_store.similarity_search(subject, k=6, filter={"subject": subject})
        context = "\n".join([d.page_content for d in docs]) if docs else "Kiến thức cơ bản"

        prompt = PromptTemplate(
            template="""
            Bạn là chuyên gia soạn đề thi trắc nghiệm. Dựa trên ngữ cảnh: {context}
            Tạo {num} câu hỏi trắc nghiệm ĐỘC NHẤT về "{topic}" cho trình độ {level}.
            
            YÊU CẦU QUAN TRỌNG:
            1. Câu hỏi bám sát ngữ cảnh tài liệu.
            2. Trình độ {level} phải phù hợp.
            3. PHẢI có phần giải thích chi tiết (explanation) tại sao đáp án đó đúng.
            4. TRẢ VỀ JSON ARRAY DUY NHẤT.

            MẪU ĐỊNH DẠNG:
            [
              {{
                "question": "Nội dung câu hỏi?",
                "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
                "correct_answer": "A. ...",
                "explanation": "Giải thích chi tiết vì sao đáp án này đúng dựa trên ngữ cảnh bài học."
              }}
            ]
            """,
            input_variables=["num", "topic", "level", "context"]
        )

        try:
            response = (prompt | llm).invoke({"num": batch_size, "topic": subject, "level": level, "context": context})
            content = response.content if hasattr(response, 'content') else str(response)
            
            # Làm sạch chuỗi JSON
            clean_content = content.replace("```json", "").replace("```", "").strip()
            match = re.search(r'\[.*\]', clean_content, re.DOTALL)
            
            if match:
                data = json.loads(match.group(0))
                for item in data:
                    exists = self.db.query(QuestionBank).filter_by(content=item['question'].strip()).first()
                    if not exists:
                        db_q = QuestionBank(
                            subject=subject, 
                            difficulty=level, 
                            content=item['question'].strip(),
                            options=item['options'], 
                            correct_answer=item['correct_answer'],
                            explanation=item.get('explanation', "Dựa trên nội dung tài liệu.") # Lưu giải thích
                        )
                        self.db.add(db_q)
                self.db.commit()
                print(f"✅ Đã nạp thêm câu hỏi kèm giải thích cho {level}.")
        except Exception as e:
            self.db.rollback()
            print(f"❌ Lỗi xử lý AI: {e}")

    def submit_assessment(self, subject: str, user_answers: list):
        now = datetime.now()
        recent_attempt = self.db.query(AssessmentResult).filter(
            AssessmentResult.subject == subject,
            AssessmentResult.timestamp >= now - timedelta(seconds=5)
        ).first()
        if recent_attempt:
            return {"status": "ignored", "score": recent_attempt.score}

        q_ids = [a['question_id'] for a in user_answers]
        db_qs = self.db.query(QuestionBank).filter(QuestionBank.id.in_(q_ids)).all()
        
        actual_total = len(db_qs)
        if actual_total == 0: return {"score": 0, "level": "Beginner"}

        correct_count = 0
        wrong_topics = []

        for answer in user_answers:
            q = next((x for x in db_qs if x.id == answer['question_id']), None)
            if q:
                # So sánh an toàn dùng regex lấy ký tự đầu A-D
                u_match = re.search(r'[A-D]', str(answer['selected_option']).upper())
                c_match = re.search(r'[A-D]', str(q.correct_answer).upper())
                
                u_ans = u_match.group(0) if u_match else None
                c_ans = c_match.group(0) if c_match else None
                
                if u_ans and c_ans and u_ans == c_ans:
                    correct_count += 1
                else:
                    wrong_topics.append(q.content)
                q.is_used = True

        score = round((correct_count / actual_total) * 100, 2) if actual_total > 0 else 0
        
        new_result = AssessmentResult(
            subject=subject,
            score=score,
            wrong_topics=" | ".join(wrong_topics[:5])
        )
        self.db.add(new_result)
        
        level = "Intermediate" if 50 <= score < 80 else ("Advanced" if score >= 80 else "Beginner")
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        if profile:
            profile.current_level = level
            profile.avg_score = (profile.avg_score + score) / 2
        else:
            self.db.add(LearnerProfile(subject=subject, current_level=level, avg_score=score))

        self.db.commit()
        return {"score": score, "level": level}