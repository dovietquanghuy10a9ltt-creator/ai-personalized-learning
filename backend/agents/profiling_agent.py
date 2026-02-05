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

    def classify_learner(self, correct_count: int, total_questions: int, subject: str):
        """
        Phân loại năng lực học viên dựa trên kết quả hiện tại và lịch sử học tập.
        """
        if total_questions == 0:
            return "Beginner"

        score_percent = (correct_count / total_questions) * 100
        
        # 1. LẤY HỒ SƠ QUÁ KHỨ (Tương tác với DB)
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        avg_score = profile.avg_score if profile else score_percent
        
        # 2. PHÂN LOẠI CƠ BẢN (Rule-based)
        if score_percent < 40:
            base_level = "Beginner"
        elif 40 <= score_percent <= 70:
            base_level = "Intermediate"
        else:
            base_level = "Advanced"

        # 3. GỌI AI ĐỂ TINH CHỈNH PHÂN LOẠI (Hệ thống đa tác tử)
        # AI sẽ xem xét liệu điểm bài này có phản ánh đúng thực lực (avg_score) hay không
        refined_level = self._get_ai_refined_level(subject, score_percent, avg_score, base_level)
        
        return refined_level

    def _get_ai_refined_level(self, subject, current_score, avg_score, base_level):
        """
        AI phân tích xu hướng năng lực để tránh việc xếp loại sai do một bài thi may mắn/xui xẻo.
        """
        prompt = f"""
        Bạn là Chuyên gia Phân tích Năng lực (Profiling Agent). 
        Hãy xác định trình độ học viên môn {subject} dựa trên:
        - Điểm bài hiện tại: {current_score}%
        - Điểm trung bình lịch sử: {avg_score}%
        - Xếp loại sơ bộ: {base_level}

        QUY TẮC:
        - Nếu điểm hiện tại cao đột biến so với trung bình, hãy giữ mức {base_level} nhưng ghi chú là 'Potential'.
        - Nếu điểm thấp đột biến, đừng hạ cấp học viên ngay.
        - Trả về JSON: {{ "final_level": "Beginner/Intermediate/Advanced", "confidence": "High/Low" }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                response_format={"type": "json_object"}
            )
            data = json.loads(chat_completion.choices[0].message.content)
            return data.get("final_level", base_level)
        except Exception as e:
            print(f"❌ Lỗi Profiling Agent AI: {e}")
            return base_level