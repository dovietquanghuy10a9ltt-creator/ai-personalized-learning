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
        self.model = "llama-3.3-70b-versatile"
        
        # Kết nối tới Vector Database (ChromaDB)
        self.vector_store = get_vector_store()

    # ==========================================
    # 1. HÀM SINH LỘ TRÌNH HỌC (ROADMAP)
    # ==========================================
    def generate_overall_roadmap(self, user_id: int, subject: str, allowed_filenames: list = None, force_level: str = None):
        current_level = force_level
        if not current_level:
            profile = self.db.query(LearnerProfile).filter_by(user_id=user_id, subject=subject).first()
            current_level = profile.current_level if profile else "Beginner"

        context_summary = ""
        if allowed_filenames:
            try:
                if current_level == "Advanced":
                    search_query = f"Kiến thức nâng cao, chuyên sâu, thiết kế hệ thống, bảo mật, tối ưu hóa, giao thức phức tạp của môn {subject}"
                elif current_level == "Intermediate":
                    search_query = f"Kiến thức vận dụng, các mô hình thực tế, thuật toán, cấu trúc chi tiết của môn {subject}"
                else:
                    search_query = f"Mục lục, giới thiệu, các khái niệm cơ bản, tổng quan của môn {subject}"

                # Tăng k lên 25 để AI nhìn được bức tranh toàn cảnh cuốn giáo trình
                docs = self.vector_store.similarity_search(
                    search_query, 
                    k=25, 
                    filter={"source": {"$in": allowed_filenames}}
                )
                context_summary = "\n".join([doc.page_content for doc in docs])
            except Exception as e:
                print(f"⚠️ Lỗi trích xuất chủ đề: {e}")

        prompt = f"""
        BẠN LÀ CHUYÊN GIA THIẾT KẾ CHƯƠNG TRÌNH HỌC (CURRICULUM ARCHITECT).
        MÔN HỌC: {subject}
        TRÌNH ĐỘ HỌC VIÊN HIỆN TẠI: {current_level.upper()}
        
        TÀI LIỆU GIÁO VIÊN (NGUỒN THAM KHẢO):
        {context_summary[:12000] if context_summary else "Không có tài liệu."}

        [CHIẾN LƯỢC ÉP KIỂU THEO TRÌNH ĐỘ]:
        Học viên đang ở trình độ **{current_level.upper()}**. Bạn PHẢI thiết kế ĐÚNG 11 SESSIONS (10 học + 1 thi).

        QUY TẮC NỘI DUNG TỪ SESSION 1 ĐẾN 10 (Lệnh sống còn):
        - Bám sát hệ thống kiến thức trong tài liệu. 
        - Phân bổ kiến thức logic từ Session 1 đến 10, không được lặp lại chủ đề.
        - Mức Intermediate/Advanced: CẤM dạy lại "Giới thiệu/Tổng quan cơ bản". Đi thẳng vào kiến thức thực tế/chuyên sâu.

        QUY TẮC SESSION 11: 
        - Bắt buộc là: {{"session": 11, "topic": "KIỂM TRA TỔNG HỢP CUỐI KHÓA", "description": "Bài thi đánh giá toàn diện...", "focus_level": "{current_level.upper()}"}}

        [YÊU CẦU ĐẦU RA JSON]:
        {{
            "strategy": "Ghi rõ chiến lược thiết kế...",
            "roadmap": [
                {{
                    "session": 1,
                    "topic": "Tên bài học...",
                    "description": "Mô tả chi tiết (Tối đa 20 từ)...",
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
                max_tokens=4000,
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
    # 2. HÀM GIA SƯ AI CHAT 
    # ==========================================
    def chat_with_tutor(self, subject: str, user_message: str, roadmap_context: str, allowed_filenames: list = None, history: list = None):
        if history is None: history = []
        
        context_docs = ""
        search_filter = {"subject": {"$eq": subject}}
        if allowed_filenames:
            search_filter = {"$and": [{"subject": {"$eq": subject}}, {"source": {"$in": allowed_filenames}}]}

        try:
            docs = self.vector_store.similarity_search(user_message, k=5, filter=search_filter)
            context_docs = "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            context_docs = "Dữ liệu kiến thức đang được cập nhật."

        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        current_level = profile.current_level if profile else "Beginner"

        system_prompt = f"""BẠN LÀ MỘT GIA SƯ AI TƯƠNG TÁC 1-1 CỰC KỲ XUẤT SẮC CỦA MÔN {subject}. 
TRÌNH ĐỘ HỌC VIÊN: {current_level}
[NỘI DUNG BUỔI HỌC HÔM NAY]: {roadmap_context}
[KIẾN THỨC TỪ TÀI LIỆU CỦA GIÁO VIÊN]: {context_docs[:4000]}

