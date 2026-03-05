import os
import json
from groq import Groq
from dotenv import load_dotenv

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

    # --- 1. HÀM CHẤM ĐIỂM CHI TIẾT ---
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

            # Lấy đáp án đúng từ DB 
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
                "correct_label": correct_label 
            })

        return {
            "score": (correct_count / len(original_questions)) * 100 if original_questions else 0,
            "correct_count": correct_count,
            "total_questions": len(original_questions),
            "results": results
        }

    # --- 2. HÀM ĐÁNH GIÁ HIỆU SUẤT ---
    def evaluate_performance(self, test_score_percent: float, time_spent_seconds: int = 300, previous_avg_score: float = 50.0):
        """
        Đánh giá kết quả học tập dựa trên trọng số điểm số, nỗ lực và sự tiến bộ.
        """
        
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
        # 1. Python tự tính toán "Chỉ thị" (Directive)
        # Logic này giúp định hướng AI viết đúng trọng tâm ngay lập tức
        directive = ""
        if score >= 80 and effort < 30:
            directive = "Cảnh báo nhẹ nhàng: Điểm cao nhưng thời gian làm quá nhanh, nhắc nhở tránh chủ quan hoặc học vẹt."
        elif score < 50 and effort > 70:
            directive = "Động viên mạnh mẽ: Điểm thấp nhưng nỗ lực rất cao, khuyên không nên nản chí."
        elif score >= 80:
            directive = "Khen ngợi: Kết quả xuất sắc và nỗ lực xứng đáng."
        elif score < 50:
            directive = "Nhắc nhở nghiêm túc: Cần tập trung ôn lại kiến thức căn bản ngay."
        else:
            directive = "Ghi nhận: Kết quả ở mức trung bình khá, cần cố gắng thêm một chút để bứt phá."

        status_text = "tăng" if improvement >= 0 else "giảm"

        # 2. Prompt "Thiết quân luật" - Ép AI vào khuôn khổ
        prompt = f"""
        Bạn là Giảng viên AI. Hãy viết nhận xét cho học viên dựa trên dữ liệu thật này:
        - Điểm số: {score}/100
        - Nỗ lực (dựa trên thời gian): {effort}%
        - Tiến bộ: {status_text} {abs(improvement)} điểm.

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
            if score < 50: return "Kết quả chưa tốt lắm, bạn hãy ôn tập kỹ hơn tài liệu nhé."
            return "Bạn đã hoàn thành bài thi. Hãy cố gắng hơn ở lần sau!"