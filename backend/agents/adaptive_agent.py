# backend/agents/adaptive_agent.py
import json
import re
from sqlalchemy.orm import Session
from langchain.prompts import PromptTemplate
from rag.llm import llm
from rag.vector_store import get_vector_store
from db.models import LearnerProfile, AssessmentResult

class AdaptiveAgent:
    def __init__(self, db: Session):
        self.db = db
        self.vector_store = get_vector_store()

    def generate_learning_path(self, subject: str):
        """
        Tạo lộ trình cá nhân hóa dựa trên lỗ hổng kiến thức thực tế.
        """
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        last_test = self.db.query(AssessmentResult).filter_by(subject=subject).order_by(AssessmentResult.id.desc()).first()
        
        if not profile:
            return {"message": "Chưa có dữ liệu học tập. Hãy làm bài kiểm tra trước!"}

        current_level = profile.current_level
        avg_score = profile.avg_score if profile.avg_score else 0
        
        # Xử lý logic weak_points để AI không bị nhầm là học viên giỏi
        weak_points = last_test.wrong_topics if (last_test and last_test.wrong_topics and last_test.wrong_topics != "Không có") else "Kiến thức tổng quát"

        docs = self.vector_store.similarity_search(
            subject, 
            k=5, 
            filter={"subject": subject} 
        )
        context = "\n".join([d.page_content[:800] for d in docs])

        prompt = PromptTemplate(
            template="""
            Bạn là Gia sư AI chuyên nghiệp môn {subject}.
            
            DỮ LIỆU THỰC TẾ CỦA HỌC VIÊN:
            - Trình độ: {level}
            - Điểm bài test gần nhất: {score}/100
            - CÁC PHẦN ĐÃ LÀM SAI: {weak_points}

            NHIỆM VỤ: Thiết kế lộ trình 3 bước "VÁ LỖ HỔNG".
            - Bước 1: PHẢI tập trung giải thích tại sao học viên sai ở phần: {weak_points}.
            - Tuyệt đối KHÔNG khen ngợi nếu điểm thấp hoặc có lỗi sai. Hãy đi thẳng vào vấn đề.

            Trả về JSON list:
            [
                {{"step": "Bước 1", "topic": "Vá lỗi {weak_points}", "action": "Hành động cụ thể", "reason": "Lý do vì sao bạn sai phần này"}},
                ...
            ]
            """,
            input_variables=["subject", "level", "score", "weak_points", "context"]
        )

        chain = prompt | llm
        try:
            response = chain.invoke({
                "subject": subject,
                "level": current_level,
                "score": round(avg_score, 1),
                "weak_points": weak_points,
                "context": context
            })
            
            content = response.content if hasattr(response, 'content') else str(response)
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return []
        except Exception as e:
            print(f"Lỗi tạo lộ trình: {e}")
            return []

    def chat_with_tutor(self, subject: str, user_message: str, roadmap_context: str):
        """
        Gia sư AI đồng hành, biết rõ lỗi sai và trình độ thực tế.
        """
        profile = self.db.query(LearnerProfile).filter_by(subject=subject).first()
        last_test = self.db.query(AssessmentResult).filter_by(subject=subject).order_by(AssessmentResult.id.desc()).first()
        
        current_level = profile.current_level if profile else "Beginner"
        # Ép giá trị wrong_topics để AI không dùng câu chào mẫu "chưa từng làm sai"
        wrong_topics = last_test.wrong_topics if (last_test and last_test.wrong_topics and last_test.wrong_topics != "Không có") else "Cần rà soát lại kiến thức cơ bản"
        
        prompt = PromptTemplate(
            template="""
            BẠN LÀ GIA SƯ AI MÔN {subject}.
            
            TRẠNG THÁI HỌC VIÊN:
            - Trình độ: {level} (Hãy dùng từ ngữ phù hợp với trình độ này).
            - Lỗi sai thực tế trong bài kiểm tra: {wrong_topics}
            - Lộ trình đang học: {roadmap}

            QUY TẮC TƯƠNG TÁC:
            1. Tuyệt đối KHÔNG nói "bạn chưa từng làm sai" nếu dữ liệu báo lỗi là: {wrong_topics}.
            2. Nếu học viên có lỗi sai, hãy nghiêm túc chỉ ra và đề xuất ôn tập phần đó ngay.
            3. Trả lời ngắn gọn, tập trung vào kiến thức chuyên môn.

            Học viên hỏi: "{message}"
            Gia sư trả lời:
            """,
            input_variables=["subject", "level", "roadmap", "wrong_topics", "message"]
        )

        chain = prompt | llm
        try:
            response = chain.invoke({
                "subject": subject,
                "level": current_level,
                "roadmap": roadmap_context,
                "wrong_topics": wrong_topics,
                "message": user_message
            })
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            return f"Gia sư gặp lỗi kết nối: {str(e)}"