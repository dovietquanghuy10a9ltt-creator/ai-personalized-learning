from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import string
import secrets

# Import Database và Models
from db.database import get_db
from db.models import User

# Import hàm xác thực và băm mật khẩu từ auth.py
from api.auth import get_current_user, hash_password

router = APIRouter()

# --- HÀM TẠO MẬT KHẨU NGẪU NHIÊN ---
def generate_random_password(length=8):
    """Tạo mật khẩu 8 ký tự an toàn gồm chữ hoa, chữ thường và số"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

# --- MIDDLEWARE: CHỈ ADMIN MỚI ĐƯỢC VÀO ---
def get_current_admin(current_user: User = Depends(get_current_user)):
    """Kiểm tra xem người đang gọi API có Role là Admin không"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Truy cập bị từ chối! Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này."
        )
    return current_user

# --- SCHEMAS ---
class UserCreateByAdmin(BaseModel):
    fullname: str
    email: str
    role: str  # Truyền vào "teacher" hoặc "student"

# --- CÁC API DÀNH RIÊNG CHO ADMIN ---

@router.post("/create-user")
def create_user(req: UserCreateByAdmin, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """
    API Tạo tài khoản (Chỉ Admin dùng). 
    Sẽ sinh ra một mật khẩu ngẫu nhiên và trả về 1 lần duy nhất.
    """
    # Ép kiểu role cho chuẩn xác
    role_requested = req.role.strip().lower()
    if role_requested not in ["teacher", "student"]:
        raise HTTPException(status_code=400, detail="Role chỉ được là 'teacher' hoặc 'student'")

    # Kiểm tra trùng lặp email/username
    existing_user = db.query(User).filter(User.username == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email/Tên đăng nhập này đã tồn tại trong hệ thống!")

    # Sinh mật khẩu ngẫu nhiên
    random_password = generate_random_password()

    # Tạo User mới
    new_user = User(
        username=req.email,
        full_name=req.fullname,
        role=role_requested,
        hashed_password=hash_password(random_password)
    )
    db.add(new_user)
    db.commit()

    # Trả về Mật khẩu CHỈ 1 LẦN DUY NHẤT để Admin copy gửi cho Giáo viên
    return {
        "message": "Tạo tài khoản thành công!",
        "email": req.email,
        "password": random_password, 
        "role": role_requested,
        "fullname": req.fullname
    }

@router.delete("/delete-user/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """
    API Xóa tài khoản Giáo viên/Học sinh.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng này trong hệ thống.")
    
    # Bảo vệ cấp cao: Không ai được phép xóa tài khoản của Admin (kể cả chính Admin lỡ tay)
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Hành động bị từ chối! Không thể xóa tài khoản Quản trị viên hệ thống.")

    db.delete(user)
    db.commit()
    return {"message": f"Đã xóa thành công người dùng: {user.full_name} ({user.username})"}
    
@router.get("/users")
def get_all_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """
    API Lấy danh sách toàn bộ người dùng (trừ admin) để hiển thị trên Bảng điều khiển (Dashboard) của Admin.
    """
    # Lấy tất cả user nhưng lọc bỏ tài khoản admin
    users = db.query(User).filter(User.role != "admin").all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.username,
            "fullname": u.full_name,
            "role": u.role
        })
    return {"total": len(result), "users": result}