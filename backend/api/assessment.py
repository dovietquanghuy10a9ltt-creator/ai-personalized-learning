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

# Thêm Schema cho Bài kiểm tra cuối buổi
class SessionQuizRequest(BaseModel):
    subject: str
    user_id: int
    session_topic: str  # Tên bài học (VD: "Cấu trúc dữ liệu mảng")
    level: str          # Trình độ (VD: "Intermediate")

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: str 

class SubmitRequest(BaseModel):
    subject: str
    user_id: int 
    answers: List[AnswerSubmission]
    duration_seconds: int = 300 
    is_session_quiz: bool = False

# --- 1. SINH ĐỀ THI ĐÁNH GIÁ TỔNG QUAN (ĐẦU VÀO) ---
@router.post("/generate")
def generate_quiz(req: QuizRequest, db: Session = Depends(get_db)):
    if not req.subject or req.subject.strip() == "":
        raise HTTPException(status_code=400, detail="Vui lòng chọn môn học!")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user or not user.class_id:
        raise HTTPException(status_code=400, detail="Người dùng không tồn tại hoặc chưa tham gia lớp học.")

    allowed_docs = db.query(Document).filter(
        Document.class_id == user.class_id,
        Document.subject == req.subject
    ).all()
    
    allowed_filenames = [doc.filename for doc in allowed_docs]
    
    if not allowed_filenames:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Lớp học của bạn hiện chưa có tài liệu cho môn '{req.subject}'."
        )

    agent = AssessmentAgent(db)
    questions = agent.get_or_create_quiz(
        subject=req.subject, 
        user_id=req.user_id, 
        num_questions=20, 
        allowed_files=allowed_filenames
    )
    
    if not questions:
        raise HTTPException(status_code=404, detail="AI chưa chuẩn bị xong câu hỏi. Hãy thử lại!")
        
    return {"questions": questions, "subject": req.subject}

# --- 2. TẠO BÀI KIỂM TRA THEO BÁM SÁT BUỔI HỌC VÀ LEVEL ---
@router.post("/generate-session")
def generate_session_assessment(req: SessionQuizRequest, db: Session = Depends(get_db)):
    if not req.subject or not req.session_topic:
        raise HTTPException(status_code=400, detail="Thiếu thông tin môn học hoặc chủ đề.")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user or not user.class_id:
        raise HTTPException(status_code=400, detail="Người dùng không hợp lệ.")

    # Lấy tài liệu của lớp
    allowed_docs = db.query(Document).filter(
        Document.class_id == user.class_id,
        Document.subject == req.subject
    ).all()
    allowed_filenames = [doc.filename for doc in allowed_docs]

    # Gọi Agent tạo đề thi bám sát Topic và Level
    agent = AdaptiveAgent(db)
    raw_questions = agent.generate_session_quiz(
        subject=req.subject,
        session_topic=req.session_topic,
        level=req.level,
        allowed_filenames=allowed_filenames
    )
    
    if not raw_questions:
        raise HTTPException(status_code=500, detail="AI đang bận, không thể tạo đề thi lúc này. Hãy thử lại!")

    # Lưu câu hỏi AI vừa tạo vào Database để hàm /submit có thể chấm điểm được
    saved_questions = []
    for q_data in raw_questions:
        new_q = QuestionBank(
            subject=req.subject,
            content=q_data.get("content", ""),
            options=json.dumps(q_data.get("options", []), ensure_ascii=False),
            correct_answer=q_data.get("correct_label", "A"), # Trả về A, B, C, D
            explanation=q_data.get("explanation", ""),
            difficulty=req.level # Đánh dấu level của câu hỏi
        )
        db.add(new_q)
        db.commit()
        db.refresh(new_q)
        
        saved_questions.append({
            "id": new_q.id,
            "content": new_q.content,
            "options": q_data.get("options", [])
        })
        
    return {"questions": saved_questions, "subject": req.subject}

