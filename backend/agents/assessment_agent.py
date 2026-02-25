import os
import json
import random
import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from groq import Groq
from dotenv import load_dotenv
from rag.vector_store import get_vector_store
from db.models import QuestionBank, LearnerProfile

load_dotenv()

class AssessmentAgent:
    def __init__(self, db: Session):
        self.db = db
        self.vector_store = get_vector_store()
        self.api_key = os.getenv("GROQ_KEY_ASSESSMENT")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_ASSESSMENT trong file .env")
        
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.1-8b-instant" 

    def force_reset_subject(self, subject: str):
        try:
            self.db.query(QuestionBank).filter_by(subject=subject).delete()
            self.db.commit()
            print(f"🧹 Đã xóa sạch dữ liệu lỗi cũ của môn {subject}.")
        except Exception as e:
            self.db.rollback()
            print(f"Lỗi reset data: {e}")

    def get_or_create_quiz(self, subject: str, user_id: int, num_questions: int = 20, allowed_files: list = None):
        """
        Sinh bài kiểm tra dựa trên trình độ cá nhân của từng User để tránh lấy nhầm profile người cũ.
        """
        if not allowed_files:
            print("⚠️ CẢNH BÁO: Không có danh sách file được phép cho lớp này.")
            return None

        # --- BƯỚC 1: KIỂM TRA DỮ LIỆU RÁC (Toàn đáp án A) ---
        existing_qs = self.db.query(QuestionBank).filter(
            QuestionBank.subject == subject,
            QuestionBank.source_file.in_(allowed_files)
        ).all()
        
        if existing_qs:
            count_A = sum(1 for q in existing_qs if q.correct_answer == 'A')
            if len(existing_qs) > 5 and (count_A / len(existing_qs) > 0.8):
                print(f"⚠️ Phát hiện dữ liệu lỗi (Toàn A) -> Đang reset...")
                self.db.query(QuestionBank).filter(
                    QuestionBank.subject == subject,
                    QuestionBank.source_file.in_(allowed_files)
                ).delete(synchronize_session=False)
                self.db.commit()

        # --- BƯỚC 2: XÁC ĐỊNH TRÌNH ĐỘ CÁ NHÂN (SỬA LỖI XỌ NGƯỜI NÀY SANG NGƯỜI KIA) ---
        # Phải lọc theo cả subject VÀ user_id
        profile = self.db.query(LearnerProfile).filter_by(subject=subject, user_id=user_id).first()
        current_level = profile.current_level if profile else "Beginner"

        questions = self.db.query(QuestionBank).filter(
            QuestionBank.subject == subject,
            QuestionBank.source_file.in_(allowed_files)
        ).limit(num_questions).all()

        if len(questions) < num_questions:
            needed = num_questions - len(questions)
            self._generate_batch_safe(subject, current_level, needed + 10, allowed_files)
            
            questions = self.db.query(QuestionBank).filter(
                QuestionBank.subject == subject,
                QuestionBank.source_file.in_(allowed_files)
            ).order_by(func.random()).limit(num_questions).all()

        if not questions:
            return None 

        random.shuffle(questions)
        return questions[:num_questions]

    def _generate_batch_safe(self, subject: str, level: str, count: int, allowed_files: list = None):
        try:
            docs = self.vector_store.similarity_search(
                f"Kiến thức tổng quát môn {subject}", 
                k=25, 
                filter={"subject": {"$eq": subject}}
            )

            if allowed_files:
                filtered_docs = [
                    d for d in docs 
                    if os.path.basename(d.metadata.get("source", "")) in allowed_files
                ]
            else:
                filtered_docs = docs

            if not filtered_docs:
                return False

            random.shuffle(filtered_docs)
            raw_source = filtered_docs[0].metadata.get("source", "")
            primary_source_file = os.path.basename(raw_source) if raw_source else "Unknown"
            context = "\n".join([d.page_content for d in filtered_docs[:5]])
            
            prompt = f"""
            Tạo {count} câu hỏi trắc nghiệm môn {subject} trình độ {level}.
            ĐỊNH DẠNG JSON:
            {{
                "questions": [
                    {{
                        "question": "Nội dung",
                        "options": ["A. ", "B. ", "C. ", "D. "],
                        "correct_answer": "B",
                        "explanation": "..."
                    }}
                ]
            }}
            YÊU CẦU: Xáo trộn đáp án đúng ngẫu nhiên. correct_answer chỉ gồm 1 chữ cái.
            """

            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "JSON output. Randomize answer positions."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            data = json.loads(chat_completion.choices[0].message.content)
            questions_list = data.get("questions", [])

            inserted_count = 0
            for item in questions_list:
                q_text = item.get('question')
                raw_options = item.get('options', [])
                correct_ans = str(item.get('correct_answer', 'A')).strip().upper()
                
                if not q_text or len(raw_options) < 4: continue 

                match = re.search(r'([A-D])', correct_ans)
                final_key = match.group(1) if match else "A"

                labels = ["A", "B", "C", "D"]
                final_options = []
                for i in range(4):
                    clean_text = re.sub(r'^[A-D][\.\:\-\)]\s*', '', str(raw_options[i])).strip()
                    final_options.append(f"{labels[i]}. {clean_text}")

                if not self.db.query(QuestionBank).filter(QuestionBank.content.ilike(q_text.strip())).first():
                    db_q = QuestionBank(
                        subject=subject, 
                        difficulty=level, 
                        content=q_text.strip(),
                        options=final_options, 
                        correct_answer=final_key,
                        explanation=item.get('explanation', ""),
                        is_used=False,
                        source_file=primary_source_file
                    )
                    self.db.add(db_q)
                    inserted_count += 1

            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            return False

    def submit_assessment(self, user_id: int, subject: str, user_answers: list):
        """
        Tính điểm và cập nhật trình độ. Đảm bảo cách ly dữ liệu User và Subject tuyệt đối.
        """
        try:
            score = 0
            total_questions = len(user_answers)
            if total_questions == 0: return None

            # 1. Tính số câu đúng (LỌC CHÍNH XÁC MÔN HỌC ĐỂ TRÁNH TRÙNG ID CÂU HỎI MÔN KHÁC)
            for ans in user_answers:
                q_id = ans.get("question_id")
                selected = ans.get("selected_option")
                
                question = self.db.query(QuestionBank).filter_by(id=q_id, subject=subject).first()
                if question and question.correct_answer == selected:
                    score += 1

            # 2. Phân loại trình độ
            percentage = (score / total_questions) * 100
            level = "Advanced" if percentage >= 80 else "Intermediate" if percentage >= 50 else "Beginner"

            # 3. Cập nhật LearnerProfile (LỌC CHÍNH XÁC USER_ID VÀ SUBJECT)
            profile = self.db.query(LearnerProfile).filter_by(user_id=user_id, subject=subject).first()
            if profile:
                profile.current_level = level
            else:
                profile = LearnerProfile(
                    user_id=user_id,
                    subject=subject,
                    current_level=level,
                    total_tests=0,
                    avg_score=0.0
                )
                self.db.add(profile)

            self.db.commit()
            print(f"✅ User {user_id} - Môn {subject}: {percentage}% ({level})")
            return {"score": percentage, "level": level}

        except Exception as e:
            self.db.rollback()
            return None