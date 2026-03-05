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
            print("⚠️ CẢNH BÁO: Không có danh sách file được phép cho lớp này.")
            return None

        # --- MÁY HÚT BỤI TỰ ĐỘNG LỌC DỮ LIỆU RÁC CŨ ---
        existing_qs = self.db.query(QuestionBank).filter(
            QuestionBank.subject == subject,
            QuestionBank.source_file.in_(allowed_files)
        ).all()
        
        if existing_qs:
            count_A = sum(1 for q in existing_qs if q.correct_answer == 'A')
            has_garbage = any(len(str(q.options)) > 200 for q in existing_qs)
            
            if has_garbage or (len(existing_qs) > 5 and (count_A / len(existing_qs) > 0.8)):
                print(f"⚠️ Phát hiện câu hỏi rác/đáp án quá dài -> TỰ ĐỘNG RESET TRẮNG...")
                self.db.query(QuestionBank).filter(
                    QuestionBank.subject == subject,
                    QuestionBank.source_file.in_(allowed_files)
                ).delete(synchronize_session=False)
                self.db.commit()

        profile = self.db.query(LearnerProfile).filter_by(subject=subject, user_id=user_id).first()
        current_level = profile.current_level if profile else "Beginner"

        questions = self.db.query(QuestionBank).filter(
            QuestionBank.subject == subject,
            QuestionBank.source_file.in_(allowed_files)
        ).limit(num_questions).all()

        if len(questions) < num_questions:
            needed = num_questions - len(questions)
            print(f"🚀 AI 70B đang tổng hợp {needed} câu hỏi... (ĐANG BỊ ÉP KPI CHỐNG LƯỜI BIẾNG)")
            self._generate_batch_safe(subject, current_level, needed + 3, allowed_files)
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
        try:
            docs = self.vector_store.similarity_search(
                f"Kiến thức chuyên sâu, bài toán tính toán, đoạn code mẫu và tình huống môn {subject}", 
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
            
            context = "\n".join([d.page_content for d in filtered_docs[:25]])[:15000]

            # =====================================================================
            # TẠO KPI ÉP BUỘC DỰA TRÊN MÔN HỌC (CHỐNG LƯỜI BIẾNG)
            # =====================================================================
            is_programming = any(kw in subject.lower() for kw in ["lập trình", "code", "đối tượng", "c++", "java", "python", "javascript", "html", "thuật toán"])
            
            num_practice = max(1, int(count * 0.45)) # Ép ít nhất 45% là Thực hành/Code
            num_case_study = max(1, int(count * 0.35)) # Ép ít nhất 35% là Tình huống
            
            if is_programming:
                kpi_rule = f"""
                [KPI ÉP BUỘC CHỐNG LƯỜI BIẾNG - BẠN SẼ BỊ PHẠT NẾU KHÔNG ĐẠT 100%]:
                Tổng số câu cần tạo là {count}. BẠN BẮT BUỘC PHẢI PHÂN BỔ CÁC LOẠI CÂU HỎI NHƯ SAU:
                1. ĐÚNG {num_practice} CÂU phải là dạng "Thực hành / Bài tập". Dạng này BẮT BUỘC PHẢI CHỨA MỘT ĐOẠN CODE ngắn do chính bạn tự viết ra (Dùng \\n và \\t). Bắt sinh viên dự đoán kết quả in ra (Output) hoặc tìm lỗi biên dịch.
                2. ĐÚNG {num_case_study} CÂU phải là dạng "Tình huống (Case study)". Đưa ra một yêu cầu thiết kế hệ thống phần mềm (VD: "Công ty cần thiết kế lớp NhanVien...") và hỏi cách vận dụng tính chất OOP.
                3. Các câu còn lại mới được phép là "Lý thuyết suy luận" (so sánh sự khác biệt).
                NẾU BẠN CHỈ TẠO RA TOÀN LÝ THUYẾT SUÔNG, ĐÓ LÀ MỘT SỰ THẤT BẠI NGHIÊM TRỌNG! BẠN PHẢI TỰ TẠO RA CODE!
                """
            else:
                kpi_rule = f"""
                [KPI ÉP BUỘC CHỐNG LƯỜI BIẾNG - BẠN SẼ BỊ PHẠT NẾU KHÔNG ĐẠT 100%]:
                Tổng số câu cần tạo là {count}. BẠN BẮT BUỘC PHẢI PHÂN BỔ CÁC LOẠI CÂU HỎI NHƯ SAU:
                1. ĐÚNG {num_case_study} CÂU phải là dạng "Tình huống (Case study)". Tự sáng tạo ra một câu chuyện, một ví dụ doanh nghiệp/đời sống thực tế để sinh viên giải quyết.
                2. ĐÚNG {num_practice} CÂU phải là dạng "Thực hành / Bài tập". Bắt sinh viên tính toán số liệu, xử lý hiện tượng dựa trên công thức/quy luật trong tài liệu.
                3. Các câu còn lại mới được phép là "Lý thuyết suy luận".
                NẾU BẠN CHỈ TẠO RA TOÀN CÂU HỎI LÝ THUYẾT, ĐÓ LÀ MỘT SỰ THẤT BẠI NGHIÊM TRỌNG!
                """

            prompt = f"""
            BẠN LÀ MỘT CHUYÊN GIA KHẢO THÍ SỐ 1 THẾ GIỚI, NỔI TIẾNG VÌ RA ĐỀ THI ĐA DẠNG VÀ THỰC TIỄN.
            Nhiệm vụ: Soạn {count} câu trắc nghiệm môn "{subject}" (Trình độ: {level.upper()}).

            [TÀI LIỆU NỀN TẢNG CHỈ ĐỂ LẤY Ý TƯỞNG KIẾN THỨC]: 
            {context}

            {kpi_rule}

            [THIẾT QUÂN LUẬT KHÁC]:
            1. KHÔNG CHÉP PHẠT: KHÔNG ĐƯỢC bốc y nguyên câu chữ trong tài liệu ra làm câu hỏi. Phải dùng kiến thức đó để tự sáng tạo ra đoạn Code mới, hoặc Tình huống giả định mới.
            2. CẤM HỎI ĐỊNH NGHĨA: Cấm các câu hỏi "... là gì?". Sinh viên cần tư duy ứng dụng.
            3. ĐÁP ÁN SIÊU NGẮN GỌN: 4 lựa chọn (A, B, C, D) CHỈ ĐƯỢC chứa tối đa 15 từ. NGHIÊM CẤM nhét đoạn code, công thức dài vào đáp án. (Nếu câu hỏi hỏi kết quả code, đáp án chỉ là Output ngắn gọn).

            [CẤU TRÚC ĐẦU RA JSON BẮT BUỘC]:
            {{
                "questions": [
                    {{
                        "question_type": "Thực hành / Bài tập" HOẶC "Tình huống (Case study)" HOẶC "Lý thuyết suy luận",
                        "is_code_included": true HOẶC false,
                        "question": "Nội dung câu hỏi (Nhớ dùng \\n nếu có chứa đoạn code, đoạn trích)...",
                        "options": [
                            "Đáp án ngắn 1", 
                            "Đáp án ngắn 2", 
                            "Đáp án ngắn 3", 
                            "Đáp án sai phổ biến 4"
                        ],
                        "correct_answer": "C",
                        "explanation": "Giải thích chi tiết."
                    }}
                ]
            }}

            Chỉ xuất JSON hợp lệ. Đảm bảo tỷ lệ các loại câu hỏi phải đúng như KPI đã giao. Bắt đầu bằng {{ "questions": [ ... ] }}. Đảm bảo đóng đủ ngoặc.
            """

            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a precise JSON generator. Output raw JSON only. You MUST rigorously follow the exact ratio of practice/code/case-study questions specified in the prompt KPI."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.6, 
                max_tokens=8000, 
                response_format={"type": "json_object"}
            )
            
            raw_content = chat_completion.choices[0].message.content
            clean_content = re.sub(r'```json\s*|\s*```', '', raw_content, flags=re.IGNORECASE).strip()
            
            data = json.loads(clean_content)
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

                if not self.db.query(QuestionBank).filter(QuestionBank.content == q_text.strip()).first():
                    db_q = QuestionBank(
                        subject=subject, 
                        difficulty=level, 
                        content=q_text.strip(),
                        options=json.dumps(final_options, ensure_ascii=False), 
                        correct_answer=final_key,
                        explanation=f"[{item.get('question_type', 'Phân tích')} | Có Code: {item.get('is_code_included', False)}] {item.get('explanation', '')}",
                        is_used=False,
                        source_file=primary_source_file
                    )
                    self.db.add(db_q)
                    inserted_count += 1

            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            print(f"❌ Lỗi sinh batch câu hỏi: {e}")
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
            level = "Advanced" if percentage >= 80 else "Intermediate" if percentage >= 50 else "Beginner"

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