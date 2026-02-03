# backend/agents/adaptive_agent.py
import json
import re
import os
from sqlalchemy.orm import Session
from groq import Groq
from dotenv import load_dotenv
from db.models import LearnerProfile, AssessmentHistory

# Tải biến môi trường
load_dotenv()

class AdaptiveAgent:
    def __init__(self, db: Session):
        self.db = db
        # 👇 SỬ DỤNG API KEY RIÊNG CHO ADAPTIVE AGENT
        self.api_key = os.getenv("GROQ_KEY_ADAPTIVE")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_ADAPTIVE trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.1-8b-instant" # Model mạnh nhất để phân tích lộ trình

    def generate_learning_path(self, subject: str):
        """
        Tạo lộ trình cá nhân hóa dựa trên dữ liệu thực tế từ Database.
        """
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        # Tương tác với Assessment Agent thông qua bảng AssessmentHistory
        last_test = self.db.query(AssessmentHistory)\
            .filter_by(subject=subject)\
            .order_by(AssessmentHistory.timestamp.desc()).first()
        
        if not profile:
            return {"message": "Chưa có dữ liệu học tập. Hãy làm bài kiểm tra trước!"}

        current_level = profile.current_level
        avg_score = profile.avg_score if profile.avg_score else 0
        
        # Lấy chi tiết lỗi sai (wrong_detail) đã được Evaluation Agent lưu lại
        wrong_data = "Kiến thức tổng quát"
        if last_test and last_test.wrong_detail:
            try:
                # Trích xuất nội dung các câu sai để AI phân tích
                wrongs = json.loads(last_test.wrong_detail)
                wrong_data = "\n".join([f"- Câu hỏi: {w['question']} | Bạn chọn: {w['student_choice']}" for w in wrongs])
            except:
                wrong_data = "Lỗi trong quá trình đọc chi tiết bài làm."

        prompt = f"""
        BẠN LÀ GIA SƯ AI CHUYÊN NGHIỆP MÔN {subject}.
        
        DỮ LIỆU THỰC TẾ CỦA HỌC VIÊN:
        - Trình độ hiện tại: {current_level}
        - Điểm trung bình: {round(avg_score, 1)}/100
        - CHI TIẾT CÁC CÂU LÀM SAI: 
        {wrong_data}

        NHIỆM VỤ: Thiết kế lộ trình 3 bước "VÁ LỖ HỔNG".
        1. Phân tích chính xác tại sao học viên sai dựa trên các câu hỏi trên.
        2. Đề xuất hành động cụ thể để khắc phục.
        3. Đi thẳng vào vấn đề, nghiêm khắc và chuyên nghiệp.

        TRẢ VỀ KẾT QUẢ DƯỚI DẠNG JSON LIST (KHÔNG GIẢI THÍCH THÊM):
        [
            {{
                "step": "Bước 1", 
                "topic": "Tên chủ đề cần vá", 
                "action": "Hành động thực tế học viên phải làm", 
                "reason": "Giải thích lỗi sai cốt lõi của họ"
            }}
        ]
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "Bạn là AI chuyên gia giáo dục. Chỉ trả về JSON hợp lệ."},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            content = chat_completion.choices[0].message.content
            # Trích xuất JSON bằng Regex để đảm bảo an toàn
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            
            # Nếu AI trả về object có key 'path' hoặc 'steps'
            data = json.loads(content)
            return data.get("path", data.get("steps", data))
            
        except Exception as e:
            print(f"❌ Lỗi Adaptive Agent (Path): {e}")
            return []

    def chat_with_tutor(self, subject: str, user_message: str, roadmap_context: str):
        """
        Gia sư AI đồng hành, sử dụng API riêng biệt.
        """
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        last_test = self.db.query(AssessmentHistory)\
            .filter_by(subject=subject)\
            .order_by(AssessmentHistory.timestamp.desc()).first()
        
        current_level = profile.current_level if profile else "Beginner"
        wrong_info = last_test.wrong_detail if (last_test and last_test.wrong_detail) else "Không có dữ liệu lỗi."

        prompt = f"""
        BẠN LÀ GIA SƯ AI MÔN {subject}.
        
        BỐI CẢNH HỌC VIÊN:
        - Trình độ: {current_level}
        - Lịch sử lỗi sai: {wrong_info}
        - Lộ trình đang theo dõi: {roadmap_context}

        QUY TẮC:
        1. Nếu học viên hỏi kiến thức, hãy liên hệ trực tiếp với những lỗi họ đã mắc phải.
        2. Ngôn ngữ chuyên nghiệp, tập trung lấp lỗ hổng.
        3. Tuyệt đối không khen ngợi sáo rỗng.

        Học viên hỏi: "{user_message}"
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.5
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"❌ Gia sư AI gặp lỗi kết nối API: {str(e)}"