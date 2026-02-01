# backend/agents/evaluation_agent.py

class EvaluationAgent:
    def evaluate_performance(self, test_score_percent: float, time_spent_seconds: int = 300, previous_avg_score: float = 50.0):
        """
        CHỨC NĂNG: Đánh giá nỗ lực và kết quả (Evaluation Agent)
        
        Công thức (Dựa trên tài liệu Mục 2.5):
        Final Score = 0.5 * Test Score + 0.3 * Effort Score + 0.2 * Progress Score
        """
        
        # 1. Tính Effort Score (Điểm nỗ lực)
        # Giả định: Thời gian học/làm bài chuẩn là 5 phút (300s). 
        # Nếu làm đủ hoặc hơn thì điểm nỗ lực cao.
        effort_score = min(100, (time_spent_seconds / 300) * 100)
        
        # 2. Tính Progress Score (Điểm tiến bộ)
        # So sánh điểm bài này với trung bình quá khứ
        improvement = test_score_percent - previous_avg_score
        # Cơ chế: Điểm cơ bản 70 + mức độ cải thiện
        progress_score = min(100, max(0, 70 + improvement)) 

        # 3. Tính Final Score (Trọng số)
        final_score = (0.5 * test_score_percent) + (0.3 * effort_score) + (0.2 * progress_score)
        
        return {
            "test_score": round(test_score_percent, 2),
            "effort_score": round(effort_score, 2),
            "progress_score": round(progress_score, 2),
            "final_score": round(final_score, 2),
            "evaluation_msg": self._get_feedback(final_score)
        }

    def _get_feedback(self, final_score):
        if final_score >= 80: return "Xuất sắc! Nỗ lực và kết quả đều rất cao."
        if final_score >= 50: return "Đạt yêu cầu. Hãy duy trì sự kiên trì."
        return "Cần cố gắng hơn. Hãy dành thêm thời gian ôn tập."