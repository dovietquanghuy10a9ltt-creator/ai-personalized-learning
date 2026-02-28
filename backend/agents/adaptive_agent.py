import json
import os
from sqlalchemy.orm import Session
from groq import Groq
from dotenv import load_dotenv
from db.models import LearnerProfile, LearningRoadmap
from rag.vector_store import get_vector_store

# Tải biến môi trường
load_dotenv()

class AdaptiveAgent:
    def __init__(self, db: Session):
        self.db = db
        self.api_key = os.getenv("GROQ_KEY_ADAPTIVE")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_ADAPTIVE trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.1-8b-instant"
        
        # Kết nối tới Vector Database (ChromaDB)
        self.vector_store = get_vector_store()

    # ==========================================
    # 1. HÀM SINH LỘ TRÌNH HỌC (ROADMAP)
    # ==========================================
    def generate_overall_roadmap(self, user_id: int, subject: str, allowed_filenames: list = None, force_level: str = None):
        # 1. Xác định trình độ
        current_level = force_level
        if not current_level:
            profile = self.db.query(LearnerProfile).filter_by(user_id=user_id, subject=subject).first()
            current_level = profile.current_level if profile else "Beginner"

        # 2. RAG ĐỘNG: LẤY TÀI LIỆU TRỌNG TÂM THEO TRÌNH ĐỘ
        context_summary = ""
        if allowed_filenames:
            try:
                # Tìm kiếm thay đổi tùy vào Level để tránh lấy lại Mục lục cơ bản
                if current_level == "Advanced":
                    search_query = f"Kiến thức nâng cao, chuyên sâu, thiết kế hệ thống, bảo mật, tối ưu hóa, giao thức phức tạp của môn {subject}"
                elif current_level == "Intermediate":
                    search_query = f"Kiến thức vận dụng, các mô hình thực tế, thuật toán, cấu trúc chi tiết của môn {subject}"
                else:
                    search_query = f"Mục lục, giới thiệu, các khái niệm cơ bản, tổng quan của môn {subject}"

                docs = self.vector_store.similarity_search(
                    search_query, 
                    k=15, 
                    filter={"source": {"$in": allowed_filenames}}
                )
                context_summary = "\n".join([doc.page_content for doc in docs])
            except Exception as e:
                print(f"⚠️ Lỗi trích xuất chủ đề: {e}")

        # 3. PROMPT THIẾT KẾ LỘ TRÌNH
        prompt = f"""
        BẠN LÀ CHUYÊN GIA THIẾT KẾ CHƯƠNG TRÌNH HỌC (CURRICULUM ARCHITECT).
        
        MÔN HỌC: {subject}
        TRÌNH ĐỘ HỌC VIÊN HIỆN TẠI: {current_level.upper()}
        
        TÀI LIỆU GIÁO VIÊN (NGUỒN THAM KHẢO DÀNH RIÊNG CHO TRÌNH ĐỘ NÀY):
        {context_summary if context_summary else "Không có tài liệu."}

        [CHIẾN LƯỢC ÉP KIỂU THEO TRÌNH ĐỘ - TUYỆT ĐỐI TUÂN THỦ]:
        Học viên đang ở trình độ **{current_level.upper()}**. Bạn PHẢI thiết kế ĐÚNG 11 SESSIONS (10 học + 1 thi).

        QUY TẮC NỘI DUNG TỪ SESSION 1 ĐẾN 10 (Lệnh sống còn):
        - NẾU LEVEL BEGINNER: Dạy tuần tự từ đầu tài liệu. Bắt đầu bằng Giới thiệu, Khái niệm, Phân loại.
        - NẾU LEVEL INTERMEDIATE: KHÔNG dạy bài Giới thiệu/Tổng quan. Bắt đầu ngay từ kiến thức vận dụng thực tế.
        - NẾU LEVEL ADVANCED: 
          1. BỎ QUA HOÀN TOÀN 50% nội dung đầu tiên của môn học.
          2. NGHIÊM CẤM đưa vào lộ trình các bài có chữ: "Giới thiệu", "Tổng quan", "Cơ bản" (Cấm dạy lại LAN/WAN/WiFi cơ bản).
          3. BẮT BUỘC 10 buổi học phải là các kiến thức KHÓ NHẤT, CHUYÊN SÂU NHẤT được trích xuất từ tài liệu ở trên.

        QUY TẮC SESSION 11: 
        - Bắt buộc là: {{"session": 11, "topic": "KIỂM TRA TỔNG HỢP CUỐI KHÓA", "description": "Bài thi đánh giá toàn diện...", "focus_level": "{current_level.upper()}"}}

        [YÊU CẦU ĐẦU RA JSON]:
        Bạn PHẢI viết chiến lược vào trường "strategy" (Ghi rõ bạn đã loại bỏ những kiến thức cơ bản nào) TRƯỚC KHI tạo mảng "roadmap".
        {{
            "strategy": "Tôi đã loại bỏ các bài... và tập trung vào các kiến thức chuyên sâu như... vì học viên là Advanced.",
            "roadmap": [
                {{
                    "session": 1,
                    "topic": "Tên bài học...",
                    "description": "Mô tả chi tiết...",
                    "focus_level": "{current_level.upper()}"
                }}
            ]
        }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a strict curriculum architect. Output valid JSON containing exactly 11 sessions."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.2, 
                response_format={"type": "json_object"}
            )
            
            roadmap_data = json.loads(chat_completion.choices[0].message.content)
            final_roadmap = roadmap_data.get("roadmap", [])
            
            if len(final_roadmap) > 0:
                self.db.query(LearningRoadmap).filter_by(user_id=user_id, subject=subject).delete()
                
                new_roadmap = LearningRoadmap(
                    user_id=user_id,
                    subject=subject,
                    level_assigned=current_level,
                    roadmap_data=final_roadmap,
                    current_session=1
                )
                self.db.add(new_roadmap)
                self.db.commit()
            
            return final_roadmap
        except Exception as e:
            print(f"❌ Lỗi sinh lộ trình: {e}")
            self.db.rollback()
            return []

    # ==========================================
    # 2. HÀM GIA SƯ AI CHAT (Không đổi)
    # ==========================================
    def chat_with_tutor(self, subject: str, user_message: str, roadmap_context: str, allowed_filenames: list = None, history: list = None):
        if history is None:
            history = []
            
        context_docs = ""
        search_filter = {"subject": {"$eq": subject}}
        if allowed_filenames:
            search_filter = {"$and": [{"subject": {"$eq": subject}}, {"source": {"$in": allowed_filenames}}]}

        try:
            docs = self.vector_store.similarity_search(user_message, k=4, filter=search_filter)
            context_docs = "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            context_docs = "Dữ liệu kiến thức đang được cập nhật."

        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        current_level = profile.current_level if profile else "Beginner"

        system_prompt = f"""BẠN LÀ MỘT GIA SƯ AI TƯƠNG TÁC 1-1 CỰC KỲ XUẤT SẮC CỦA MÔN {subject}. 
