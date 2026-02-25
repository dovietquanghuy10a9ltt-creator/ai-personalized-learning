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

    def get_or_create_quiz(self, subject: str, num_questions: int = 20, allowed_files: list = None):
        """
        Sinh bài kiểm tra tổng quát phục vụ phân loại năng lực học viên.
        """
        if not allowed_files:
            print("⚠️ CẢNH BÁO: Không có danh sách file được phép cho lớp này.")
            return None

        # --- BƯỚC 1: KIỂM TRA DỮ LIỆU RÁC ---
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

        # --- BƯỚC 2: QUY TRÌNH LẤY ĐỀ TỔNG QUÁT ---
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
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
        """
        Sinh câu hỏi dựa trên toàn bộ giáo trình để đánh giá năng lực tổng thể.
        """
        print(f"\n--- DEBUG RAG ASSESSMENT ---")
        print(f"Môn học: {subject} | Số lượng cần tạo: {count}")

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
                print(f"⚠️ Không tìm thấy mảnh kiến thức nào khớp với file của lớp.")
                return False

            random.shuffle(filtered_docs)
            raw_source = filtered_docs[0].metadata.get("source", "")
            primary_source_file = os.path.basename(raw_source) if raw_source else "Unknown"
            
            context = "\n".join([d.page_content for d in filtered_docs[:5]])
            
            # --- CẬP NHẬT LẠI PROMPT CHUẨN XÁC: ÉP AI TỰ TRỘN ĐÁP ÁN ---
            prompt = f"""
            BẠN LÀ CHUYÊN GIA BIÊN SOẠN ĐỀ THI TỔNG QUÁT (ASSESSMENT AGENT).
            NHIỆM VỤ: Tạo {count} câu hỏi trắc nghiệm môn {subject} để đánh giá trình độ học viên.
            
            YÊU CẦU:
            1. Câu hỏi phải bao quát nhiều khía cạnh kiến thức trong giáo trình.
            2. Độ khó phù hợp để phân loại học viên thành: Beginner, Intermediate, Advanced.
            
            NGỮ CẢNH GIÁO TRÌNH: {context[:4000]}
            
            YÊU CẦU ĐỊNH DẠNG JSON CHUẨN XÁC:
            {{
                "questions": [
                    {{
                        "question": "Nội dung câu hỏi",
                        "options": [
                            "A. Đáp án 1",
                            "B. Đáp án 2",
                            "C. Đáp án 3",
                            "D. Đáp án 4"
                        ],
                        "correct_answer": "B",
                        "explanation": "Giải thích chi tiết tại sao B lại đúng dựa trên giáo trình."
                    }}
                ]
            }}
            QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ):
            - Mảng 'options' PHẢI có đúng 4 phần tử. BẮT BUỘC phải bắt đầu bằng chữ "A. ", "B. ", "C. ", "D. " theo đúng thứ tự.
            - BẠN PHẢI TỰ XÁO TRỘN ĐÁP ÁN ĐÚNG NGẪU NHIÊN VÀO MỘT TRONG 4 VỊ TRÍ NÀY. Không được luôn đặt đáp án đúng ở vị trí A.
            - Trường 'correct_answer' CHỈ ĐƯỢC ĐIỀN ĐÚNG 1 CHỮ CÁI DUY NHẤT (A, B, C hoặc D) tương ứng với đáp án đúng. Tuyệt đối không viết thêm bất cứ ký tự nào khác.
            """

            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You output strict JSON. You must randomize the correct answer position. 'correct_answer' MUST be a single letter: A, B, C, or D."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.3, # Nhiệt độ thấp để nó ngoan ngoãn làm theo format
                response_format={"type": "json_object"}
            )
            
            data = json.loads(chat_completion.choices[0].message.content)
            questions_list = data.get("questions", data.get("question_bank", []))

            inserted_count = 0
            for item in questions_list:
                q_text = item.get('question') or item.get('content') or item.get('text')
                raw_options = item.get('options') or item.get('choices') or []
                correct_ans = str(item.get('correct_answer', 'A')).strip().upper()
                
                if not q_text or len(raw_options) < 4: 
                    continue 

                # Bóc đúng chữ cái A,B,C,D từ correct_answer của AI
                match = re.search(r'([A-D])', correct_ans)
                final_key = match.group(1) if match else "A"

                # Chuẩn hóa lại mảng options để đảm bảo luôn là định dạng "A. Text", "B. Text"...
                labels = ["A", "B", "C", "D"]
                final_options = []
                for i in range(4):
                    # Xóa chữ A. B. cũ đi (nếu có) rồi gắn lại cho đồng bộ
                    clean_text = re.sub(r'^[A-D][\.\:\-\)]\s*', '', str(raw_options[i])).strip()
                    final_options.append(f"{labels[i]}. {clean_text}")

                if not self.db.query(QuestionBank).filter(QuestionBank.content.ilike(q_text.strip())).first():
                    db_q = QuestionBank(
                        subject=subject, 
                        difficulty=level, 
                        content=q_text.strip(),
                        options=final_options, 
                        correct_answer=final_key, # LƯU TRỰC TIẾP CHỮ A, B, C HOẶC D VÀO ĐÂY!
                        explanation=item.get('explanation', ""),
                        is_used=False,
                        source_file=primary_source_file
                    )
                    self.db.add(db_q)
                    inserted_count += 1

            self.db.commit()
            print(f"✅ Đã lưu thành công {inserted_count} câu hỏi tổng quát cho môn: {subject}")
            return True
        except Exception as e:
            print(f"❌ Lỗi AssessmentAgent: {e}")
            self.db.rollback()
            return False

    # --- HÀM MỚI THÊM VÀO ĐỂ LƯU KẾT QUẢ ---
    def submit_assessment(self, user_id: int, subject: str, user_answers: list):
        """
        Tính điểm và phân loại trình độ học viên sau khi nộp bài test.
        """
        try:
            score = 0
            total_questions = len(user_answers)
            
            if total_questions == 0:
                return None

            # 1. Tính số câu đúng
            for ans in user_answers:
                q_id = ans.get("question_id")
                selected = ans.get("selected_option")
                
                question = self.db.query(QuestionBank).filter_by(id=q_id).first()
                if question and question.correct_answer == selected:
                    score += 1

            # 2. Tính phần trăm và quyết định Level
            percentage = (score / total_questions) * 100
            
            if percentage >= 80:
                level = "Advanced"
            elif percentage >= 50:
                level = "Intermediate"
            else:
                level = "Beginner"

            # 3. Lưu vào Database (Bảng LearnerProfile)
            profile = self.db.query(LearnerProfile).filter_by(user_id=user_id, subject=subject).first()
            if profile:
                profile.current_level = level
                # Nếu model LearnerProfile có cột score, bạn có thể bỏ comment dòng dưới:
                # profile.score = percentage 
            else:
                profile = LearnerProfile(
                    user_id=user_id,
                    subject=subject,
                    current_level=level
                )
                self.db.add(profile)

            self.db.commit()
            print(f"✅ Đã chấm và lưu điểm cho User {user_id}: {percentage}% - Trình độ: {level}")
            
            # Trả về kết quả để API gọi tiếp hàm sinh lộ trình
            return {"score": percentage, "level": level}

        except Exception as e:
            self.db.rollback()
            print(f"❌ Lỗi khi lưu kết quả bài test: {e}")
            return None