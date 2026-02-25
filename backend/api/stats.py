# backend/api/stats.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from db.database import get_db
from db.models import AssessmentHistory, LearnerProfile

router = APIRouter()

@router.get("/learning-stats")
async def get_stats(
    user_id: Optional[int] = Query(None), 
    subject: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if user_id is None or user_id == 0:
        first_p = db.query(LearnerProfile).first()
        user_id = first_p.user_id if first_p else 1

    query = db.query(AssessmentHistory).filter(AssessmentHistory.user_id == user_id)
    if subject and subject != "Tất cả" and subject != "undefined":
        query = query.filter(AssessmentHistory.subject == subject)
    
    histories = query.order_by(AssessmentHistory.timestamp.asc()).all()

    # Tính toán Overview
    total_tests = len(histories)
    best_score_raw = db.query(func.max(AssessmentHistory.score)).filter(AssessmentHistory.user_id == user_id).scalar()
    avg_score_raw = db.query(func.avg(AssessmentHistory.score)).filter(AssessmentHistory.user_id == user_id).scalar()

    # Lấy danh sách chi tiết và tính toán Trend (Tiến bộ)
    detailed_histories = query.order_by(desc(AssessmentHistory.timestamp)).limit(10).all()
    history_list = []
    
    for i, h in enumerate(detailed_histories):
        trend = 0
        # Tính khoảng chênh lệch điểm so với bài kiểm tra trước đó (older_h nằm ở i+1 do đang xếp giảm dần)
        if i + 1 < len(detailed_histories):
            older_h = detailed_histories[i+1]
            trend = h.score - older_h.score

        history_list.append({
            "id": h.id,
            "subject": h.subject,
            "score": round(float(h.score), 1),
            "date": h.timestamp.isoformat(), # Trả về chuẩn ISO để Frontend hiểu múi giờ
            "duration": h.duration_seconds if h.duration_seconds else 0, # Lấy số giây làm bài
            "level": h.level_at_time if h.level_at_time else "Beginner", # Lấy cấp độ
            "trend": round(float(trend), 1), # Tính tiến bộ
            "correct": h.correct_count
        })

    # TRẢ VỀ JSON PHẲNG
    return {
        "total_tests": total_tests,
        "totalTests": total_tests,
        "average_score": round(float(avg_score_raw or 0), 1),
        "avgScore": round(float(avg_score_raw or 0), 1),
        "best_score": round(float(best_score_raw or 0), 1),
        "bestScore": round(float(best_score_raw or 0), 1),
        "chart_data": [
            {"date": h.timestamp.strftime("%d/%m"), "score": round(float(h.score), 1)} 
            for h in histories
        ],
        "history_list": history_list
    }