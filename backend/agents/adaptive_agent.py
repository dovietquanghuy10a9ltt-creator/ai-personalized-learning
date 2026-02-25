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
        Dựa vào tài liệu giáo viên và trình độ học sinh để sinh lộ trình 10 buổi.
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
                    f"Mục lục, các chương và kiến thức trọng tâm của môn {subject}", 
                    k=15, 
                    filter={"source": {"$in": allowed_filenames}}
                )
                context_summary = "\n".join([doc.page_content for doc in docs])
            except Exception as e:
                print(f"⚠️ Lỗi trích xuất chủ đề: {e}")

        # 3. ADAPTIVE AGENT: Thiết kế lộ trình
        prompt = f"""
        BẠN LÀ CHUYÊN GIA THIẾT KẾ CHƯƠNG TRÌNH HỌC (ADAPTIVE LEARNING ARCHITECT).
        
        NHIỆM VỤ: Dựa vào TÀI LIỆU GIÁO VIÊN dưới đây để chia môn {subject} thành đúng 10 BUỔI HỌC.
        
        TÀI LIỆU GIÁO VIÊN (NGUỒN DUY NHẤT):
        {context_summary if context_summary else "Không có tài liệu, hãy sử dụng kiến thức chuẩn của môn " + subject}

        YÊU CẦU NGHIÊM NGẶT:
        1. KHÔNG ĐƯỢC tự ý đưa các chủ đề không liên quan (như Machine Learning, AI) nếu tài liệu không nhắc tới.
        2. Lộ trình phải phù hợp với trình độ: {current_level}.
        3. Định dạng trả về phải là JSON có đúng 10 session.

        JSON STRUCTURE:
        {{
            "roadmap": [
                {{
                    "session": 1,
                    "topic": "Tên chủ đề từ tài liệu",
                    "description": "Mô tả nội dung buổi học này cho mức {current_level}. Lưu ý cách thực hành với Gia sư AI.",
                    "focus_level": "{current_level}"
                }}
            ]
        }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a strict curriculum architect. Only use provided context. Output JSON."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.2, # Thấp để đảm bảo tính chính xác
                response_format={"type": "json_object"}
            )
            
            roadmap_data = json.loads(chat_completion.choices[0].message.content)
            final_roadmap = roadmap_data.get("roadmap", [])
            
            # Đảm bảo đủ 10 session (đề phòng AI sinh thiếu)
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

    def chat_with_tutor(self, subject: str, user_message: str, roadmap_context: str, allowed_filenames: list = None):
        """
        Gia sư AI theo phương pháp Socrates.
        """
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
            docs = self.vector_store.similarity_search(user_message, k=4, filter=search_filter)
            context_docs = "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            context_docs = "Dữ liệu kiến thức đang được cập nhật."

        # Lấy trình độ để điều chỉnh cách dùng từ
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        current_level = profile.current_level if profile else "Beginner"

        prompt = f"""
        BẠN LÀ GIA SƯ AI SOCRATES DẠY MÔN {subject}.
        TRÌNH ĐỘ HỌC VIÊN: {current_level}
        BÀI HỌC HIỆN TẠI: {roadmap_context}
        KIẾN THỨC TỪ GIÁO TRÌNH: {context_docs}

        QUY TẮC VÀNG:
        1. Nhận xét câu trả lời của sinh viên: "{user_message}".
        2. Giải thích MỘT Ý NHỎ kiến thức từ giáo trình (ngắn gọn, dưới 3 câu).
        3. Kết thúc bằng MỘT CÂU HỎI GỢI MỞ để sinh viên tự suy nghĩ tiếp.
        4. Tuyệt đối không viết bài giảng dài.
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful Socratic Tutor. Short answers. Always end with a question."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.5
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"❌ Gia sư AI đang bận một chút: {str(e)}"