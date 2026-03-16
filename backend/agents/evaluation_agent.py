import os
import json
from groq import Groq
from dotenv import load_dotenv
from sqlalchemy import func
from db.models import StudySession, AssessmentHistory

# Tải biến môi trường
load_dotenv()

class EvaluationAgent:
    def __init__(self, db_session=None):
        self.api_key = os.getenv("GROQ_KEY_EVALUATION")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_EVALUATION trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile" 
        self.db = db_session

    # --- HÀM ĐÁNH GIÁ HIỆU SUẤT TỔNG THỂ (CẤU TRÚC 1-10-1) ---
    def evaluate_performance(self, user_id: int, subject: str, current_score: float, test_type: str):
        """
        Đánh giá kết quả học tập bám sát cấu trúc 1-10-1:
        - Baseline: Bỏ qua khi tính điểm trung bình, dùng làm mốc Progress.
        - Session: Lấy trung bình cộng (40% của Test Score).
        - Final: Bài cuối khóa (60% của Test Score).
        """
        
        # 1. TÌNH EFFORT SCORE (Lấy thời gian chat với AI)
        total_minutes_query = self.db.query(func.sum(StudySession.duration_minutes)).filter(
            StudySession.user_id == user_id,
            StudySession.subject == subject
        ).scalar()
        
        total_minutes = total_minutes_query if total_minutes_query else 0
        effort_score = min(100.0, (total_minutes / 600.0) * 100.0) # Giả định mốc 600 phút
        
        # 2. BÓC TÁCH CÁC LOẠI ĐIỂM
        baseline_record = self.db.query(AssessmentHistory).filter_by(
            user_id=user_id, subject=subject, test_type="baseline"
        ).order_by(AssessmentHistory.timestamp.asc()).first()
        baseline_score = baseline_record.score if baseline_record else current_score
        
        session_records = self.db.query(AssessmentHistory).filter_by(
            user_id=user_id, subject=subject, test_type="session"
        ).all()
        avg_session_score = sum(r.score for r in session_records) / len(session_records) if session_records else current_score

        # 3. TÍNH TEST SCORE CHUẨN XÁC
        if test_type == "final":
            actual_test_score = (avg_session_score * 0.4) + (current_score * 0.6)
        elif test_type == "session":
            # Cộng nhẩm bài đang thi vào trung bình session hiện tại
            total_session_count = len(session_records) + 1
            actual_test_score = ((avg_session_score * len(session_records)) + current_score) / total_session_count
        else: # Nếu vừa làm bài Baseline xong
            actual_test_score = current_score

        # 4. TÍNH PROGRESS SCORE (Độ lệch so với Baseline)
        improvement = current_score - baseline_score
        progress_score = min(100.0, max(0.0, 70.0 + improvement)) 

        # 5. CHỐT FINAL SCORE
        final_score = (0.5 * actual_test_score) + (0.3 * effort_score) + (0.2 * progress_score)
        
        # 6. GỌI AI ĐỂ TẠO NHẬN XÉT CÁ NHÂN HÓA
        evaluation_msg = self._get_ai_feedback(actual_test_score, effort_score, improvement)
        
        return {
            "actual_test_score": round(actual_test_score, 2),
            "effort_score": round(effort_score, 2),
            "progress_score": round(progress_score, 2),
            "final_score": round(final_score, 2),
            "evaluation_msg": evaluation_msg
        }

    # --- 3. PROMPT AI VIẾT LỜI PHÊ ---
    def _get_ai_feedback(self, score, effort, improvement):
        # Logic này giúp định hướng AI viết đúng trọng tâm ngay lập tức
        directive = ""
        if score >= 80 and effort < 30:
            directive = "Cảnh báo nhẹ nhàng: Điểm tốt nhưng học với Gia sư AI quá ít, nhắc nhở tránh chủ quan hoặc học vẹt."
        elif score < 50 and effort > 70:
            directive = "Động viên mạnh mẽ: Điểm thi chưa tốt nhưng rất chăm học AI, khuyên không nên nản chí."
        elif score >= 80:
            directive = "Khen ngợi: Kết quả xuất sắc và thời gian tự học xứng đáng."
        elif score < 50:
            directive = "Nhắc nhở nghiêm túc: Cần tăng cường ôn tập và trao đổi với Gia sư AI nhiều hơn."
        else:
            directive = "Ghi nhận: Kết quả ở mức khá, cần bứt phá thêm ở phần tương tác AI."

        status_text = "tăng" if improvement >= 0 else "giảm"

        # Prompt "Thiết quân luật" - Ép AI vào khuôn khổ
        prompt = f"""
        Bạn là Giảng viên AI. Hãy viết nhận xét cho học viên dựa trên dữ liệu thật này:
        - Điểm kiểm tra tổng hợp: {score}/100
        - Nỗ lực tự học (Thời gian chat với AI): {effort}%
        - Tiến bộ so với đầu vào: {status_text} {abs(improvement)} điểm.

        MỆNH LỆNH CỦA BẠN (Follow this strictly): {directive}

        QUY TẮC BẮT BUỘC:
        1. Viết DUY NHẤT một đoạn văn ngắn (tối đa 40 từ).
        2. Tuyệt đối KHÔNG viết các câu giả định như "Nếu điểm cao thì...", "Hoặc nếu...".
        3. Chỉ nhận xét thẳng vào trường hợp cụ thể này.
        4. Giọng văn: Chân thành, ngắn gọn, súc tích.
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.3, # Giảm xuống thấp để AI bớt sáng tạo lung tung
                max_tokens=100,  # Giới hạn cứng số lượng từ trả về (Tiết kiệm token)
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ Lỗi Evaluation Agent AI: {e}")
            # Fallback (Dự phòng) nếu AI lỗi
            if score >= 80: return "Kết quả rất tốt! Hãy tiếp tục duy trì phong độ này nhé."
            if score < 50: return "Kết quả chưa tốt lắm, hãy trao đổi thêm với Gia sư AI nhé."
            return "Bạn đã hoàn thành bài thi. Hãy cố gắng hơn ở lần sau!"