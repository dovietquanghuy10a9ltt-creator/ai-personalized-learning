# backend/api/stats.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import get_db
from db.models import AssessmentHistory, LearnerProfile

router = APIRouter()

@router.get("/learning-stats")
async def get_stats(db: Session = Depends(get_db)):
    # 1. Dữ liệu Biểu đồ (Như cũ)
    history_query = db.query(AssessmentHistory).order_by(AssessmentHistory.timestamp.asc()).all()
    chart_data = [
        {"date": h.timestamp.strftime("%d/%m"), "score": h.score, "subject": h.subject} 
        for h in history_query
    ]

    profiles = db.query(LearnerProfile).all()
    subject_stats = [
        {"subject": p.subject, "level": p.current_level, "avg": round(p.avg_score, 1)}
        for p in profiles
    ]

    # 2. 👇 THÊM: Danh sách chi tiết 20 bài làm gần nhất để hiển thị bảng
    detailed_history = db.query(AssessmentHistory).order_by(desc(AssessmentHistory.timestamp)).limit(20).all()
    history_list = [
        {
            "id": h.id,
            "subject": h.subject,
            "score": h.score,
            "total_questions": h.total_questions,
            "correct": h.correct_count,
            "date": h.timestamp.strftime("%H:%M - %d/%m/%Y"), # Format ngày giờ đẹp
            "duration": f"{h.duration_seconds // 60}p {h.duration_seconds % 60}s"
        }
        for h in detailed_history
    ]

    return {
        "charts": {
            "history": chart_data,
            "subjects": subject_stats
        },
        "details": history_list # Trả về danh sách chi tiết
    }