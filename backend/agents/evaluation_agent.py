import os
import json
from groq import Groq
from dotenv import load_dotenv

# Tải biến môi trường
load_dotenv()

class EvaluationAgent:
    def __init__(self, db_session=None):
        # 👇 SỬ DỤNG API KEY RIÊNG CHO EVALUATION AGENT
        self.api_key = os.getenv("GROQ_KEY_EVALUATION")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_EVALUATION trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile" 
        self.db = db_session

    # --- 1. HÀM CHẤM ĐIỂM CHI TIẾT (QUAN TRỌNG ĐỂ FIX LỖI FRONTEND) ---
    def evaluate_submission(self, submission_answers, original_questions):
        """
        So sánh đáp án người dùng chọn với đáp án đúng trong Database.
        Trả về danh sách kết quả chi tiết kèm 'correct_label' chuẩn (A, B, C, D).
        """
        results = []
        correct_count = 0

        # Tạo map câu hỏi để tra cứu nhanh
        question_map = {q.id: q for q in original_questions}

        for ans in submission_answers:
            q_id = ans.question_id
            user_choice = ans.selected_option # Ví dụ: "A" hoặc "A. Nội dung..."
            
            question = question_map.get(q_id)
            if not question:
                continue

            # Lấy đáp án đúng từ DB (Ví dụ: "A. Mạng cục bộ...")
            correct_full = question.correct_answer 
            
            # --- LOGIC XỬ LÝ CHUỖI ĐỂ SO SÁNH ---
            # Chỉ lấy ký tự đầu tiên (A, B, C, D) để so sánh cho chính xác
            user_label = user_choice.split('.')[0].strip().upper() if user_choice else ""
            correct_label = correct_full.split('.')[0].strip().upper() if correct_full else ""

            is_correct = (user_label == correct_label)
            if is_correct:
                correct_count += 1

            results.append({
                "question_id": q_id,
                "user_choice": user_label,
                "is_correct": is_correct,
                "explanation": question.explanation,
                # 👇 Gửi về Frontend đúng ký tự này để tô màu xanh
                "correct_label": correct_label 
            })

        return {
            "score": (correct_count / len(original_questions)) * 100 if original_questions else 0,
            "correct_count": correct_count,
            "total_questions": len(original_questions),
            "results": results
        }

    # --- 2. HÀM ĐÁNH GIÁ HIỆU SUẤT (CODE CỦA BẠN - ĐÃ TỐT) ---
    def evaluate_performance(self, test_score_percent: float, time_spent_seconds: int = 300, previous_avg_score: float = 50.0):
        """
        Đánh giá kết quả học tập dựa trên trọng số điểm số, nỗ lực và sự tiến bộ.
        """
        
        # 1. Tính Effort Score (Điểm nỗ lực)
        # Giả định: Thời gian chuẩn là 300s. Điểm nỗ lực tối đa là 100.
        effort_score = min(100, (time_spent_seconds / 300) * 100)
        
        # 2. Tính Progress Score (Điểm tiến bộ)
        improvement = test_score_percent - previous_avg_score
        progress_score = min(100, max(0, 70 + improvement)) 

        # 3. Tính Final Score
        final_score = (0.5 * test_score_percent) + (0.3 * effort_score) + (0.2 * progress_score)
        
        # 4. GỌI AI ĐỂ TẠO NHẬN XÉT CÁ NHÂN HÓA
        evaluation_msg = self._get_ai_feedback(test_score_percent, effort_score, improvement)
        
        return {
            "test_score": round(test_score_percent, 2),
            "effort_score": round(effort_score, 2),
            "progress_score": round(progress_score, 2),
            "final_score": round(final_score, 2),
            "evaluation_msg": evaluation_msg
        }

    def _get_ai_feedback(self, score, effort, improvement):
        status = "tăng" if improvement >= 0 else "giảm"
        
        prompt = f"""
        Bạn là Chuyên gia Đánh giá Giáo dục (Evaluation Agent). 
        Hãy đưa ra 1 lời nhận xét ngắn gọn (tối đa 2 câu) cho học viên dựa trên thông số:
        - Điểm bài thi: {score}/100
        - Chỉ số nỗ lực (thời gian làm bài): {effort}/100
        - Sự tiến bộ: {status} {abs(improvement)} điểm so với trung bình.

        YÊU CẦU:
        - Nếu điểm cao nhưng nỗ lực thấp (làm quá nhanh): Hãy cảnh báo về việc học vẹt hoặc chủ quan.
        - Nếu điểm thấp nhưng nỗ lực cao: Hãy động viên sự kiên trì.
        - Ngôn ngữ: Tiếng Việt, chuyên nghiệp, khích lệ đúng lúc.
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.5
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"❌ Lỗi Evaluation Agent AI: {e}")
            if score >= 80: return "Kết quả rất tốt, hãy tiếp tục phát huy tinh thần học tập này."
            return "Hãy dành thêm thời gian nghiên cứu kỹ tài liệu để cải thiện điểm số."