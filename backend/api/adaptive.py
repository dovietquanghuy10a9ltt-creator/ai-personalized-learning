# backend/api/adaptive.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict # THÊM TYPING CHO HISTORY
from db.database import get_db
from db import models 
from agents.adaptive_agent import AdaptiveAgent

router = APIRouter()

# --- MODEL DỮ LIỆU ---
class TutorChatRequest(BaseModel):
    subject: str
    message: str
    roadmap_context: str 
    user_id: int 
    history: List[Dict[str, str]] = [] # THÊM TRƯỜNG NHẬN LỊCH SỬ TỪ FRONTEND

# --- TẠO CHƯƠNG TRÌNH HỌC (10 BUỔI THEO TÀI LIỆU LỚP) ---
@router.get("/recommend/{subject}")
def get_learning_recommendation(
    subject: str, 
    user_id: int = Query(...), 
    db: Session = Depends(get_db)
):
    try:
        agent = AdaptiveAgent(db)
        
        # 1. Tìm thông tin lớp học của user để lấy đúng file tài liệu
        user = db.query(models.User).filter(models.User.id == user_id).first()
        allowed_filenames = []
        if user and user.class_id:
            docs = db.query(models.Document).filter(models.Document.class_id == user.class_id).all()
            allowed_filenames = [doc.filename for doc in docs]

        # 2. Sinh chương trình học
        result = agent.generate_overall_roadmap(
            user_id=user_id, 
            subject=subject, 
            allowed_filenames=allowed_filenames
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Không thể tạo chương trình học.")
            
        return {"roadmap": result}
    except Exception as e:
        print(f"❌ LỖI API RECOMMEND: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể tạo chương trình học lúc này.")

# --- CHAT VỚI GIA SƯ (ĐÃ CẬP NHẬT LỌC THEO LỚP & DẠY THEO PHƯƠNG PHÁP SOCRATES & LƯU LỊCH SỬ) ---
@router.post("/chat")
def chat_with_adaptive_tutor(req: TutorChatRequest, db: Session = Depends(get_db)):
    try:
        # 1. Xác thực học sinh và lớp học
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
        if not user.class_id:
            return {"reply": "Bạn chưa tham gia lớp học nào. Vui lòng nhập mã lớp để bắt đầu học."}

        # 2. Lấy tài liệu của lớp
        allowed_docs = db.query(models.Document).filter(models.Document.class_id == user.class_id).all()
        allowed_filenames = [doc.filename for doc in allowed_docs]

        if not allowed_filenames:
            return {"reply": "Giáo viên hiện chưa tải tài liệu lên hệ thống."}

        # 3. Gọi Agent và truyền TOÀN BỘ dữ liệu thô (kể cả history) sang cho Agent xử lý
        agent = AdaptiveAgent(db)
        response = agent.chat_with_tutor(
            subject=req.subject, 
            user_message=req.message, 
            roadmap_context=req.roadmap_context, 
            allowed_filenames=allowed_filenames,
            history=req.history # <-- Truyền mảng history gốc vào đây
        )
        
        return {"reply": response}
        
    except Exception as e:
        print(f"❌ LỖI API CHAT: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"reply": "Gia sư AI đang bận xử lý dữ liệu lớp học, vui lòng thử lại sau."}