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
        # Sử dụng key ADAPTIVE như bạn đã cấu hình
        self.api_key = os.getenv("GROQ_KEY_ADAPTIVE")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_ADAPTIVE trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.1-8b-instant"
        
        # Kết nối tới Vector Database (ChromaDB)
        self.vector_store = get_vector_store()

    def generate_overall_roadmap(self, user_id: int, subject: str, allowed_filenames: list = None, force_level: str = None):
        """
        Dựa vào tài liệu giáo viên và trình độ học sinh để chia thành 10 buổi học.
        """
        # 1. Xác định trình độ
        current_level = force_level
        if not current_level:
            profile = self.db.query(LearnerProfile).filter_by(user_id=user_id, subject=subject).first()
            current_level = profile.current_level if profile else "Beginner"

        # 2. CONTENT AGENT: Trích xuất nội dung thực tế từ tài liệu
        context_summary = ""
        if allowed_filenames:
            try:
                # Tìm kiếm các đoạn nội dung mang tính chất tổng quan/mục lục
                docs = self.vector_store.similarity_search(
                    f"Mục lục, các chương, kiến thức cốt lõi và nâng cao của môn {subject}", 
                    k=15, 
                    filter={"source": {"$in": allowed_filenames}}
                )
                context_summary = "\n".join([doc.page_content for doc in docs])
            except Exception as e:
                print(f"⚠️ Lỗi trích xuất chủ đề: {e}")

        # =================================================================
        # 3. PROMPT THIẾT KẾ LỘ TRÌNH (BẢN ÉP BUỘC TƯ DUY LOGIC - TRÁNH LƯỜI)
        # =================================================================
        prompt = f"""
        BẠN LÀ CHUYÊN GIA THIẾT KẾ CHƯƠNG TRÌNH HỌC (CURRICULUM ARCHITECT).
        
        MÔN HỌC: {subject}
        TRÌNH ĐỘ HỌC VIÊN HIỆN TẠI: {current_level.upper()}
        
        TÀI LIỆU GIÁO VIÊN (NGUỒN THAM KHẢO):
        {context_summary if context_summary else "Không có tài liệu."}

        [CHIẾN LƯỢC LỌC NỘI DUNG CỰC KỲ NGHIÊM NGẶT]:
        Vì học viên đang ở trình độ {current_level.upper()}, bạn PHẢI áp dụng quy tắc sau để tạo ra 10 Sessions:
        - NẾU LÀ BEGINNER: Bắt đầu từ số 0 (Giới thiệu, khái niệm cơ bản nhất, cú pháp cơ sở).
        - NẾU LÀ INTERMEDIATE: HỌC VIÊN ĐÃ BIẾT RÕ CƠ BẢN. Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC đưa các bài "Giới thiệu", "Khái niệm", "Kiểu dữ liệu", "Biến" vào lộ trình. Buổi 1 PHẢI BẮT ĐẦU từ kiến thức trung cấp (Ví dụ với C++: Mảng, Chuỗi, Con trỏ, Cấu trúc dữ liệu, OOP, Thuật toán). Nếu tài liệu không chứa phần nâng cao, hãy tự dùng kiến thức chuyên môn của bạn để sinh ra.
        - NẾU LÀ ADVANCED: Bỏ qua toàn bộ lý thuyết nền. Bắt đầu ngay vào kiến trúc phức tạp, thiết kế hệ thống, hoặc project.

        [YÊU CẦU ĐẦU RA JSON]:
        Bạn PHẢI phân tích chiến lược của mình vào trường "strategy" TRƯỚC KHI tạo mảng "roadmap". Điều này bắt buộc.
        {{
            "strategy": "Viết 1 câu giải thích lý do tại sao bạn loại bỏ các bài cơ bản và chọn bài học đầu tiên này cho trình độ {current_level}.",
            "roadmap": [
                {{
                    "session": 1,
                    "topic": "Tên bài học (Phải phản ánh đúng trình độ {current_level})",
                    "description": "Mô tả chi tiết những gì sẽ học.",
                    "focus_level": "{current_level}"
                }}
            ]
        }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a strict curriculum architect. You MUST adapt content based on the student's level. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.2, 
                response_format={"type": "json_object"}
            )
            
            roadmap_data = json.loads(chat_completion.choices[0].message.content)
            # Lấy mảng roadmap từ JSON, bỏ qua trường strategy
            final_roadmap = roadmap_data.get("roadmap", [])
            
            # Đảm bảo có data
            if len(final_roadmap) > 0:
                # Xóa lộ trình cũ trước khi lưu mới
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

    def chat_with_tutor(self, subject: str, user_message: str, roadmap_context: str, allowed_filenames: list = None, history: list = None):
        """
        Gia sư AI theo phương pháp Socrates - Dẫn dắt từng bước, bắt buộc hỏi đáp linh hoạt.
        """
        if history is None:
            history = []
            
        context_docs = ""
        # Lọc tài liệu theo môn học và file cho phép
        search_filter = {"subject": {"$eq": subject}}
        if allowed_filenames:
            search_filter = {
                "$and": [
                    {"subject": {"$eq": subject}},
                    {"source": {"$in": allowed_filenames}}
                ]
            }

        try:
            # Lấy 4 đoạn tài liệu liên quan nhất đến câu chat của user
            docs = self.vector_store.similarity_search(user_message, k=4, filter=search_filter)
            context_docs = "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            context_docs = "Dữ liệu kiến thức đang được cập nhật."

        # Lấy trình độ để điều chỉnh cách dùng từ
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        current_level = profile.current_level if profile else "Beginner"

        # TẠO SYSTEM PROMPT ĐỘC LẬP - BẢN NÂNG CẤP CẢM XÚC
        system_prompt = f"""BẠN LÀ MỘT GIA SƯ AI TƯƠNG TÁC 1-1 CỰC KỲ XUẤT SẮC CỦA MÔN {subject}. 
