from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db, engine, Base
from db.models import LearnerProfile, QuestionBank, AssessmentHistory, User, Document, LearningRoadmap
from pydantic import BaseModel
from datetime import datetime
from typing import List
import json
import re

from agents.assessment_agent import AssessmentAgent
from agents.evaluation_agent import EvaluationAgent
from agents.profiling_agent import ProfilingAgent
from agents.adaptive_agent import AdaptiveAgent 

router = APIRouter()

# --- SCHEMA ---
class QuizRequest(BaseModel):
    subject: str 
    user_id: int 

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: str 

class SubmitRequest(BaseModel):
    subject: str
    user_id: int 
    answers: List[AnswerSubmission]
    duration_seconds: int = 300 

# --- 1. SINH ĐỀ THI ---
@router.post("/generate")
def generate_quiz(req: QuizRequest, db: Session = Depends(get_db)):
    print(f"👉 DEBUG: Đang yêu cầu tạo đề môn: '{req.subject}' cho User: {req.user_id}")
    
    if not req.subject or req.subject.strip() == "":
        raise HTTPException(status_code=400, detail="Vui lòng chọn môn học!")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user or not user.class_id:
        raise HTTPException(status_code=400, detail="Bạn cần tham gia lớp học để thực hiện bài kiểm tra.")

    allowed_docs = db.query(Document).filter(
        Document.class_id == user.class_id,
        Document.subject == req.subject
    ).all()
    
    allowed_filenames = [doc.filename for doc in allowed_docs]
    print(f"👉 DEBUG: Danh sách file được phép: {allowed_filenames}")

    if not allowed_filenames:
        print("❌ LỖI: Không tìm thấy file trong bảng Document!")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Lớp học của bạn hiện chưa có tài liệu cho môn '{req.subject}'."
        )

    agent = AssessmentAgent(db)
    questions = agent.get_or_create_quiz(req.subject, num_questions=20, allowed_files=allowed_filenames)
    
    if not questions:
        print("❌ LỖI: Hàm get_or_create_quiz trả về rỗng")
        raise HTTPException(status_code=404, detail="AI chưa chuẩn bị xong câu hỏi. Hãy thử lại!")
        
    return {"questions": questions, "subject": req.subject}

# --- 2. NỘP BÀI, CHẤM ĐIỂM & ĐIỀU HƯỚNG LỘ TRÌNH ---
@router.post("/submit")
def submit_quiz(req: SubmitRequest, db: Session = Depends(get_db)):
    if not req.answers:
        raise HTTPException(status_code=400, detail="Không có câu trả lời nào.")

    user_map = {a.question_id: a.selected_option for a in req.answers}
    question_ids = list(user_map.keys())

    # 1. Gọi AssessmentAgent để chấm và lưu điểm vào LearnerProfile
    answers_list = [{"question_id": a.question_id, "selected_option": a.selected_option} for a in req.answers]
    agent = AssessmentAgent(db)
    result = agent.submit_assessment(req.user_id, req.subject, answers_list)
    
    if not result:
        raise HTTPException(status_code=500, detail="Lỗi hệ thống: Không thể chấm điểm.")

    score_percent = result["score"]
    new_level = result["level"]

    # 2. Xử lý log câu sai và chi tiết bài làm để trả về Frontend
    questions_db = db.query(QuestionBank).filter(QuestionBank.id.in_(question_ids)).all()
    correct_count = 0
    wrong_questions_log = []
    detailed_results = [] 

    for q in questions_db:
        user_choice = user_map.get(q.id, "")
        db_correct_label = q.correct_answer.strip().upper() if q.correct_answer else ""

        if len(db_correct_label) > 1:
             match_db = re.search(r'^(?:ĐÁP ÁN\s*|CHỌN\s*)?([A-D])\s*[\.\:\-\)]', db_correct_label, re.IGNORECASE)
             db_correct_label = match_db.group(1).upper() if match_db else db_correct_label[0].upper()

        user_label = user_choice.strip().upper() if user_choice else ""
        is_correct = (user_label == db_correct_label)
        
        if is_correct:
            correct_count += 1
        else:
            wrong_questions_log.append({
                "question": q.content,
                "student_choice": user_choice,
                "correct_answer": q.correct_answer
            })
            
        detailed_results.append({
            "question_id": q.id,
            "is_correct": is_correct,
            "explanation": q.explanation,
            "correct_label": db_correct_label
        })

    # 3. Điều hướng Lộ trình (Roadmap)
    roadmap = db.query(LearningRoadmap).filter_by(user_id=req.user_id, subject=req.subject).first()
    is_passed = True
    msg = ""
    
    user = db.query(User).filter(User.id == req.user_id).first()
    allowed_docs = db.query(Document).filter(Document.class_id == user.class_id, Document.subject == req.subject).all()
    allowed_filenames = [doc.filename for doc in allowed_docs]

    if not roadmap:
        # Nếu làm bài test đầu vào -> Sinh roadmap 10 buổi
        adaptive_agent = AdaptiveAgent(db)
        adaptive_agent.generate_overall_roadmap(req.user_id, req.subject, allowed_filenames, force_level=new_level)
        msg = f"Đã thiết lập lộ trình học 10 buổi dựa trên trình độ {new_level} của bạn."
    else:
        # Nếu đang học các buổi tiếp theo
        roadmap.level_assigned = new_level
        total_sessions = len(roadmap.roadmap_data) if roadmap.roadmap_data else 10
        if score_percent >= 60.0:
            is_passed = True
            if roadmap.current_session < total_sessions:
                roadmap.current_session += 1
                msg = "Chúc mừng! Bạn đã đạt yêu cầu và mở khóa bài học tiếp theo."
            else:
                msg = "Chúc mừng bạn đã hoàn thành toàn bộ lộ trình môn học này!"
        else:
            is_passed = False
            msg = "Điểm của bạn chưa đạt mức yêu cầu (cần tối thiểu 60%). Hãy ôn tập lại nhé!"

    # 4. Lưu Lịch sử bài làm (AssessmentHistory)
    history = AssessmentHistory(
        subject=req.subject,
        user_id=req.user_id, 
        score=score_percent,
        level_at_time=new_level,
        duration_seconds=req.duration_seconds,
        correct_count=correct_count,
        total_questions=len(questions_db),
        wrong_detail=json.dumps(wrong_questions_log, ensure_ascii=False),
        timestamp=datetime.utcnow()
    )
    db.add(history)

    # 5. Cập nhật lại số lần test và trung bình trong LearnerProfile
    profile = db.query(LearnerProfile).filter_by(subject=req.subject, user_id=req.user_id).first()
    if profile:
        prev_avg = profile.avg_score if profile.avg_score else 0.0
        # Đảm bảo total_tests có giá trị hợp lệ để tính toán
        if profile.total_tests is None:
            profile.total_tests = 0
            
        profile.total_tests += 1
        profile.avg_score = ((prev_avg * (profile.total_tests - 1)) + score_percent) / profile.total_tests
    
    db.commit()
    
    return {
        "level": new_level, 
        "score": score_percent, 
        "correct_count": correct_count,
        "total_questions": len(questions_db),
        "results": detailed_results,
        "is_passed": is_passed,
        "message": msg
    }

