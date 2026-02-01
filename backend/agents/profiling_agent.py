# backend/agents/profiling_agent.py

class ProfilingAgent:
    def classify_learner(self, correct_count: int, total_questions: int):
        """
        CHỨC NĂNG: Phân loại năng lực học viên (Learner Profiling)
        
        Luật phân loại (Dựa trên tài liệu Mục 2.2):
        - < 40%: Beginner (Sơ cấp)
        - 40% - 70%: Intermediate (Trung cấp)
        - > 70%: Advanced (Cao cấp)
        """
        if total_questions == 0:
            return "Unknown"

        score_percent = (correct_count / total_questions) * 100
        
        # Logic Rule-based thuần túy
        if score_percent < 40:
            return "Beginner"
        elif 40 <= score_percent <= 70:
            return "Intermediate"
        else:
            return "Advanced"