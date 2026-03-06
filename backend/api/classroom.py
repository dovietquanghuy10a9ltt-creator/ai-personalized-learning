import string
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import List

router = APIRouter()

# --- SCHEMAS NHẬN DỮ LIỆU TỪ FRONTEND ---
class ClassroomCreate(BaseModel):
    name: str
    subject: str # Bắt buộc chọn môn học khi tạo lớp
    teacher_id: int

class ClassJoin(BaseModel):
    class_code: str
    user_id: int

# --- HÀM TẠO MÃ LỚP NGẪU NHIÊN ---
def generate_class_code(subject: str, db: Session):
    """Tạo mã lớp ngẫu nhiên dựa trên môn học. VD: TOA-X7Y9Z"""
    prefix = "".join([c.upper() for c in subject.split() if c.isalpha()])[:3]
    if not prefix:
        prefix = "CLS"
        
    while True:
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        code = f"{prefix}-{suffix}"
        if not db.query(models.Classroom).filter(models.Classroom.class_code == code).first():
            return code

# ==========================================
# 1. API: GIÁO VIÊN TẠO LỚP HỌC MỚI
# ==========================================
@router.post("/create")
def create_classroom(data: ClassroomCreate, db: Session = Depends(get_db)):
    try:
        unique_code = generate_class_code(data.subject, db)
        
        new_class = models.Classroom(
            name=data.name,
            subject=data.subject,
            class_code=unique_code,
            teacher_id=data.teacher_id
        )
        db.add(new_class)
        db.commit()
        db.refresh(new_class)
        
        return {
            "message": "Tạo lớp học thành công",
            "class_id": new_class.id,
            "class_code": new_class.class_code,
            "subject": new_class.subject
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 2. API: LẤY DANH SÁCH LỚP DO GIÁO VIÊN QUẢN LÝ
# ==========================================
@router.get("/teacher/{teacher_id}")
def get_teacher_classes(teacher_id: int, db: Session = Depends(get_db)):
    """Lấy danh sách lớp của riêng giáo viên đó (Cách ly dữ liệu)"""
    classes = db.query(models.Classroom).filter(models.Classroom.teacher_id == teacher_id).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "subject": c.subject,
            "class_code": c.class_code,
            "student_count": len(c.students)
        } for c in classes
    ]