[NGUYÊN TẮC TỐI THƯỢNG]:
- TUYỆT ĐỐI KHÔNG giảng bài dài dòng. Mỗi tin nhắn chỉ đưa ra MỘT mẩu kiến thức nhỏ gắn liền với MỘT câu hỏi gợi mở.
- NẾU ĐÂY LÀ BÀI "KIỂM TRA TỔNG HỢP CUỐI KHÓA": Hãy nhắc nhở ôn tập, động viên học viên làm bài Test qua bài.

[PHONG CÁCH]: Ngắn gọn (tối đa 3-4 câu), thân thiện, năng động.
"""

        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in history[-6:]: # Chỉ lấy 6 tin nhắn gần nhất để tối ưu context
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

        # PHÂN LUỒNG TÌM KIẾM ĐỂ TRÁNH LẠC ĐỀ
        if is_final_exam:
            # Bốc diện rộng toàn bộ các chương
            search_query = f"Toàn bộ kiến thức trọng tâm, các khái niệm, bài tập, ứng dụng và tổng kết của môn {subject}"
            topic_instruction = f"- Chủ đề: TỔNG ÔN CUỐI KHÓA (Lệnh: Bốc ngẫu nhiên kiến thức rải rác ở TẤT CẢ CÁC CHƯƠNG để kiểm tra toàn diện)."
            num_questions = 20
            k_val = 30 # Lấy tận 30 mảnh kiến thức khác nhau
        else:
            # Focus cực mạnh vào đúng 1 keyword
            search_query = f"Kiến thức chuyên sâu, ví dụ thực tiễn, đoạn code, bài tập của chủ đề: {session_topic} trong môn {subject}"
            topic_instruction = f"- Chủ đề: {session_topic} (Lệnh Sống Còn: TUYỆT ĐỐI CHỈ HỎI XOAY QUANH CHỦ ĐỀ NÀY, không hỏi lan man chương khác)."
            num_questions = 10
            k_val = 20

        try:
            docs = self.vector_store.similarity_search(search_query, k=k_val, filter=search_filter)
            # Ép dung lượng nạp lên mức 15.000 ký tự để AI thông minh nhất có thể
            context_docs = "\n\n".join([doc.page_content for doc in docs])[:15000] 
        except Exception as e:
            print(f"❌ Lỗi RAG lấy tài liệu: {e}")
            context_docs = "Dữ liệu kiến thức đang được cập nhật."

        prompt = f"""
        BẠN LÀ CHUYÊN GIA KHẢO THÍ ĐẠI HỌC CỰC KỲ KHẮT KHE. NHIỆM VỤ: Soạn ĐÚNG {num_questions} câu hỏi trắc nghiệm trình độ {level.upper()}.
        - Môn học: {subject}
        {topic_instruction}

        [TÀI LIỆU CỐT LÕI (BẮT BUỘC BÁM SÁT)]:
        {context_docs}

        [TIÊU CHUẨN CHẤT LƯỢNG ĐỀ THI (CHỐNG HỌC VẸT)]:
        1. KHÔNG hỏi lý thuyết suông (Vd: "Định nghĩa là gì?", "Cấu trúc gồm mấy phần?"). Sinh viên Đại học cần tư duy!
        2. BẮT BUỘC sử dụng Tình huống thực tiễn (Case study), Đoạn code/Công thức, hoặc Bài toán logic để sinh viên phân tích và giải quyết.
        3. Phân cấp độ:
           - BEGINNER: Nhận biết khái niệm thông qua ví dụ thực tế.
           - INTERMEDIATE: Phân tích đúng sai, dự đoán kết quả, tìm lỗi sai.
           - ADVANCED: Đánh giá, tối ưu hóa hệ thống, giải quyết tình huống hóc búa.
        4. TÍNH KHÁCH QUAN: 1 đáp án ĐÚNG CHÍNH XÁC, 3 đáp án SAI NHƯNG CÓ VẺ ĐÚNG (bẫy nhiễu).

        [YÊU CẦU ĐẦU RA JSON]:
        {{
            "questions": [
                {{
                    "id": 1,
                    "content": "Tình huống / Đoạn mã / Câu hỏi tư duy...",
                    "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
                    "correct_label": "A", 
                    "explanation": "Giải thích chi tiết vì sao đúng và phân tích bẫy sai..."
                }}
            ]
        }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a top-tier examiner. You output strict and valid JSON containing the exact number of requested questions."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                max_tokens=6000, # Bơm token để viết đề dài
                temperature=0.3, # Tăng nhẹ độ sáng tạo để bớt rập khuôn
                response_format={"type": "json_object"}
            )
            
            result = json.loads(chat_completion.choices[0].message.content)
            return result.get("questions", [])
        except Exception as e:
            print(f"❌ Lỗi sinh đề thi: {e}")
            return []