# --- API 3: LẤY CHI TIẾT LỘ TRÌNH 10 BUỔI ---
@router.get("/roadmap/{subject}")
def get_learning_roadmap(subject: str, user_id: int, db: Session = Depends(get_db)):
    roadmap = db.query(LearningRoadmap).filter_by(subject=subject, user_id=user_id).first()
    if not roadmap:
        return {"has_roadmap": False}
        
    total_sessions = len(roadmap.roadmap_data) if roadmap.roadmap_data else 10
    progress = (roadmap.current_session / total_sessions) * 100 if total_sessions > 0 else 0

    return {
        "has_roadmap": True,
        "level_assigned": roadmap.level_assigned,
        "current_session": roadmap.current_session,
        "roadmap_data": roadmap.roadmap_data, 
        "progress_percent": progress 
    }

# --- API 4: LẤY LỊCH SỬ ---
@router.get("/history/{subject}")
def get_evaluation_history(subject: str, user_id: int, db: Session = Depends(get_db)):
    history_records = db.query(AssessmentHistory)\
        .filter_by(subject=subject, user_id=user_id)\
        .order_by(AssessmentHistory.timestamp.asc())\
        .all()
    
    if not history_records:
        return {"history": []}

    processed_history = []
    previous_score = 0 

    for h in history_records:
        trend = h.score - previous_score
        previous_score = h.score 
        processed_history.append({
            "id": h.id,
            "date": h.timestamp.isoformat(),
            "score": h.score,
            "level": h.level_at_time,
            "duration": h.duration_seconds,
            "trend": trend,
            "effort": min(100, int((h.duration_seconds / 300) * 100)) if h.duration_seconds else 0
        })

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
        raise HTTPException(status_code=500, detail=str(e))
    
# API dành riêng cho bạn soi đáp án trong Database
@router.get("/debug/all-answers")
def get_all_answers_in_db(db: Session = Depends(get_db)):
    # Lấy toàn bộ câu hỏi từ ngân hàng câu hỏi
    questions = db.query(QuestionBank).all()
    
    if not questions:
        return {"message": "Database đang trống, hãy sinh câu hỏi trước!"}
    
    debug_list = []
    for q in questions:
        debug_list.append({
            "id": q.id,
            "mon_hoc": q.subject,
            "cau_hoi": q.content,
            "lua_chon": q.options, # Danh sách A, B, C, D
            "dap_an_dung": q.correct_answer, # Ký tự A/B/C/D
            "giai_thich": q.explanation
        })
    
    return {
        "tong_so_cau": len(debug_list),
        "danh_sach_chi_tiet": debug_list
    }