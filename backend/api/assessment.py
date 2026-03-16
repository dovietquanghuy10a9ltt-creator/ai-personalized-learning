from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db, engine, Base
from db.models import LearnerProfile, QuestionBank, AssessmentHistory, User, Document, LearningRoadmap, Classroom
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
    test_type: str = "baseline" 

# --- 1. SINH ĐỀ THI ĐÁNH GIÁ TỔNG QUAN (ĐẦU VÀO) ---
@router.post("/generate")
def generate_quiz(req: QuizRequest, db: Session = Depends(get_db)):
    if not req.subject or req.subject.strip() == "":
        raise HTTPException(status_code=400, detail="Vui lòng chọn môn học!")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Người dùng không tồn tại.")

    # TÌM LỚP HỌC MÀ SINH VIÊN ĐÃ THAM GIA ĐÚNG VỚI MÔN NÀY
    target_class = next((c for c in getattr(user, 'enrolled_classes', []) if c.subject == req.subject), None)
    if not target_class:
        raise HTTPException(status_code=400, detail=f"Bạn chưa tham gia lớp học nào cho môn '{req.subject}'.")

    # ==============================================================
    # CHẶN LÀM LẠI BÀI THI: Kiểm tra xem đã có Lộ trình học chưa
    # ==============================================================
    existing_roadmap = db.query(LearningRoadmap).filter_by(user_id=req.user_id, subject=req.subject).first()
    if existing_roadmap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Bạn đã hoàn thành bài đánh giá năng lực môn '{req.subject}'. Vui lòng vào mục Lộ trình để bắt đầu học!"
        )

    # LẤY TÀI LIỆU CỦA ĐÚNG LỚP ĐÓ
    allowed_docs = db.query(Document).filter(
        Document.class_id == target_class.id,
        Document.subject == req.subject
    ).all()
    
    allowed_filenames = [doc.filename for doc in allowed_docs]
    
    if not allowed_filenames:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Lớp học của bạn hiện chưa có tài liệu cho môn '{req.subject}'."
        )

    # Gọi AssessmentAgent với cấu hình cực kỳ nghiêm ngặt
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
    if not user:
        raise HTTPException(status_code=400, detail="Người dùng không hợp lệ.")

    # TÌM LỚP HỌC MÀ SINH VIÊN ĐÃ THAM GIA ĐÚNG VỚI MÔN NÀY
    target_class = next((c for c in getattr(user, 'enrolled_classes', []) if c.subject == req.subject), None)
    if not target_class:
        raise HTTPException(status_code=400, detail=f"Bạn chưa tham gia lớp học nào cho môn '{req.subject}'.")

    # LẤY TÀI LIỆU CỦA ĐÚNG LỚP ĐÓ
    allowed_docs = db.query(Document).filter(
        Document.class_id == target_class.id,
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
            correct_answer=q_data.get("correct_label", "A"), 
            explanation=q_data.get("explanation", ""),
            difficulty=req.level 
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

# --- 3. NỘP BÀI, CHẤM ĐIỂM & ĐIỀU HƯỚNG LỘ TRÌNH (THĂNG CẤP) ---
@router.post("/submit")
def submit_quiz(req: SubmitRequest, db: Session = Depends(get_db)):
    if not req.answers:
        raise HTTPException(status_code=400, detail="Không có câu trả lời nào.")

    user_map = {a.question_id: a.selected_option for a in req.answers}
    question_ids = list(user_map.keys())

    # Lấy Profile cũ để bảo vệ Level nếu đây là bài thi qua buổi
    profile = db.query(LearnerProfile).filter_by(subject=req.subject, user_id=req.user_id).first()
    old_level = profile.current_level if profile else "Beginner"

    

    # 2. Xử lý chấm điểm chi tiết
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

    total_q = len(questions_db)
    score_percent = round((correct_count / total_q * 100), 2) if total_q > 0 else 0.0

    # 3. GỌI PROFILING AGENT ĐỂ CHỐT LEVEL
    profiler = ProfilingAgent(db)
    calculated_level = profiler.classify_learner(correct_count, total_q, req.subject, req.user_id)

    if req.is_session_quiz:
        new_level = old_level
    else:
        new_level = calculated_level

    # ==============================================================
    # 4. ĐIỀU HƯỚNG VÀ THĂNG CẤP LỘ TRÌNH (RPG LEVEL UP)
    # ==============================================================
    roadmap = db.query(LearningRoadmap).filter_by(user_id=req.user_id, subject=req.subject).first()
    is_passed = True
    msg = ""
    
    # Chuẩn bị file tài liệu
    user_obj = db.query(User).filter(User.id == req.user_id).first()
    target_class = next((c for c in getattr(user_obj, 'enrolled_classes', []) if c.subject == req.subject), None)
    allowed_filenames = []
    if target_class:
        allowed_docs = db.query(Document).filter(Document.class_id == target_class.id, Document.subject == req.subject).all()
        allowed_filenames = [doc.filename for doc in allowed_docs]

    adaptive_agent = AdaptiveAgent(db)
    
    if not roadmap:
        try:
            adaptive_agent.generate_overall_roadmap(req.user_id, req.subject, allowed_filenames, force_level=new_level)
            msg = f"Đã thiết lập lộ trình học dựa trên trình độ {new_level} của bạn."
        except Exception as e:
            print(f"🚨 CẢNH BÁO AI CRASH ROADMAP: {e}")
            msg = f"Đã ghi nhận điểm số. Đang chờ AI cập nhật lộ trình."
            
    else:
        total_sessions = len(roadmap.roadmap_data) if roadmap.roadmap_data else 11
        
        if score_percent >= 60.0:
            is_passed = True
            
            # TRƯỜNG HỢP A: CHƯA HỌC HẾT 11 BÀI
            if roadmap.current_session < total_sessions:
                roadmap.current_session += 1
                msg = "Chúc mừng! Bạn đã mở khóa bài học tiếp theo."
                
            # TRƯỜNG HỢP B: ĐÃ QUA BÀI 11 -> THĂNG CẤP!
            else:
                current_lvl = roadmap.level_assigned
                
                if current_lvl == "Beginner":
                    roadmap.level_assigned = "Intermediate"
                    roadmap.current_session = 1 
                    new_level = "Intermediate"
                    if profile: profile.current_level = "Intermediate"
                    
                    try:
                        adaptive_agent.generate_overall_roadmap(req.user_id, req.subject, allowed_filenames, force_level="Intermediate")
                        msg = "🔥 CHÚC MỪNG! Bạn đã phá đảo cấp độ Beginner. Hệ thống đã TỰ ĐỘNG THĂNG CẤP bạn lên INTERMEDIATE kèm lộ trình 11 bài mới!"
                    except:
                        msg = "🔥 Bạn đã thăng cấp INTERMEDIATE! Đang tạo lộ trình mới..."
                        
                elif current_lvl == "Intermediate":
                    roadmap.level_assigned = "Advanced"
                    roadmap.current_session = 1
                    new_level = "Advanced"
                    if profile: profile.current_level = "Advanced"
                    
                    try:
                        adaptive_agent.generate_overall_roadmap(req.user_id, req.subject, allowed_filenames, force_level="Advanced")
                        msg = "⚡ QUÁ ĐỈNH! Bạn đã thăng cấp lên ADVANCED (Cao thủ). Lộ trình Boss cuối đã mở khóa!"
                    except:
                        msg = "⚡ Bạn đã thăng cấp ADVANCED! Đang tạo lộ trình Boss..."
                        
                elif current_lvl == "Advanced":
                    roadmap.is_completed = True 
                    msg = "🏆 HUYỀN THOẠI! Bạn đã hoàn thành toàn bộ 11 bài của cấp độ cao nhất. Chính thức TỐT NGHIỆP môn học này!"
        else:
            is_passed = False
            msg = "Điểm chưa đạt (cần tối thiểu 60%). Hãy ôn tập lại toàn bộ kiến thức và thử lại nhé!"

    # ==============================================================
    # 5. LƯU LỊCH SỬ BÀI LÀM
    # ==============================================================
    # Đảm bảo frontend gửi đúng type, nếu gọi qua bài thì ép thành session
    final_test_type = "session" if req.is_session_quiz and req.test_type == "baseline" else req.test_type

    history = AssessmentHistory(
        subject=req.subject,
        user_id=req.user_id, 
        score=score_percent,
        test_type=final_test_type, 
        level_at_time=new_level,
        duration_seconds=req.duration_seconds,
        correct_count=correct_count,
        total_questions=total_q,
        wrong_detail=json.dumps(wrong_questions_log, ensure_ascii=False),
        timestamp=datetime.utcnow()
    )
    db.add(history)
    db.commit() # BẮT BUỘC COMMIT Ở ĐÂY ĐỂ EVALUATION AGENT ĐỌC ĐƯỢC RECORD MỚI NÀY
    
    # ==============================================================
    # 🚀 6. GỌI EVALUATION AGENT ĐỂ TÍNH BỘ ĐIỂM CHUẨN 1-10-1
    # ==============================================================
    eval_agent = EvaluationAgent(db)
    
    performance_data = eval_agent.evaluate_performance(
        user_id=req.user_id,
        subject=req.subject,
        current_score=score_percent,
        test_type=final_test_type
    )

    if profile:
        profile.total_tests = (profile.total_tests or 0) + 1
        # 🔥 Lưu điểm Test Score ĐÃ LỌC (Không có bài đầu vào) làm Trung bình thật sự
        profile.avg_score = performance_data["actual_test_score"]
        db.commit()
    
    return {
        "level": new_level, 
        "score": score_percent, 
        "correct_count": correct_count,
        "total_questions": total_q,
        "results": detailed_results,
        "is_passed": is_passed,
        "message": msg,
        
        # Trả về bộ dữ liệu từ Evaluation Agent để hiển thị UI
        "actual_test_score": performance_data["actual_test_score"],
        "effort_score": performance_data["effort_score"],
        "progress_score": performance_data["progress_score"],
        "final_score": performance_data["final_score"],
        "ai_feedback": performance_data["evaluation_msg"]
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
            "test_type": h.test_type, 
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