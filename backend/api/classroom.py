from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import List

router = APIRouter()

# Schema để nhận dữ liệu từ Frontend
class ClassroomCreate(BaseModel):
    name: str
    teacher_id: int

# API Tạo lớp học
@router.post("/create")
def create_classroom(data: ClassroomCreate, db: Session = Depends(get_db)):
    try:
        new_class = models.Classroom(
            name=data.name,
            teacher_id=data.teacher_id
        )
        db.add(new_class)
        db.commit()
        db.refresh(new_class)
        return {
            "message": "Tạo lớp học thành công",
            "class_id": new_class.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# API Lấy danh sách lớp theo giáo viên
@router.get("/teacher/{teacher_id}")
def get_teacher_classes(teacher_id: int, db: Session = Depends(get_db)):
    classes = db.query(models.Classroom).filter(models.Classroom.teacher_id == teacher_id).all()
    return classes

# API Học sinh tham gia lớp
@router.post("/join")
def join_classroom(student_id: int, class_id: int, db: Session = Depends(get_db)):
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
    
    # Kiểm tra lớp học có tồn tại không
    classroom = db.query(models.Classroom).filter(models.Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Mã lớp học không tồn tại")

    student.class_id = class_id
    db.commit()
    return {"message": "Tham gia lớp học thành công"}

# Mở file backend/api/classroom.py và thêm đoạn này vào cuối

@router.get("/members/{class_id}")
def get_class_members(class_id: int, db: Session = Depends(get_db)):
    """API lấy danh sách toàn bộ học sinh trong một lớp cụ thể"""
    members = db.query(models.User).filter(
        models.User.class_id == class_id, 
        models.User.role == "student" # Đảm bảo chỉ lấy học sinh
    ).all()
    
    return [
        {
            "id": m.id,
            "full_name": m.full_name,
            "email": m.username, # Trong auth.py bạn lưu email vào cột username
            "created_at": getattr(m, 'created_at', None) # Lấy ngày tạo nếu có
        } for m in members
    ]

@router.delete("/remove-student/{student_id}")
def remove_student_from_class(student_id: int, db: Session = Depends(get_db)):
    """API đuổi học sinh ra khỏi lớp (Cập nhật class_id về Null)"""
    student = db.query(models.User).filter(models.User.id == student_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Không tìm thấy học sinh này")
    
    if student.role != "student":
         raise HTTPException(status_code=400, detail="Chỉ có thể xóa học sinh khỏi lớp")
    
    # "Đuổi" khỏi lớp bằng cách xóa liên kết class_id
    student.class_id = None 
    db.commit()
    
    return {"message": f"Đã xóa học sinh {student.full_name} khỏi lớp."}