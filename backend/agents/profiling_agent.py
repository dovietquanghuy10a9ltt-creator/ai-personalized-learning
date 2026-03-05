import os
import json
from groq import Groq
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from db.models import LearnerProfile

# Tải biến môi trường
load_dotenv()

class ProfilingAgent:
    def __init__(self, db: Session):
        self.db = db
        self.api_key = os.getenv("GROQ_KEY_PROFILING")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_PROFILING trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile"

    def classify_learner(self, correct_count: int, total_questions: int, subject: str, user_id: int):
        """
        Đánh giá và phân loại năng lực học viên dựa trên kết quả bài test đầu vào.
        """
        if total_questions == 0:
            return "Beginner"

        # Tính toán phần trăm và làm tròn đến 2 chữ số thập phân để tránh sai số float
        score_percent = round((correct_count / total_questions) * 100, 2)
        
        # 1. PHÂN LOẠI DỰA TRÊN LUẬT CỨNG (Rule-based) - ƯU TIÊN NGƯỠNG CAO TRƯỚC
        if score_percent > 70:
            base_level = "Advanced"
        elif score_percent >= 40: 
            base_level = "Intermediate"
        else:
            base_level = "Beginner"

        # 2. KIỂM TRA HỒ SƠ (Để đảm bảo tính nhất quán dữ liệu)
        # Lưu ý: Chỉ lấy thông tin, không dùng để thay đổi base_level ở bước này
        profile = self.db.query(LearnerProfile).filter_by(subject=subject, user_id=user_id).first()
        
        return base_level