import os
import json
import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from groq import Groq
from dotenv import load_dotenv
from rag.vector_store import get_vector_store
from db.models import QuestionBank, LearnerProfile, AssessmentHistory

load_dotenv()

class AssessmentAgent:
    def __init__(self, db: Session):
        self.db = db
        self.vector_store = get_vector_store()
        self.api_key = os.getenv("GROQ_KEY_ASSESSMENT")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_ASSESSMENT trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile" 

    def get_or_create_quiz(self, subject: str, num_questions: int = 10):
        try:
            docs = self.vector_store.similarity_search(subject, k=1, filter={"subject": subject})
            if not docs:
                return None

            profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
            current_level = profile.current_level if profile else "Beginner"

            unused_count = self.db.query(QuestionBank).filter_by(
                subject=subject, difficulty=current_level, is_used=False
            ).count()
            
            if unused_count == 0:
                self._generate_batch(subject, current_level, num_questions + 5)
            elif unused_count < num_questions:
                self.db.query(QuestionBank).filter_by(subject=subject, difficulty=current_level).update({"is_used": False})
                self.db.commit()

            questions = self.db.query(QuestionBank).filter_by(
                subject=subject, difficulty=current_level, is_used=False
            ).order_by(func.random()).limit(num_questions).all()

            return questions
        except Exception as e:
            print(f"❌ Lỗi Assessment Agent: {e}")
            return None

    def _generate_batch(self, subject: str, level: str, batch_size: int):
        docs = self.vector_store.similarity_search(subject, k=6, filter={"subject": subject})
        context = "\n".join([d.page_content for d in docs]) if docs else "Kiến thức cơ bản."

        prompt = f"""
        BẠN LÀ CHUYÊN GIA SOẠN ĐỀ THI MÔN {subject}.
        NGỮ CẢNH: {context[:5000]}
        
        NHIỆM VỤ: Tạo {batch_size} câu hỏi trắc nghiệm cho trình độ {level}.
        
        YÊU CẦU QUAN TRỌNG:
        1. "correct_answer" CHỈ ĐƯỢC CHỨA 1 ký tự duy nhất là A, B, C hoặc D.
        2. "explanation" phải ngắn gọn, súc tích (tối đa 2 câu) để tránh làm form bị dài quá mức.
        3. Các tùy chọn trong "options" PHẢI bắt đầu bằng "A. ", "B. ",...
        
        TRẢ VỀ JSON ARRAY:
        [
          {{
            "question": "Nội dung?",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "correct_answer": "A",
            "explanation": "Giải thích tại sao..."
          }}
        ]
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "Bạn là AI soạn đề thi. Trả về JSON Array. correct_answer chỉ gồm 1 chữ cái."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            
            content = chat_completion.choices[0].message.content
            data = json.loads(content)
            questions_list = data.get("questions", data) if isinstance(data, dict) else data

            for item in questions_list:
                exists = self.db.query(QuestionBank).filter_by(content=item['question'].strip()).first()
                if not exists:
                    # --- CHUẨN HÓA ĐÁP ÁN TRƯỚC KHI LƯU ---
                    raw_correct = str(item['correct_answer']).strip().upper()
                    # Chỉ lấy ký tự đầu tiên (A, B, C, D)
                    clean_correct = raw_correct[0] if raw_correct else "A"

                    db_q = QuestionBank(
                        subject=subject, 
                        difficulty=level, 
                        content=item['question'].strip(),
                        options=item['options'], 
                        correct_answer=clean_correct, # Lưu "A" thay vì "A. Nội dung"
                        explanation=item.get('explanation', "Kiến thức trọng tâm."),
                        is_used=False
                    )
                    self.db.add(db_q)
            
            self.db.commit()
            print(f"✅ Đã nạp thêm {len(questions_list)} câu hỏi chuẩn hóa.")
            
        except Exception as e:
            self.db.rollback()
            print(f"❌ Lỗi soạn đề: {e}")