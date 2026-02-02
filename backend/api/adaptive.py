# backend/api/adaptive.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from agents.adaptive_agent import AdaptiveAgent

# --- KHỞI TẠO ROUTER
router = APIRouter()

# --- MODEL DỮ LIỆU ---
class TutorChatRequest(BaseModel):
    subject: str
    message: str
    roadmap_context: str  # Frontend gửi chuỗi JSON lộ trình xuống

# --- API 1: LẤY LỘ TRÌNH HỌC TẬP ---
@router.get("/recommend/{subject}")
def get_learning_recommendation(subject: str, db: Session = Depends(get_db)):
    """
    API lấy đề xuất lộ trình học tập cá nhân hóa
    """
    agent = AdaptiveAgent(db)
    recommendations = agent.generate_learning_path(subject)
    
    if not recommendations:
         raise HTTPException(status_code=404, detail="Không thể tạo lộ trình lúc này.")
         
    return {"subject": subject, "path": recommendations}

# --- API 2: CHAT VỚI GIA SƯ (TÍCH HỢP) ---
@router.post("/chat")
def chat_with_adaptive_tutor(req: TutorChatRequest, db: Session = Depends(get_db)):
    """
    API chat riêng với Gia sư Adaptive, có ngữ cảnh là lộ trình học
    """
    agent = AdaptiveAgent(db)
    # Gọi hàm chat trong Agent
    response = agent.chat_with_tutor(req.subject, req.message, req.roadmap_context)
    return {"reply": response}