TRÌNH ĐỘ HỌC VIÊN: {current_level}
[NỘI DUNG BUỔI HỌC HÔM NAY]: {roadmap_context}
[KIẾN THỨC TỪ TÀI LIỆU CỦA GIÁO VIÊN]: {context_docs}

[NGUYÊN TẮC TỐI THƯỢNG]:
- TUYỆT ĐỐI KHÔNG giảng bài dài dòng. Mỗi tin nhắn chỉ đưa ra MỘT mẩu kiến thức nhỏ gắn liền với MỘT câu hỏi gợi mở.
- TUYỆT ĐỐI KHÔNG lặp lại câu hỏi đã hỏi.
- NẾU ĐÂY LÀ BÀI "KIỂM TRA TỔNG HỢP CUỐI KHÓA": Hãy đóng vai người nhắc nhở ôn tập, động viên học viên làm bài Test qua bài để hoàn thành môn học. Không cần dạy kiến thức mới.
- Nếu học sinh KHÔNG BIẾT: Hãy an ủi họ trước, sau đó đưa ví dụ thực tế.

[PHONG CÁCH NGÔN NGỮ]: Ngắn gọn (tối đa 3-4 câu), thân thiện, năng động, kèm emoji.
"""

        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant"] and content:
                api_messages.append({"role": role, "content": content})

        try:
            chat_completion = self.client.chat.completions.create(
                messages=api_messages,
                model=self.model,
                temperature=0.6 
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"❌ Gia sư AI đang bận truy xuất dữ liệu: {str(e)}"

    # ==========================================
    # 3. HÀM SINH CÂU HỎI TRẮC NGHIỆM
    # ==========================================
    def generate_session_quiz(self, subject: str, session_topic: str, level: str, allowed_filenames: list = None):
        context_docs = ""
        search_filter = {"subject": {"$eq": subject}}
        if allowed_filenames:
            search_filter = {
                "$and": [
                    {"subject": {"$eq": subject}},
                    {"source": {"$in": allowed_filenames}}
                ]
            }

        is_final_exam = "CUỐI KHÓA" in session_topic.upper() or "TỔNG HỢP" in session_topic.upper()

        if is_final_exam:
            search_query = f"Toàn bộ kiến thức trọng tâm, các chương và khái niệm quan trọng nhất của môn {subject}"
            topic_instruction = f"- Chủ đề kiểm tra: TỔNG ÔN CUỐI KHÓA (Hãy ra câu hỏi bao quát ngẫu nhiên TOÀN BỘ các chương của môn học, đánh giá toàn diện)."
            num_questions = 20
        else:
            search_query = f"Kiến thức chi tiết về {session_topic} trong môn {subject}"
            topic_instruction = f"- Chủ đề đang kiểm tra: {session_topic} (TUYỆT ĐỐI CHỈ HỎI KIẾN THỨC TRONG CHỦ ĐỀ NÀY)."
            num_questions = 10

        try:
            docs = self.vector_store.similarity_search(search_query, k=15, filter=search_filter)
            context_docs = "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            context_docs = "Dữ liệu kiến thức đang được cập nhật."

        prompt = f"""
        BẠN LÀ CHUYÊN GIA KHẢO THÍ CỰC KỲ KHẮT KHE.
        NHIỆM VỤ: Soạn ĐÚNG {num_questions} câu hỏi trắc nghiệm ĐỂ KIỂM TRA năng lực học sinh.
        
        [THÔNG TIN BẮT BUỘC BÁM SÁT]:
        - Môn học: {subject}
        {topic_instruction}
        - Trình độ học sinh: {level.upper()}

        [TÀI LIỆU CĂN CỨ]:
        {context_docs if context_docs else "Sử dụng kiến thức chuẩn xác của bạn."}

        [QUY TẮC RA ĐỀ THEO LEVEL (BẮT BUỘC)]:
        - NẾU LEVEL BEGINNER: Hỏi định nghĩa cơ bản, nhận biết cú pháp, khái niệm cốt lõi.
        - NẾU LEVEL INTERMEDIATE: Bỏ qua định nghĩa. Hỏi cách vận dụng, phân biệt đúng sai, đoạn code/công thức lắt léo, hoặc luồng xử lý.
        - NẾU LEVEL ADVANCED: Hỏi về tối ưu hóa, lỗi hệ thống, thiết kế kiến trúc hoặc tình huống thực tế phức tạp.

        [QUY TẮC CHỐNG ĐÁP ÁN MẬP MỜ]:
        1. TÍNH DUY NHẤT: Mỗi câu hỏi TUYỆT ĐỐI chỉ có 01 đáp án ĐÚNG NHẤT. 
        2. TÍNH KHÁCH QUAN: 3 đáp án sai phải là SAI HOÀN TOÀN về mặt học thuật, không được "có vẻ đúng".
        3. CHỐNG ẢO TƯỞNG: Bạn PHẢI tự suy luận lý do đúng/sai vào trường "explanation" TRƯỚC KHI kết xuất đáp án. Đảm bảo logic chặt chẽ.

        [YÊU CẦU ĐẦU RA JSON]:
        {{
            "questions": [
                {{
                    "id": 1,
                    "content": "Nội dung câu hỏi ở mức độ {level.upper()}...",
                    "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
                    "correct_label": "A", 
                    "explanation": "Giải thích chi tiết TẠI SAO đáp án này đúng..."
                }}
            ]
        }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a strict examiner. You MUST output exactly the requested number of questions in valid JSON format."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                max_tokens=4000,
                temperature=0.1, 
                response_format={"type": "json_object"}
            )
            
            result = json.loads(chat_completion.choices[0].message.content)
            return result.get("questions", [])
        except Exception as e:
            print(f"❌ Lỗi sinh đề thi theo bài: {e}")
            return []