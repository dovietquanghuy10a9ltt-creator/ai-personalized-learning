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
        self.model = "llama-3.3-70b-versatile" 

    def force_reset_subject(self, subject: str):
        try:
            self.db.query(QuestionBank).filter_by(subject=subject).delete()
            self.db.commit()
            print(f"🧹 Đã xóa sạch dữ liệu cũ của môn {subject}.")
        except Exception as e:
            self.db.rollback()
            print(f"Lỗi reset data: {e}")

    def get_or_create_quiz(self, subject: str, user_id: int, num_questions: int = 20, allowed_files: list = None):
        if not allowed_files:
            return None

        # ---QUÉT SẠCH CÂU HỎI RÁC DO LỖI CŨ ĐỂ LẠI ---
        existing_qs = self.db.query(QuestionBank).filter(
            QuestionBank.subject == subject,
            QuestionBank.source_file.in_(allowed_files)
        ).all()
        
        if existing_qs:
            count_A = sum(1 for q in existing_qs if q.correct_answer == 'A')
            is_looping_garbage = sum(1 for q in existing_qs if "phương thức nào" in str(q.content).lower() or "đoạn mã sau" in str(q.content).lower()) > (len(existing_qs) * 0.4)
            
            has_garbage_options = False
            for q in existing_qs:
                if len(str(q.options)) < 40 or "A. A\"" in str(q.options) or "B. B\"" in str(q.options):
                    has_garbage_options = True
                    break
            
            if has_garbage_options or is_looping_garbage or (len(existing_qs) > 5 and (count_A / len(existing_qs) > 0.8)):
                print(f"⚠️ Phát hiện bộ đề cũ bị lỗi (Lặp từ / Đáp án rỗng). Đang TIÊU DIỆT TỰ ĐỘNG...")
                self.db.query(QuestionBank).filter(
                    QuestionBank.subject == subject,
                    QuestionBank.source_file.in_(allowed_files)
                ).delete(synchronize_session=False)
                self.db.commit()
                self.db.expire_all()

        profile = self.db.query(LearnerProfile).filter_by(subject=subject, user_id=user_id).first()
        current_level = profile.current_level if profile else "Beginner"

        questions = self.db.query(QuestionBank).filter(
            QuestionBank.subject == subject,
            QuestionBank.source_file.in_(allowed_files)
        ).limit(num_questions).all()

        if len(questions) < num_questions:
            needed = num_questions - len(questions)
            print(f"🚀 AI 70B đang tạo {needed} câu hỏi CHUYÊN NGHIỆP CHO GIÁO VIÊN...")
            
            success = self._generate_batch_safe(subject, current_level, needed, allowed_files)
            if not success:
                print("⚠️ Thử tạo lại với số lượng nhỏ hơn để tránh nổ Token API...")
                self._generate_batch_safe(subject, current_level, min(10, needed), allowed_files)
            
            questions = self.db.query(QuestionBank).filter(
                QuestionBank.subject == subject,
                QuestionBank.source_file.in_(allowed_files)
            ).order_by(func.random()).limit(num_questions).all()

        if not questions: return None 

        random.shuffle(questions)
        final_result = []
        for q in questions[:num_questions]:
            try:
                parsed_options = json.loads(q.options) if isinstance(q.options, str) else q.options
            except:
                parsed_options = []
            final_result.append({
                "id": q.id,
                "content": q.content,
                "options": parsed_options,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation
            })

        return final_result

    def _generate_batch_safe(self, subject: str, level: str, count: int, allowed_files: list = None):
        if count <= 0: return True
        try:
            docs = self.vector_store.similarity_search(
                f"Kiến thức trọng tâm, bài toán thực tế, code mẫu và ứng dụng môn {subject}", 
                k=40, 
                filter={"subject": {"$eq": subject}}
            )

            if allowed_files:
                filtered_docs = [d for d in docs if os.path.basename(d.metadata.get("source", "")) in allowed_files]
            else:
                filtered_docs = docs

            if not filtered_docs: return False
            random.shuffle(filtered_docs)
            primary_source_file = os.path.basename(filtered_docs[0].metadata.get("source", "")) if filtered_docs[0].metadata.get("source", "") else "Unknown"
            
            context = "\n".join([d.page_content for d in filtered_docs[:30]])[:20000]

            # BỘ ĐỆM AN TOÀN: Chỉ xin dư 3 câu để KHÔNG BAO GIỜ bị quá tải Token làm đứt gãy JSON
            ask_count = count + 3 

            prompt = f"""
            BẠN LÀ HỘI ĐỒNG RA ĐỀ THI XUẤT BẢN CẤP QUỐC GIA CHO MÔN: "{subject}" (Trình độ: {level.upper()}).
            
            [TÀI LIỆU CỐT LÕI MÔN HỌC]:
            {context}

            [🔴 CÁC LỆNH CẤM TUYỆT ĐỐI (HỦY DIỆT SỰ LẶP LẠI VÀ ẢO GIÁC)]:
            1. CHỐNG LẶP LẠI (ANTI-LOOP): TẤT CẢ {ask_count} câu hỏi phải khai thác {ask_count} VẤN ĐỀ HOÀN TOÀN KHÁC NHAU. TUYỆT ĐỐI KHÔNG ĐƯỢC lặp lại bất kỳ câu hỏi hay đoạn code nào đã viết trước đó!
            2. CẤM ĐÁP ÁN RỖNG: Mảng "options" PHẢI CHỨA TEXT ĐÁP ÁN THẬT SỰ (Ví dụ: "Lỗi biên dịch do...", "Kết quả là 55"). CẤM TUYỆT ĐỐI việc chỉ trả về ["A", "B", "C", "D"].
            3. TIẾT KIỆM TOKEN: Phần "explanation" (giải thích) BẮT BUỘC NGẮN GỌN DƯỚI 20 TỪ. Trọng tâm, không dài dòng.
            4. VĂN PHONG ĐA DẠNG: Đừng mãi dùng chữ "Đoạn mã sau...". Hãy dùng: "Xét hàm...", "Trong mô hình...", "Khi hệ thống...".

            [KPI ĐAN XEN TƯ DUY - PHẢI TẠO ĐÚNG {ask_count} CÂU]:
            1. THỰC HÀNH/BÀI TẬP (35%):
               - Lập trình/CNTT: Bắt buộc có mã code (dùng \\n). Hỏi về output, tìm lỗi, hoặc điền vào chỗ trống.
               - Toán/Kinh tế: Đưa ra thông số, bắt tính toán.
            2. TÌNH HUỐNG/CASE STUDY (35%): Xây dựng bối cảnh dự án, phần mềm thực tế. Yêu cầu chọn phương án thiết kế tốt nhất.
            3. LÝ THUYẾT NÂNG CAO (30%): So sánh sự khác biệt bản chất. Phân tích ưu/nhược điểm. 

            [CẤU TRÚC JSON BẮT BUỘC]:
            {{
                "questions": [
                    {{
                        "concept_tested": "Tên vấn đề cốt lõi (Không trùng lặp)",
                        "question_type": "Thực hành / Bài tập" HOẶC "Tình huống (Case study)" HOẶC "Lý thuyết nâng cao",
                        "is_code_included": true/false,
                        "question": "Nội dung câu hỏi sâu sắc, dùng \\n để xuống dòng trình bày code/đoạn văn...",
                        "options": [
                            "Nội dung đáp án 1 (Phải là text thực tế)", 
                            "Nội dung đáp án 2 (Phải là text thực tế)", 
                            "Nội dung đáp án 3 (Phải là text thực tế)", 
                            "Nội dung đáp án 4 (Phải là text thực tế)"
                        ],
                        "correct_answer": "C",
                        "explanation": "Giải thích sắc bén dưới 20 từ."
                    }}
                ]
            }}
            Chỉ xuất ra chuỗi JSON. KHÔNG CHÈN TEXT BÊN NGOÀI.
            """

            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": f"You are a strict national-level examiner. Output valid JSON ONLY. Generate exactly {ask_count} highly diverse questions. NEVER output empty 'A,B,C,D' arrays in options. ZERO tolerance for repeating the same question."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.8, # Tăng lên 0.8 để bắt nó phải bung sự sáng tạo
                max_tokens=8000, 
                response_format={"type": "json_object"}
            )
            
            raw_content = chat_completion.choices[0].message.content
            clean_content = re.sub(r'```json\s*|\s*```', '', raw_content, flags=re.IGNORECASE).strip()
            
            data = json.loads(clean_content)
            questions_list = data.get("questions", [])

            inserted_count = 0
            for item in questions_list:
                if inserted_count >= count:
                    break
                    
                q_text = str(item.get('question', '')).strip()
                raw_options = item.get('options', [])
                correct_ans = str(item.get('correct_answer', 'A')).strip().upper()
                
                if not q_text or len(raw_options) < 4: continue 

                # LỚP KHIÊN THÉP: Chặn đứng đáp án rỗng hoặc chỉ chứa chữ A,B,C,D
                is_garbage = False
                for opt in raw_options:
                    clean_opt = re.sub(r'^[A-D][\.\:\-\)]\s*', '', str(opt)).strip()
                    if clean_opt in ["A", "B", "C", "D", ""] or len(clean_opt) <= 1:
                        is_garbage = True
                        break
                
                if is_garbage:
                    continue

                match = re.search(r'([A-D])', correct_ans)
                final_key = match.group(1) if match else "A"

                labels = ["A", "B", "C", "D"]
                final_options = []
                for i in range(4):
                    clean_text = re.sub(r'^[A-D][\.\:\-\)]\s*', '', str(raw_options[i])).strip()
                    final_options.append(f"{labels[i]}. {clean_text}")

                if not self.db.query(QuestionBank).filter(QuestionBank.content == q_text).first():
                    db_q = QuestionBank(
                        subject=subject, 
                        difficulty=level, 
                        content=q_text,
                        options=json.dumps(final_options, ensure_ascii=False), 
                        correct_answer=final_key,
                        explanation=f"[{item.get('question_type', 'Tư duy')}] {item.get('explanation', '')}",
                        is_used=False,
                        source_file=primary_source_file
                    )
                    self.db.add(db_q)
                    inserted_count += 1

            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            print(f"❌ Lỗi sinh batch câu hỏi (Nổ Token hoặc đứt gãy JSON): {e}")
            return False

    def submit_assessment(self, user_id: int, subject: str, user_answers: list):
        try:
            score = 0
            total_questions = len(user_answers)
            if total_questions == 0: return None

            for ans in user_answers:
                q_id = ans.get("question_id")
                selected = ans.get("selected_option")
                question = self.db.query(QuestionBank).filter_by(id=q_id, subject=subject).first()
                if question and question.correct_answer == selected:
                    score += 1

            percentage = (score / total_questions) * 100
            level = "Advanced" if percentage > 70 else "Intermediate" if percentage >= 40 else "Beginner"

            profile = self.db.query(LearnerProfile).filter_by(user_id=user_id, subject=subject).first()
            if profile:
                profile.current_level = level
            else:
                profile = LearnerProfile(
                    user_id=user_id, subject=subject, current_level=level, total_tests=0, avg_score=0.0
                )
                self.db.add(profile)

            self.db.commit()
            return {"score": percentage, "level": level}

        except Exception as e:
            self.db.rollback()
            return None