Nhiệm vụ của bạn là hướng dẫn sinh viên học nội dung được cung cấp theo PHƯƠNG PHÁP SOCRATES.
TRÌNH ĐỘ HỌC VIÊN: {current_level}

[NỘI DUNG BUỔI HỌC HÔM NAY]:
{roadmap_context}

[KIẾN THỨC TỪ TÀI LIỆU CỦA GIÁO VIÊN]:
{context_docs}

[NGUYÊN TẮC TỐI THƯỢNG]:
- TUYỆT ĐỐI KHÔNG ĐƯỢC xuất ra toàn bộ nội dung bài học cùng một lúc. KHÔNG giảng bài dài dòng. 
- Mỗi tin nhắn chỉ đưa ra MỘT mẩu kiến thức nhỏ gắn liền với MỘT câu hỏi.
- TUYỆT ĐỐI KHÔNG lặp lại câu chào hỏi nếu lịch sử chat đã có.

[QUY TRÌNH TƯƠNG TÁC BẮT BUỘC]:
1. Phân tích ngữ cảnh: Đọc kỹ lịch sử trò chuyện, xác định chính xác sinh viên đang ở ý nào của bài học. TUYỆT ĐỐI KHÔNG lặp lại những câu hỏi đã hỏi.
2. Đặt câu hỏi gợi mở: Thay vì đưa đáp án, hãy đặt MỘT câu hỏi để sinh viên tự suy luận.
3. Phản hồi câu trả lời của sinh viên (KÈM CẢM XÚC):
   - Nếu trả lời ĐÚNG: Khen ngợi tự nhiên ("Chuẩn luôn!", "Bạn nắm bài nhanh đấy!").
   - Nếu trả lời SAI/THIẾU: Nhẹ nhàng điều chỉnh, bổ sung ý còn thiếu.
   - Nếu sinh viên NÓI KHÔNG BIẾT: Hãy an ủi họ trước (VD: "Không sao đâu, khái niệm này ban đầu nghe hơi lạ tai tí", "Chuyện nhỏ, để mình lấy ví dụ này cho dễ hình dung nhé"), sau đó đưa ra một ví dụ đời sống để họ đoán. TUYỆT ĐỐI KHÔNG ném thẳng đáp án ra.
4. Điều hướng mượt mà (CHỐNG RẬP KHUÔN - CỰC KỲ QUAN TRỌNG): 
   - CẤM SỬ DỤNG các cụm từ máy móc như: "Câu hỏi tiếp theo:", "Câu hỏi đầu tiên:", "Bây giờ hãy...". 
   - Hãy chuyển ý như một người bạn đang kể chuyện (VD: "Tiếp đà này, bạn thử đoán xem...", "Thế còn một thiết bị nữa tên là X, bạn nghĩ nó dùng làm gì?", "À, có một cái này hay lắm...").

[PHONG CÁCH NGÔN NGỮ]:
Câu trả lời phải NGẮN GỌN (tối đa 3-4 câu), dùng từ ngữ tự nhiên, năng động, thỉnh thoảng kèm emoji (💡, ✨, 🤔) để cuộc trò chuyện không bị khô khan.
"""

        # XÂY DỰNG MẢNG TIN NHẮN (MESSAGE ARRAY)
        api_messages = [{"role": "system", "content": system_prompt}]

        # Đưa toàn bộ lịch sử trò chuyện vào đúng Role
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