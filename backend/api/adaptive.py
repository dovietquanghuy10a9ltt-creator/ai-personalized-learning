# backend/api/adaptive.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict
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
    history: List[Dict[str, str]] = []

# NHẬN DỮ LIỆU THỜI GIAN HỌC TỪ FRONTEND
class StudySessionLog(BaseModel):
    user_id: int
    subject: str
    duration_minutes: int

# ==========================================
# 1. API: LƯU THỜI GIAN HỌC TẬP (HỖ TRỢ TÍNH EFFORT SCORE)
# ==========================================
@router.post("/log-session")
def log_study_session(data: StudySessionLog, db: Session = Depends(get_db)):
    """API ngầm nhận số phút học tập từ Frontend khi học sinh tắt tab"""
    try:
        if data.duration_minutes > 0:
            new_session = models.StudySession(
                user_id=data.user_id,
                subject=data.subject,
                duration_minutes=data.duration_minutes
            )
            db.add(new_session)
            db.commit()
            return {"message": "Đã lưu thời gian học thành công"}
        return {"message": "Thời gian học quá ngắn, không ghi nhận"}
    except Exception as e:
        db.rollback()
        print(f"❌ LỖI LƯU SESSION: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể lưu phiên học.")

# ==========================================
# 2. API: TẠO CHƯƠNG TRÌNH HỌC
# ==========================================
@router.get("/recommend/{subject}")
def get_learning_recommendation(
    subject: str, 
    user_id: int = Query(...), 
    db: Session = Depends(get_db)
):
    try:
        agent = AdaptiveAgent(db)
        
        # 1. Tìm thông tin lớp học của user ĐÚNG VỚI MÔN ĐANG HỌC
        user = db.query(models.User).filter(models.User.id == user_id).first()
        allowed_filenames = []
        
        if user and hasattr(user, 'enrolled_classes'):
            # Lọc ra lớp học thuộc môn này mà sinh viên đã tham gia
            target_class = next((c for c in user.enrolled_classes if c.subject == subject), None)
            
            if target_class:
                docs = db.query(models.Document).filter(models.Document.class_id == target_class.id).all()
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

# ==========================================
# 3. API: CHAT VỚI GIA SƯ AI
# ==========================================
@router.post("/chat")
def chat_with_adaptive_tutor(req: TutorChatRequest, db: Session = Depends(get_db)):
    try:
        # 1. Xác thực học sinh
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
        # Tìm lớp học tương ứng với môn học
        target_class = next((c for c in getattr(user, 'enrolled_classes', []) if c.subject == req.subject), None)
        
        if not target_class:
            return {"reply": f"Bạn chưa tham gia lớp học nào cho môn {req.subject}. Vui lòng nhập mã lớp để bắt đầu học."}

        # 2. Lấy tài liệu của lớp đó
        allowed_docs = db.query(models.Document).filter(models.Document.class_id == target_class.id).all()
        allowed_filenames = [doc.filename for doc in allowed_docs]

        if not allowed_filenames:
            return {"reply": "Giáo viên hiện chưa tải tài liệu lên hệ thống."}

        # 3. Gọi Agent xử lý
        agent = AdaptiveAgent(db)
        response = agent.chat_with_tutor(
            subject=req.subject, 
            user_message=req.message, 
            roadmap_context=req.roadmap_context, 
            allowed_filenames=allowed_filenames,
            history=req.history
        )
        
        return {"reply": response}
        
    except Exception as e:
        print(f"❌ LỖI API CHAT: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"reply": "Gia sư AI đang bận xử lý dữ liệu, vui lòng thử lại sau."}