# backend/agents/profiling_agent.py
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
        Áp dụng luật: < 40% Beginner, 40-70% Intermediate, > 70% Advanced.
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

        # 2. LẤY HỒ SƠ ĐỂ KIỂM TRA XU HƯỚNG (Nếu đã có lịch sử)
        profile = self.db.query(LearnerProfile).filter_by(subject=subject, user_id=user_id).first()
        avg_score = profile.avg_score if profile else score_percent
        
        # 3. GỌI AI ĐỂ TINH CHỈNH VÀ XÁC NHẬN TRÌNH ĐỘ
        # Điều này giúp hệ thống xác định mức độ phù hợp để đưa vào lộ trình học tổng thể.
        refined_level = self._get_ai_refined_level(subject, score_percent, avg_score, base_level)
        
        return refined_level

    def _get_ai_refined_level(self, subject, current_score, avg_score, base_level):
        """
        AI phân tích để đưa ra mức độ phân loại phù hợp nhất cho lộ trình học.
        """
        prompt = f"""
        Bạn là Chuyên gia Phân tích Năng lực (Learner Profiling Agent). 
        Hãy xác định trình độ học viên môn {subject} để thiết lập lộ trình học tổng thể.
        
        Dữ liệu:
        - Điểm bài test đầu vào: {current_score}%
        - Điểm trung bình tích lũy: {avg_score}%
        - Xếp loại theo luật: {base_level}

        QUY TẮC PHÂN LOẠI:
        - < 40%: Beginner
        - 40% - 70%: Intermediate
        - > 70%: Advanced

        YÊU CẦU:
        Xác nhận trình độ cuối cùng để Adaptive Agent sinh các buổi học (Sessions) phù hợp.
        Trả về JSON: {{ "final_level": "Beginner/Intermediate/Advanced", "analysis": "Lý do ngắn gọn" }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "system", "content": "You are a precise educational Profiling Agent."},
                          {"role": "user", "content": prompt}],
                model=self.model,
                response_format={"type": "json_object"}
            )
            data = json.loads(chat_completion.choices[0].message.content)
            return data.get("final_level", base_level)
        except Exception as e:
            print(f"❌ Lỗi Profiling Agent AI: {e}")
            return base_level