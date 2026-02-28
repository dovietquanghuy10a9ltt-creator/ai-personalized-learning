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
        self.model = "llama-3.1-8b-instant"

    def classify_learner(self, correct_count: int, total_questions: int, subject: str, user_id: int):
        """
        Đánh giá và phân loại năng lực học viên dựa trên kết quả bài test đầu vào.
        Sử dụng Rule-based (Luật cứng) để đảm bảo độ chính xác tuyệt đối.
        """
        if total_questions == 0:
            return "Beginner"

        score_percent = (correct_count / total_questions) * 100
        
        # 1. PHÂN LOẠI DỰA TRÊN LUẬT CỨNG (Rule-based)
        if score_percent < 40:
            base_level = "Beginner"
        elif 40 <= score_percent <= 70:
            base_level = "Intermediate"
        else:
            base_level = "Advanced"

        # 2. LẤY HỒ SƠ ĐỂ KIỂM TRA
        profile = self.db.query(LearnerProfile).filter_by(subject=subject, user_id=user_id).first()
        avg_score = profile.avg_score if profile else score_percent
        
        # 3. TRẢ VỀ TRỰC TIẾP KẾT QUẢ TỪ TOÁN HỌC
        return base_level