# backend/api/adaptive.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from agents.adaptive_agent import AdaptiveAgent # Import Agent đã nâng cấp

router = APIRouter()

# --- MODEL DỮ LIỆU ---
class TutorChatRequest(BaseModel):
    subject: str
    message: str
    roadmap_context: str 

# --- API 1: PHÂN TÍCH LỖI SAI & ĐỀ XUẤT LỘ TRÌNH ---
@router.get("/recommend/{subject}")
def get_learning_recommendation(subject: str, db: Session = Depends(get_db)):
    """
    API điều phối: Gọi Adaptive Agent để phân tích lỗi từ Database và tạo lộ trình.
    """
    try:
        # Khởi tạo Agent (Sử dụng GROQ_KEY_ADAPTIVE riêng biệt)
        agent = AdaptiveAgent(db)
        
        # Gọi logic xử lý từ Agent
        result = agent.generate_learning_path(subject)
        
        if not result:
            return {
                "analysis": "Hệ thống ghi nhận bạn có lỗ hổng kiến thức cần ôn tập lại.",
                "roadmap": ["Xem lại lý thuyết chương này", "Làm lại bài kiểm tra để AI đánh giá lại"]
            }
            
        return result

    except Exception as e:
        print(f"❌ LỖI API RECOMMEND: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể tạo lộ trình học tập lúc này.")

# --- API 2: CHAT VỚI GIA SƯ ---
@router.post("/chat")
def chat_with_adaptive_tutor(req: TutorChatRequest, db: Session = Depends(get_db)):
    """
    API điều phối: Gọi Adaptive Agent để chat với ngữ cảnh cá nhân hóa.
    """
    try:
        # Khởi tạo Agent
        agent = AdaptiveAgent(db)
        
        # Sử dụng hàm chat chuyên sâu của Agent
        response = agent.chat_with_tutor(
            subject=req.subject, 
            user_message=req.message, 
            roadmap_context=req.roadmap_context
        )
        
        return {"reply": response}
        
    except Exception as e:
        print(f"❌ LỖI API CHAT: {str(e)}")
        return {"reply": "Gia sư AI đang gặp sự cố kết nối, vui lòng thử lại sau."}