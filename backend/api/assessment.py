# backend/api/assessment.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db, engine, Base
from db.models import LearnerProfile, QuestionBank, AssessmentHistory
from agents.assessment_agent import AssessmentAgent
from agents.profiling_agent import ProfilingAgent
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- SCHEMA ---
class QuizRequest(BaseModel):
    subject: str 

class SubmitRequest(BaseModel):
    subject: str
    correct_count: int
    total_questions: int
    question_ids: list[int] 
    duration_seconds: int = 300 

# --- API 1: SINH ĐỀ THI ---
@router.post("/generate")
def generate_quiz(req: QuizRequest, db: Session = Depends(get_db)):
    agent = AssessmentAgent(db)
    # Cố gắng lấy 20 câu hỏi
    questions = agent.get_or_create_quiz(req.subject, num_questions=20)
    
    # Fallback nếu lỗi
    if not questions:
        return {
            "subject": req.subject,
            "questions": [
                {
                    "id": -1, 
                    "content": f"Hệ thống đang bận xử lý tài liệu môn '{req.subject}'. Vui lòng thử lại sau 30 giây!",
                    "options": ["Đồng ý", "Thử lại", "Báo cáo", "Thoát"],
                    "correct_answer": "Đồng ý"
                }
            ]
        }
        
    return {"questions": questions, "subject": req.subject}

# --- API 2: NỘP BÀI & LƯU KẾT QUẢ ---
@router.post("/submit")
def submit_quiz(req: SubmitRequest, db: Session = Depends(get_db)):
    # 1. Đánh dấu câu hỏi đã dùng
    if req.question_ids:
        valid_ids = [qid for qid in req.question_ids if qid > 0]
        if valid_ids:
            db.query(QuestionBank).filter(QuestionBank.id.in_(valid_ids)).update({"is_used": True}, synchronize_session=False)
    
    # 2. Tính điểm số (%)
    if req.total_questions > 0:
        score_percent = (req.correct_count / req.total_questions) * 100
    else:
        score_percent = 0

    # 3. Profiling
    profiler = ProfilingAgent()
    new_level = profiler.classify_learner(req.correct_count, req.total_questions)
    
    # 4. LƯU LỊCH SỬ (QUAN TRỌNG)
    history = AssessmentHistory(
        subject=req.subject,
        score=score_percent,
        level_at_time=new_level,
        duration_seconds=req.duration_seconds,
        timestamp=datetime.utcnow()
    )
    db.add(history)

    # 5. Cập nhật Profile
    profile = db.query(LearnerProfile).filter_by(subject=req.subject).first()
    if not profile:
        profile = LearnerProfile(subject=req.subject, total_tests=0, avg_score=0.0)
        db.add(profile)
    
    current_total = profile.total_tests if profile.total_tests is not None else 0
    current_avg = profile.avg_score if profile.avg_score is not None else 0.0
    
    # Update số liệu
    profile.total_tests = current_total + 1
    new_avg = ((current_avg * current_total) + score_percent) / (current_total + 1)
    profile.avg_score = new_avg
    profile.current_level = new_level 
    
    db.commit()
    
    return {
        "level": new_level, 
        "score": score_percent, 
        "message": "Đã lưu kết quả thành công."
    }

# --- API 3: LẤY LỊCH SỬ (EVALUATION AGENT) ---
@router.get("/history/{subject}")
def get_evaluation_history(subject: str, db: Session = Depends(get_db)):
    history = db.query(AssessmentHistory).filter_by(subject=subject).order_by(AssessmentHistory.timestamp.desc()).all()
    profile = db.query(LearnerProfile).filter_by(subject=subject).first()
    
    if not history:
        return {
            "history": [], 
            "summary": {
                "total_attempts": 0,
                "average_score": 0,
                "effort_level": "Chưa có dữ liệu",
                "latest_level": "Chưa xác định"
            }
        }

    # Đánh giá nỗ lực dựa trên tiến bộ
    if len(history) == 1:
        effort_msg = "Mới bắt đầu"
    else:
        latest = history[0].score
        previous = history[1].score
        if latest > previous: effort_msg = "Cao (Đang tiến bộ)"
        elif latest == previous: effort_msg = "Ổn định"
        else: effort_msg = "Cần cải thiện"

    # Điểm trung bình hệ 10
    raw_avg = profile.avg_score if profile else 0
    avg_scale_10 = round(raw_avg / 10, 2) 

    return {
        "history": history,
        "summary": {
            "total_attempts": len(history),
            "average_score": avg_scale_10,
            "effort_level": effort_msg,
            "latest_level": profile.current_level if profile else "Beginner"
        }
    }

# --- API 4: RESET DỮ LIỆU (Dùng để sửa lỗi điểm) ---
@router.delete("/debug/reset-all")
def reset_database():
    """Xóa sạch dữ liệu để tính lại từ đầu"""
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Đã RESET toàn bộ hệ thống!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}