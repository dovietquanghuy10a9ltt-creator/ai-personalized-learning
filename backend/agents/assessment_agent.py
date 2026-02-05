import os
import json
import random
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
        """Hàm dọn dẹp: Xóa sạch câu hỏi cũ của môn này nếu phát hiện lỗi"""
        try:
            self.db.query(QuestionBank).filter_by(subject=subject).delete()
            self.db.commit()
            print(f"🧹 Đã xóa sạch dữ liệu lỗi cũ của môn {subject}.")
        except Exception as e:
            self.db.rollback()
            print(f"Lỗi reset data: {e}")

    def get_or_create_quiz(self, subject: str, num_questions: int = 10):
        existing_qs = self.db.query(QuestionBank).filter_by(subject=subject).all()
        if existing_qs:
            count_A = sum(1 for q in existing_qs if q.correct_answer == 'A')
            # Nếu hơn 80% câu hỏi có đáp án A -> Dữ liệu rác -> XÓA
            if len(existing_qs) > 5 and (count_A / len(existing_qs) > 0.8):
                print(f"⚠️ Phát hiện dữ liệu cũ bị lỗi (Toàn A) -> Đang tự động xóa...")
                self.force_reset_subject(subject)
        
        # --- BƯỚC 2: QUY TRÌNH LẤY ĐỀ ---
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        current_level = profile.current_level if profile else "Beginner"

        unused_questions = self.db.query(QuestionBank).filter_by(
            subject=subject, difficulty=current_level, is_used=False
        ).limit(num_questions).all()

        # Nếu thiếu câu hỏi, gọi hàm tạo thêm
        if len(unused_questions) < num_questions:
            needed = num_questions - len(unused_questions)
            
            # Gọi hàm tạo (thêm 3 câu dự phòng trùng lặp)
            result = self._generate_batch_safe(subject, current_level, needed + 3)
            
            # 👇 CHỐT CHẶN: Nếu hàm tạo trả về False (do không có tài liệu)
            if result is False:
                # Nếu trong kho cũng trống trơn -> Báo lỗi để Frontend xử lý
                if not unused_questions:
                    print("❌ LỖI: Chưa upload tài liệu, không thể tạo đề thi.")
                    return None 
            
            # Query lại sau khi đã tạo xong
            unused_questions = self.db.query(QuestionBank).filter_by(
                subject=subject, difficulty=current_level, is_used=False
            ).limit(num_questions).all()

        # Xáo trộn thứ tự câu hỏi trước khi trả về
        random.shuffle(unused_questions)
        return unused_questions[:num_questions]

    def _generate_batch_safe(self, subject: str, level: str, count: int):
        """
        Hàm tạo câu hỏi an toàn. 
        - Yêu cầu bắt buộc phải có Docs.
        - Sử dụng logic 'Blind Shuffle' để random đáp án.
        """
        # 1. Tìm kiếm tài liệu
        docs = self.vector_store.similarity_search(subject, k=6, filter={"subject": subject})
        
        # 👇 SỬA LỖI QUAN TRỌNG: Nếu không có docs -> Dừng ngay, trả về False
        if not docs:
            print(f"⚠️ CẢNH BÁO: Không tìm thấy tài liệu môn '{subject}'. Dừng tạo câu hỏi.")
            return False

        random.shuffle(docs)
        context = "\n".join([d.page_content for d in docs[:3]])

        # 2. Prompt: Ép AI luôn để đáp án đúng ở vị trí đầu tiên (Index 0)
        # Để Python lo việc xáo trộn sau đó.
        prompt = f"""
        Tạo {count} câu hỏi trắc nghiệm môn {subject}, trình độ {level}.
        
        QUY TẮC CỐT LÕI (BẮT BUỘC):
        1. Trong mảng "options", phần tử ĐẦU TIÊN (Index 0) LUÔN LUÔN là đáp án ĐÚNG.
        2. 3 phần tử còn lại là đáp án sai.
        3. KHÔNG thêm tiền tố "A.", "B." vào nội dung (Hệ thống sẽ tự thêm).
        
        Ngữ cảnh:
        {context[:3000]}

        Output JSON format:
        {{
            "questions": [
                {{
                    "question": "Nội dung câu hỏi?",
                    "options": ["ĐÁP ÁN ĐÚNG", "Sai 1", "Sai 2", "Sai 3"],
                    "explanation": "Giải thích ngắn."
                }}
            ]
        }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "JSON Generator. Option[0] is always correct."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.6,
                response_format={"type": "json_object"}
            )
            
            data = json.loads(chat_completion.choices[0].message.content)
            questions_list = data.get("questions", [])

            for item in questions_list:
                raw_options = item['options']
                if len(raw_options) < 4: continue 

                # --- LOGIC RANDOM TUYỆT ĐỐI BẰNG PYTHON ---
                # 1. Lấy nội dung đúng (Luôn là phần tử đầu tiên do Prompt quy định)
                correct_content = raw_options[0] 

                # 2. Xáo trộn vị trí danh sách
                random.shuffle(raw_options)

                # 3. Tìm xem đáp án đúng đã "trôi" về index nào
                correct_index = raw_options.index(correct_content)
                
                # 4. Gán nhãn A, B, C, D tương ứng
                labels = ["A", "B", "C", "D"]
                final_key = labels[correct_index]

                # 5. Format lại chuỗi options ("A. Nội dung")
                final_options = [f"{labels[i]}. {opt}" for i, opt in enumerate(raw_options)]

                # Lưu vào DB (Check trùng lặp)
                if not self.db.query(QuestionBank).filter(QuestionBank.content.ilike(item['question'].strip())).first():
                    db_q = QuestionBank(
                        subject=subject, 
                        difficulty=level, 
                        content=item['question'].strip(),
                        options=final_options, 
                        correct_answer=final_key, # Key chuẩn (A, B, C hoặc D)
                        explanation=item.get('explanation', ""),
                        is_used=False
                    )
                    self.db.add(db_q)

            self.db.commit()
            print(f"✅ Đã thêm {len(questions_list)} câu hỏi mới (Đã Random hóa).")
            return True

        except Exception as e:
            print(f"❌ Lỗi tạo batch: {e}")
            self.db.rollback()
            return False