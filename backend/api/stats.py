from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from db.database import get_db
from db.models import AssessmentHistory, LearnerProfile, User, Classroom

router = APIRouter()

# 1. API THỐNG KÊ CÁ NHÂN (HỌC SINH XEM HOẶC GIÁO VIÊN XEM CHI TIẾT)
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
            "test_type": h.test_type, 
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


# 2. API THỐNG KÊ TỔNG QUAN LỚP HỌC (CHO GIÁO VIÊN)
@router.get("/class/{class_id}")
def get_class_analytics(
    class_id: int, 
    subject: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Lấy danh sách học sinh dựa trên quan hệ N-N qua bảng Classroom
    classroom = db.query(Classroom).filter(Classroom.id == class_id).first()
    
    if not classroom:
        return {"score_dist": [], "level_dist": [], "study_hours": []}

    # Trích xuất ID của những user có role "student" trong lớp này
    student_ids = [student.id for student in classroom.students if student.role == "student"]

    if not student_ids:
        return {"score_dist": [], "level_dist": [], "study_hours": []}

    base_filter = [AssessmentHistory.user_id.in_(student_ids)]

    clean_subject = subject.strip() if subject else None
    if clean_subject and clean_subject not in ["Tất cả", "undefined", "null", ""]:
        base_filter.append(AssessmentHistory.subject == clean_subject)

    # 2. Lấy lịch sử và SẮP XẾP TĂNG DẦN THEO THỜI GIAN để lấy được bài thi mới nhất
    histories = db.query(AssessmentHistory).filter(*base_filter).order_by(AssessmentHistory.timestamp.asc()).all()

    score_dist = {"Yếu (<40)": 0, "Trung bình (40-60)": 0, "Khá (60-80)": 0, "Giỏi (>80)": 0}
    level_dist = {"Beginner": 0, "Intermediate": 0, "Advanced": 0}
    study_hours_map = {}

    # 3. GOM NHÓM DỮ LIỆU THEO TỪNG HỌC SINH (Đảm bảo mỗi người chỉ đếm 1 lần)
    student_data = {}

    for h in histories:
        uid = h.user_id
        if uid not in student_data:
            student_data[uid] = {"scores": [], "latest_level": "Beginner"}
        
        student_data[uid]["scores"].append(h.score or 0)
        # Vì histories đã sắp xếp theo thời gian, biến này sẽ liên tục bị ghi đè cho đến bài thi cuối cùng
        student_data[uid]["latest_level"] = h.level_at_time or "Beginner" 

        # Tính tổng giờ học theo ngày (Riêng thời lượng thì được phép cộng dồn không giới hạn)
        date_str = h.timestamp.strftime("%d/%m")
        duration_minutes = (h.duration_seconds or 0) / 60.0
        study_hours_map[date_str] = study_hours_map.get(date_str, 0) + duration_minutes

    # 4. TÍNH PHỔ ĐIỂM VÀ NĂNG LỰC DỰA TRÊN "SỐ LƯỢNG HỌC SINH ĐỘC LẬP"
    for uid, data in student_data.items():
        # Lấy điểm trung bình của cá nhân học sinh đó
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0
        
        # Phân loại phổ điểm
        if avg_score < 40: score_dist["Yếu (<40)"] += 1
        elif avg_score < 60: score_dist["Trung bình (40-60)"] += 1
        elif avg_score < 80: score_dist["Khá (60-80)"] += 1
        else: score_dist["Giỏi (>80)"] += 1

        # Phân loại năng lực (Dựa vào kết quả mới nhất của em đó)
        lvl = data["latest_level"]
        level_dist[lvl] = level_dist.get(lvl, 0) + 1

    return {
        "score_dist": [{"name": k, "value": v} for k, v in score_dist.items()],
        "level_dist": [{"name": k, "value": v} for k, v in level_dist.items()],
        "study_hours": [{"date": k, "minutes": round(v, 1)} for k, v in study_hours_map.items()]
    }