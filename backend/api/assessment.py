from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db, engine, Base
from db.models import LearnerProfile, QuestionBank, AssessmentHistory
from agents.assessment_agent import AssessmentAgent
from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict
import re 
import json # Import JSON để lưu log câu sai

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

# --- HELPER: Hàm xác định trình độ ---
def calculate_level(correct: int, total: int) -> str:
    if total == 0: return "Beginner"
    score_percent = (correct / total) * 100
    if score_percent >= 80: return "Advanced"
    elif score_percent >= 50: return "Intermediate"
    else: return "Beginner"

# --- HELPER: Tự động tìm nhãn đáp án đúng (A, B, C, D) ---
def find_correct_label(options: list, correct_ans: str) -> str:
    LABELS = ['A', 'B', 'C', 'D']
    
    def clean_text(text):
        text = re.sub(r'^[A-D0-9][\.\)]\s*', '', str(text), flags=re.IGNORECASE)
        return text.strip().lower()

    clean_correct = clean_text(correct_ans)
    
    # 1. Nếu correct_ans ngắn gọn là "A", "B"...
    if correct_ans.strip().upper() in LABELS and len(correct_ans.strip()) <= 3:
        return correct_ans.strip().upper()

    # 2. So sánh nội dung
    for idx, opt in enumerate(options):
        if idx >= 4: break 
        clean_opt = clean_text(opt)
        if clean_opt == clean_correct or (clean_correct and clean_correct in clean_opt):
            return LABELS[idx]
            
    # 3. Fallback
    first_char = correct_ans.strip().upper()[0]
    if first_char in LABELS:
        return first_char
        
    return "" 

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
            detail=f"Chưa có dữ liệu môn '{req.subject}'. Vui lòng upload tài liệu để học!"
        )
        
    return {"questions": questions, "subject": req.subject}

# --- API 2: NỘP BÀI & CHẤM ĐIỂM (CẬP NHẬT LƯU CÂU SAI) ---
@router.post("/submit")
def submit_quiz(req: SubmitRequest, db: Session = Depends(get_db)):
    # 1. Map đáp án của user
    user_map = {a.question_id: a.selected_option for a in req.answers}
    question_ids = list(user_map.keys())
    
    if not question_ids:
        raise HTTPException(status_code=400, detail="Không có câu trả lời nào được gửi lên.")

    questions_db = db.query(QuestionBank).filter(QuestionBank.id.in_(question_ids)).all()
    
    correct_count = 0
    total_questions = len(questions_db)
    detailed_results = []
    
    # Danh sách lưu các câu sai để Gia sư AI phân tích
    wrong_questions_log = [] 

    # 2. Chấm điểm từng câu
    for q in questions_db:
        user_choice = user_map.get(q.id, "") 
        real_correct_label = find_correct_label(q.options, q.correct_answer)
        is_correct = (user_choice == real_correct_label)
        
        if is_correct:
            correct_count += 1
        else:
            # Nếu sai, ghi lại nội dung để AI học
            wrong_questions_log.append({
                "question": q.content,
                "student_choice": user_choice,
                "correct_answer": q.correct_answer, # Lưu đáp án gốc để AI hiểu ngữ cảnh
                "correct_label": real_correct_label
            })
            
        q.is_used = True # Đánh dấu đã dùng
        
        detailed_results.append({
            "question_id": q.id,
            "user_choice": user_choice,
            "correct_label": real_correct_label,
            "explanation": q.explanation,
            "is_correct": is_correct
        })

    # 3. Tính toán điểm số
    score_percent = (correct_count / total_questions * 100) if total_questions > 0 else 0
    new_level = calculate_level(correct_count, total_questions)
    
    # 4. Lưu Lịch sử kèm wrong_detail
    history = AssessmentHistory(
        subject=req.subject,
        score=score_percent,
        level_at_time=new_level,
        duration_seconds=req.duration_seconds,
        correct_count=correct_count,
        total_questions=total_questions,
        
        # Lưu log câu sai dưới dạng JSON string
        wrong_detail=json.dumps(wrong_questions_log, ensure_ascii=False),
        
        timestamp=datetime.utcnow()
    )
    db.add(history)

    # 5. Cập nhật Profile
    profile = db.query(LearnerProfile).filter_by(subject=req.subject).first()
    if not profile:
        profile = LearnerProfile(subject=req.subject, total_tests=0, avg_score=0.0)
        db.add(profile)
    
    current_total = profile.total_tests or 0
    current_avg = profile.avg_score or 0.0
    
    profile.total_tests = current_total + 1
    profile.avg_score = ((current_avg * current_total) + score_percent) / (current_total + 1)
    profile.current_level = new_level 
    
    db.commit()
    
    return {
        "level": new_level, 
        "score": score_percent, 
        "correct_count": correct_count,
        "total_questions": total_questions,
        "results": detailed_results,
        "message": "Đã chấm điểm thành công!"
    }

# --- API 3: LẤY LỊCH SỬ ---
@router.get("/history/{subject}")
def get_evaluation_history(subject: str, db: Session = Depends(get_db)):
    history_records = db.query(AssessmentHistory)\
        .filter_by(subject=subject)\
        .order_by(AssessmentHistory.timestamp.asc())\
        .all()
        
    profile = db.query(LearnerProfile).filter_by(subject=subject).first()
    
    if not history_records:
        return {
            "history": [], 
            "summary": {
                "total_attempts": 0, "average_score": 0, 
                "effort_level": "Chưa bắt đầu", "latest_level": "Beginner"
            }
        }

    total = len(history_records)
    effort_msg = "Mới bắt đầu 🌱"
    if total >= 5: effort_msg = "Rất chăm chỉ 🔥"
    elif total >= 2: 
        if history_records[-1].score > history_records[-2].score: effort_msg = "Đang tiến bộ 🚀"
        elif history_records[-1].score < history_records[-2].score: effort_msg = "Cần cố gắng hơn 💪"
        else: effort_msg = "Phong độ ổn định ⚓"

    history_list = [
        {
            "id": h.id, "date": h.timestamp.isoformat(),
            "score": h.score, "duration": h.duration_seconds,
            "level": h.level_at_time, "correct": h.correct_count, "total": h.total_questions
        } for h in history_records
    ]

    avg_score = round(profile.avg_score, 1) if profile else 0.0

    return {
        "history": history_list,
        "summary": {
            "total_attempts": total, "average_score": avg_score,
            "effort_level": effort_msg, "latest_level": profile.current_level if profile else "Beginner"
        }
    }

# --- API 4: RESET DỮ LIỆU ---
@router.delete("/debug/reset-all")
def reset_database():
    try:
        engine.dispose()
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        return {"status": "success", "message": "Đã reset toàn bộ hệ thống!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")