# ==========================================
# 3. API: HỌC SINH NHẬP MÃ ĐỂ THAM GIA LỚP
# ==========================================
@router.post("/join")
def join_classroom(data: ClassJoin, db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.id == data.user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
    
    target_class = db.query(models.Classroom).filter(models.Classroom.class_code == data.class_code).first()
    if not target_class:
        raise HTTPException(status_code=404, detail="Mã lớp học không tồn tại hoặc đã bị xóa")

    # KIỂM TRA LUẬT VÀNG: 1 Môn chỉ học 1 Lớp
    for enrolled in student.enrolled_classes:
        if enrolled.id == target_class.id:
            raise HTTPException(status_code=400, detail="Bạn đã tham gia lớp này rồi!")
        
        if enrolled.subject.lower().strip() == target_class.subject.lower().strip():
            raise HTTPException(
                status_code=400, 
                detail=f"Lỗi: Bạn đã có lớp '{enrolled.name}' thuộc môn '{target_class.subject}' rồi. Mỗi môn chỉ được đăng ký 1 lớp!"
            )

    target_class.students.append(student)
    db.commit()
    return {
        "message": f"Tham gia lớp {target_class.name} thành công",
        "class_id": target_class.id,
        "subject": target_class.subject
    }

# ==========================================
# 4. API: LẤY DANH SÁCH HỌC SINH VÀ TÍNH ĐIỂM EVALUATION AGENT (DỮ LIỆU THẬT)
# ==========================================
@router.get("/members/{class_id}")
def get_class_members(class_id: int, db: Session = Depends(get_db)):
    """API trả về danh sách học sinh kèm điểm AI đánh giá dựa trên quá trình học thật"""
    classroom = db.query(models.Classroom).filter(models.Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
    
    subject = classroom.subject
    result = []
    
    # --- CẤU HÌNH CHUẨN ĐỂ ĐO LƯỜNG NỖ LỰC ---
    # Giả định: Một môn học cần khoảng 600 phút (10 tiếng) để hoàn thành và có khoảng 5 bài test
    EXPECTED_STUDY_MINUTES = 600 
    EXPECTED_TESTS = 5 
    
    for m in classroom.students:
        if m.role == "student":
            # -------------------------------------------------------------
            # 🧠 EVALUATION AGENT LOGIC (TRUY VẤN TỪ DATABASE THẬT)
            # -------------------------------------------------------------
            
            # --- 1. TEST SCORE (Trọng số 50%) ---
            # Lấy các bài kiểm tra qua từng chương
            chapter_tests = db.query(models.AssessmentHistory).filter(
                models.AssessmentHistory.user_id == m.id,
                models.AssessmentHistory.subject == subject,
                models.AssessmentHistory.test_type == 'chapter'
            ).all()
            avg_chapter = sum([t.score for t in chapter_tests]) / len(chapter_tests) if chapter_tests else 0
            
            # Lấy bài kiểm tra cuối kỳ (mới nhất)
            final_test = db.query(models.AssessmentHistory).filter(
                models.AssessmentHistory.user_id == m.id,
                models.AssessmentHistory.subject == subject,
                models.AssessmentHistory.test_type == 'final'
            ).order_by(models.AssessmentHistory.timestamp.desc()).first()
            final_test_score = final_test.score if final_test else 0
            
            # Tính điểm Test: 40% quá trình + 60% cuối kỳ (Nếu chưa thi cuối kỳ thì tính 100% quá trình)
            if final_test_score > 0:
                test_score = (avg_chapter * 0.4) + (final_test_score * 0.6)
            else:
                test_score = avg_chapter

            # --- 2. EFFORT SCORE (Trọng số 30%) ---
            # Truy vấn tổng thời gian đã học
            sessions = db.query(models.StudySession).filter(
                models.StudySession.user_id == m.id,
                models.StudySession.subject == subject
            ).all()
            total_minutes = sum([s.duration_minutes for s in sessions if s.duration_minutes])
            
            # Tính tỷ lệ tương tác (tối đa 100%)
            engagement_rate = min((total_minutes / EXPECTED_STUDY_MINUTES) * 100, 100) if EXPECTED_STUDY_MINUTES > 0 else 0
            
            # Tính tỷ lệ hoàn thành bài tập
            total_tests_done = len(chapter_tests) + (1 if final_test else 0)
            completion_rate = min((total_tests_done / EXPECTED_TESTS) * 100, 100) if EXPECTED_TESTS > 0 else 0
            
            # Effort Score = 50% hoàn thành + 50% tương tác
            effort_score = (completion_rate * 0.5) + (engagement_rate * 0.5)

            # --- 3. PROGRESS SCORE (Trọng số 20%) ---
            # Lấy điểm đánh giá đầu vào (Baseline test)
            baseline_test = db.query(models.AssessmentHistory).filter(
                models.AssessmentHistory.user_id == m.id,
                models.AssessmentHistory.subject == subject,
                models.AssessmentHistory.test_type == 'baseline'
            ).order_by(models.AssessmentHistory.timestamp.asc()).first()
            
            # Nếu không có bài baseline, lấy tạm điểm thấp nhất hệ thống có để không bị lỗi
            baseline_score = baseline_test.score if baseline_test else (test_score if test_score > 0 else 0)
            
            # Thuật toán Room for Improvement
            room_for_improvement = 100 - baseline_score
            if room_for_improvement <= 0:
                progress_score = 100.0 # Nếu đầu vào đã 100 điểm thì tiến bộ luôn max
            else:
                current_best = final_test_score if final_test_score > 0 else avg_chapter
                improvement = current_best - baseline_score
                if improvement <= 0:
                    progress_score = 0.0 # Không có tiến bộ hoặc thụt lùi
                else:
                    progress_score = min((improvement / room_for_improvement) * 100, 100)

            # --- 4. TÍNH FINAL SCORE ---
            test_score = round(test_score, 1)
            effort_score = round(effort_score, 1)
            progress_score = round(progress_score, 1)
            final_score = round((0.5 * test_score) + (0.3 * effort_score) + (0.2 * progress_score), 1)

            result.append({
                "id": m.id,
                "student_id": m.student_id or "Chưa cập nhật", 
                "full_name": m.full_name,
                "email": m.username,
                "test_score": test_score,
                "effort_score": effort_score,
                "progress_score": progress_score,
                "final_score": final_score
            })
            
    return result

# ==========================================
# 5. API: XÓA HỌC SINH KHỎI LỚP 
# ==========================================
@router.delete("/remove-student/{class_id}/{student_id}")
def remove_student_from_class(class_id: int, student_id: int, db: Session = Depends(get_db)):
    """Xóa học sinh khỏi lớp bằng cách gỡ liên kết N-N"""
    classroom = db.query(models.Classroom).filter(models.Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Không tìm thấy học sinh này")
    
    if student in classroom.students:
        classroom.students.remove(student) 
        db.commit()
        return {"message": f"Đã xóa học sinh {student.full_name} khỏi lớp."}
    else:
        raise HTTPException(status_code=400, detail="Học sinh này không có trong lớp.")