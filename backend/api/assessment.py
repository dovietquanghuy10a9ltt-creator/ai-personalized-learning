from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db, engine, Base
from db.models import LearnerProfile, QuestionBank, AssessmentHistory
from pydantic import BaseModel
from datetime import datetime
from typing import List
import json

# Import các Agent chuyên biệt
from agents.assessment_agent import AssessmentAgent
from agents.evaluation_agent import EvaluationAgent
from agents.profiling_agent import ProfilingAgent

router = APIRouter()

# --- SCHEMA ---
class QuizRequest(BaseModel):
    subject: str 

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: str 

class SubmitRequest(BaseModel):
    subject: str
    answers: List[AnswerSubmission]
    duration_seconds: int = 300 

# --- API 1: SINH ĐỀ THI ---
@router.post("/generate")
def generate_quiz(req: QuizRequest, db: Session = Depends(get_db)):
    if not req.subject or req.subject.strip() == "":
        raise HTTPException(status_code=400, detail="Vui lòng chọn môn học!")

    agent = AssessmentAgent(db)
    questions = agent.get_or_create_quiz(req.subject, num_questions=20)
    
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chưa có tài liệu môn '{req.subject}'. Vui lòng upload tài liệu trước!"
        )
        
    return {"questions": questions, "subject": req.subject}

# --- API 2: NỘP BÀI & CHẤM ĐIỂM ---
@router.post("/submit")
def submit_quiz(req: SubmitRequest, db: Session = Depends(get_db)):
    user_map = {a.question_id: a.selected_option for a in req.answers}
    question_ids = list(user_map.keys())
    
    if not question_ids:
        raise HTTPException(status_code=400, detail="Không có câu trả lời nào.")

    questions_db = db.query(QuestionBank).filter(QuestionBank.id.in_(question_ids)).all()
    
    profile = db.query(LearnerProfile).filter_by(subject=req.subject).first()
    prev_avg = profile.avg_score if profile else 50.0

    eval_agent = EvaluationAgent()
    
    correct_count = 0
    wrong_questions_log = []
    detailed_results = []

    for q in questions_db:
        user_choice = user_map.get(q.id, "")
        
        # Chuẩn hóa nhãn để so sánh (A, B, C, D)
        db_correct_label = q.correct_answer[0].upper() if q.correct_answer else ""
        user_label = user_choice[0].upper() if user_choice else ""
        
        is_correct = (user_label == db_correct_label)
        
        if is_correct:
            correct_count += 1
        else:
            wrong_questions_log.append({
                "question": q.content,
                "student_choice": user_choice,
                "correct_answer": q.correct_answer
            })
        
        # Gửi correct_label về frontend để hiển thị màu xanh
        detailed_results.append({
            "question_id": q.id,
            "is_correct": is_correct,
            "explanation": q.explanation,
            "correct_label": db_correct_label 
        })

    score_percent = (correct_count / len(questions_db) * 100) if questions_db else 0

    evaluation_data = eval_agent.evaluate_performance(
        test_score_percent=score_percent,
        time_spent_seconds=req.duration_seconds,
        previous_avg_score=prev_avg
    )

    prof_agent = ProfilingAgent(db)
    new_level = prof_agent.classify_learner(correct_count, len(questions_db), req.subject)

    # Lưu lịch sử
    history = AssessmentHistory(
        subject=req.subject,
        score=score_percent,
        level_at_time=new_level,
        duration_seconds=req.duration_seconds,
        correct_count=correct_count,
        total_questions=len(questions_db),
        wrong_detail=json.dumps(wrong_questions_log, ensure_ascii=False),
        timestamp=datetime.utcnow()
    )
    db.add(history)

    if not profile:
        profile = LearnerProfile(subject=req.subject, total_tests=0, avg_score=0.0)
        db.add(profile)
    
    profile.total_tests += 1
    profile.avg_score = ((prev_avg * (profile.total_tests - 1)) + score_percent) / profile.total_tests
    profile.current_level = new_level 
    
    db.commit()
    
    return {
        "level": new_level, 
        "score": score_percent, 
        "correct_count": correct_count,
        "total_questions": len(questions_db),
        "evaluation": evaluation_data, 
        "results": detailed_results,
        "message": "Đã chấm điểm thành công!"
    }

# --- API 3: LẤY LỊCH SỬ (ĐÃ SỬA LOGIC TÍNH TREND & DURATION) ---
@router.get("/history/{subject}")
def get_evaluation_history(subject: str, db: Session = Depends(get_db)):
    # 1. Lấy toàn bộ lịch sử CŨ -> MỚI để tính đà tiến bộ
    history_records = db.query(AssessmentHistory)\
        .filter_by(subject=subject)\
        .order_by(AssessmentHistory.timestamp.asc())\
        .all()
    
    if not history_records:
        return {"history": [], "summary": {"total_attempts": 0}}

    processed_history = []
    previous_score = 0 # Điểm bài trước để so sánh

    for h in history_records:
        # Tính Trend: Điểm hiện tại - Điểm bài trước
        trend = h.score - previous_score
        previous_score = h.score # Cập nhật lại điểm tham chiếu cho vòng sau

        # Tính lại Effort giả định (nếu cần hiển thị thanh nỗ lực)
        duration = h.duration_seconds if h.duration_seconds else 0
        effort_percent = min(100, int((duration / 300) * 100))

        processed_history.append({
            "id": h.id,
            "date": h.timestamp.isoformat(),
            "score": h.score,
            "level": h.level_at_time,
            "duration": duration,       # Gửi giây thực tế về Frontend
            "trend": trend,             # Gửi chỉ số tăng/giảm điểm
            "effort": effort_percent
        })

    # Đảo ngược danh sách để bài MỚI NHẤT lên đầu bảng
    processed_history.reverse()

    return {"history": processed_history}

@router.delete("/debug/reset-all")
def reset_database():
    try:
        engine.dispose()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Đã reset toàn bộ hệ thống!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")