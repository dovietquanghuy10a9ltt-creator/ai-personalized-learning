# backend/api/stats.py
from fastapi import APIRouter, Depends, Query, HTTPException
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
    # 1. BẢO VỆ TẦNG 1: Bắt buộc có user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="Thiếu user_id. Vui lòng đăng nhập lại.")

    # 2. BẢO VỆ TẦNG 2: Xử lý chuỗi môn học (Tránh lỗi do thừa dấu cách từ Frontend)
    clean_subject = subject.strip() if subject else None
    is_global_stats = not clean_subject or clean_subject in ["Tất cả", "undefined", "null", ""]

    # 3. TẠO BỘ LỌC CỐT LÕI VÀ NGHIÊM NGẶT NHẤT
    base_filter = [AssessmentHistory.user_id == user_id]
    
    # Nếu không phải xem "Tất cả", ÉP BUỘC phải khớp chính xác tên môn học
    if not is_global_stats:
        base_filter.append(AssessmentHistory.subject == clean_subject)

    # 4. Thực thi truy vấn với bộ lọc đã khóa chặt
    query = db.query(AssessmentHistory).filter(*base_filter)
    histories_for_chart = query.order_by(AssessmentHistory.timestamp.asc()).all()

    # 5. TÍNH TOÁN THỐNG KÊ (Chỉ tính trên đúng Môn và đúng User đó)
    total_tests = query.count()
    
    best_score_raw = db.query(func.max(AssessmentHistory.score))\
        .filter(*base_filter).scalar()
        
    avg_score_raw = db.query(func.avg(AssessmentHistory.score))\
        .filter(*base_filter).scalar()

    # 6. Lấy 10 bài gần nhất của ĐÚNG MÔN ĐÓ
    detailed_histories = query.order_by(desc(AssessmentHistory.timestamp)).limit(10).all()
    history_list = []
    
    for i, h in enumerate(detailed_histories):
        trend = 0
        if i + 1 < len(detailed_histories):
            older_h = detailed_histories[i+1]
            trend = h.score - older_h.score

        history_list.append({
            "id": h.id,
            "subject": h.subject,
            "score": round(float(h.score or 0), 1),
            "date": h.timestamp.isoformat(),
            "duration": h.duration_seconds if h.duration_seconds else 0,
            "level": h.level_at_time if h.level_at_time else "Beginner",
            "trend": round(float(trend), 1),
            "correct": h.correct_count
        })

    # 7. TRẢ VỀ KẾT QUẢ SẠCH
    return {
        "total_tests": total_tests,
        "totalTests": total_tests,
        "average_score": round(float(avg_score_raw or 0), 1),
        "avgScore": round(float(avg_score_raw or 0), 1),
        "best_score": round(float(best_score_raw or 0), 1),
        "bestScore": round(float(best_score_raw or 0), 1),
        "chart_data": [
            {"date": h.timestamp.strftime("%d/%m"), "score": round(float(h.score or 0), 1)} 
            for h in histories_for_chart
        ],
        "history_list": history_list
    }