# --- 3. NỘP BÀI, CHẤM ĐIỂM & ĐIỀU HƯỚNG LỘ TRÌNH ---
@router.post("/submit")
def submit_quiz(req: SubmitRequest, db: Session = Depends(get_db)):
    if not req.answers:
        raise HTTPException(status_code=400, detail="Không có câu trả lời nào.")

    user_map = {a.question_id: a.selected_option for a in req.answers}
    question_ids = list(user_map.keys())

    # Lấy Profile cũ để bảo vệ Level nếu đây là bài thi qua buổi
    profile = db.query(LearnerProfile).filter_by(subject=req.subject, user_id=req.user_id).first()
    old_level = profile.current_level if profile else "Beginner"

    # 1. Gọi AssessmentAgent chấm điểm (Giữ lại để agent lưu log hoặc ghi nhận lịch sử nội bộ nếu cần)
    answers_list = [{"question_id": a.question_id, "selected_option": a.selected_option} for a in req.answers]
    agent = AssessmentAgent(db)
    result = agent.submit_assessment(req.user_id, req.subject, answers_list)
    
    if not result:
        raise HTTPException(status_code=500, detail="Lỗi hệ thống: Không thể chấm điểm.")

    # 2. Xử lý chấm điểm chi tiết (Đếm số câu đúng thật chính xác từ Database)
    questions_db = db.query(QuestionBank).filter(
        QuestionBank.id.in_(question_ids),
        QuestionBank.subject == req.subject 
    ).all()
    
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

    # TÍNH LẠI CHUẨN XÁC SỐ ĐIỂM TỪ ĐÁP ÁN ĐÃ CHECK
    total_q = len(questions_db)
    score_percent = round((correct_count / total_q * 100), 2) if total_q > 0 else 0.0

    # ==============================================================
    # 3. GỌI PROFILING AGENT ĐỂ CHỐT LEVEL THEO TOÁN HỌC (ĐÃ FIX)
    # ==============================================================
    profiler = ProfilingAgent(db)
    calculated_level = profiler.classify_learner(correct_count, total_q, req.subject, req.user_id)

    # LOGIC: NẾU LÀ THI QUA BÀI -> GIỮ NGUYÊN LEVEL. NẾU LÀ THI ĐẦU VÀO -> LẤY LEVEL TỪ TOÁN HỌC
    if req.is_session_quiz:
        new_level = old_level
    else:
        new_level = calculated_level

    # 4. Điều hướng Lộ trình
    roadmap = db.query(LearningRoadmap).filter_by(user_id=req.user_id, subject=req.subject).first()
    is_passed = True
    msg = ""
    
    if not roadmap:
        user_obj = db.query(User).filter(User.id == req.user_id).first()
        allowed_docs = db.query(Document).filter(Document.class_id == user_obj.class_id, Document.subject == req.subject).all()
        allowed_filenames = [doc.filename for doc in allowed_docs]

        adaptive_agent = AdaptiveAgent(db)
        
        try:
            # ÉP CON AI VẼ ROADMAP THEO ĐÚNG LEVEL ĐÃ TÍNH TOÁN (new_level)
            adaptive_agent.generate_overall_roadmap(req.user_id, req.subject, allowed_filenames, force_level=new_level)
            msg = f"Đã thiết lập lộ trình học dựa trên trình độ {new_level} của bạn."
        except Exception as e:
            print(f"🚨 CẢNH BÁO AI CRASH ROADMAP: {e}")
            msg = f"Đã ghi nhận điểm số. Đang chờ AI cập nhật lộ trình (Sẽ tự động thử lại sau)."
            
    else:
        # Nếu đã có Roadmap, cập nhật tiến độ
        roadmap.level_assigned = new_level
        total_sessions = len(roadmap.roadmap_data) if roadmap.roadmap_data else 11
        
        if score_percent >= 60.0:
            is_passed = True
            if roadmap.current_session < total_sessions:
                roadmap.current_session += 1
                msg = "Chúc mừng! Bạn đã mở khóa bài học tiếp theo."
            else:
                # KÍCH HOẠT TỐT NGHIỆP NẾU QUA BÀI CUỐI CÙNG
                roadmap.is_completed = True 
                msg = "🎉 XUẤT SẮC! Bạn đã vượt qua bài kiểm tra cuối khóa và chính thức HOÀN THÀNH môn học này!"
        else:
            is_passed = False
            msg = "Điểm chưa đạt (cần tối thiểu 60%). Hãy ôn tập lại toàn bộ kiến thức và thử lại nhé!"

    # 5. Lưu Lịch sử bài làm
    history = AssessmentHistory(
        subject=req.subject,
        user_id=req.user_id, 
        score=score_percent,
        level_at_time=new_level,
        duration_seconds=req.duration_seconds,
        correct_count=correct_count,
        total_questions=total_q,
        wrong_detail=json.dumps(wrong_questions_log, ensure_ascii=False),
        timestamp=datetime.utcnow()
    )
    db.add(history)

    # 6. Cập nhật thống kê LearnerProfile
    profile = db.query(LearnerProfile).filter_by(subject=req.subject, user_id=req.user_id).first()
    
    if profile:
        prev_avg = profile.avg_score if profile.avg_score else 0.0
        profile.total_tests = (profile.total_tests or 0) + 1
        profile.avg_score = round(((prev_avg * (profile.total_tests - 1)) + score_percent) / profile.total_tests, 2)
        profile.current_level = new_level
    else:
        new_profile = LearnerProfile(
            user_id=req.user_id,
            subject=req.subject,
            current_level=new_level,
            total_tests=1,
            avg_score=score_percent
        )
        db.add(new_profile)
    
    db.commit() # LƯU TẤT CẢ
    
    return {
        "level": new_level, 
        "score": score_percent, 
        "correct_count": correct_count,
        "total_questions": total_q,
        "results": detailed_results,
        "is_passed": is_passed,
        "message": msg
    }

# --- CÁC API TRUY VẤN LỊCH SỬ VÀ ROADMAP ---
@router.get("/roadmap/{subject}")
def get_learning_roadmap(subject: str, user_id: int, db: Session = Depends(get_db)):
    roadmap = db.query(LearningRoadmap).filter_by(subject=subject, user_id=user_id).first()
    if not roadmap:
        return {"has_roadmap": False}
        
    total_sessions = len(roadmap.roadmap_data) if roadmap.roadmap_data else 11
    
    if roadmap.is_completed:
        progress = 100
    else:
        progress = ((roadmap.current_session - 1) / total_sessions) * 100 if total_sessions > 0 else 0
        
    return {
        "has_roadmap": True,
        "level_assigned": roadmap.level_assigned,
        "current_session": roadmap.current_session,
        "is_completed": roadmap.is_completed,
        "roadmap_data": roadmap.roadmap_data, 
        "progress_percent": progress 
    }

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

@router.get("/debug/all-answers")
def get_all_answers_in_db(db: Session = Depends(get_db)):
    questions = db.query(QuestionBank).all()
    if not questions:
        return {"message": "Database đang trống!"}
    debug_list = []
    for q in questions:
        debug_list.append({
            "id": q.id,
            "mon_hoc": q.subject,
            "cau_hoi": q.content,
            "lua_chon": q.options,
            "dap_an_dung": q.correct_answer,
            "giai_thich": q.explanation
        })
    return {"tong_so_cau": len(debug_list), "danh_sach_chi_tiet": debug_list}