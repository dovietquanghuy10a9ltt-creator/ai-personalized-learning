from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from db.database import get_db
from db import models
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# --- CẤU HÌNH BẢO MẬT ---
SECRET_KEY = "YOUR_SUPER_SECRET_KEY_HERE" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__ident="2b")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# --- SCHEMAS ---
class UserRegister(BaseModel):
    fullname: str
    email: str
    password: str
    role: str 
    student_id: Optional[str] = None # 👇 THÊM MSSV

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# --- HÀM PHỤ TRỢ ---
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- DEPENDENCY: LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin (Token không hợp lệ hoặc đã hết hạn)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# --- ROUTES ---

@router.post("/register")
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    role_requested = user_in.role.strip().lower()
    if role_requested in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Hành động bị từ chối! Chỉ Quản trị viên (Admin) mới có quyền tạo tài khoản Giáo viên."
        )
    
    final_role = "student"

    user_exists = db.query(models.User).filter(models.User.username == user_in.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký.")
    
    # 👇 Kiểm tra trùng MSSV nếu có nhập
    if user_in.student_id:
        student_exists = db.query(models.User).filter(models.User.student_id == user_in.student_id).first()
        if student_exists:
            raise HTTPException(status_code=400, detail="Mã số sinh viên (MSSV) này đã tồn tại.")

    new_user = models.User(
        full_name=user_in.fullname,
        username=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=final_role,
        student_id=user_in.student_id # 👇 Lưu MSSV vào DB
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Đăng ký thành công"}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role, "id": user.id})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "fullname": user.full_name,
        "userId": user.id,
        "studentId": user.student_id # 👇 Trả về thêm MSSV cho Frontend nếu cần
    }

@router.post("/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác!")
    
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    
    return {"message": "Đổi mật khẩu thành công! Lần đăng nhập sau hãy dùng mật khẩu mới."}

@router.get("/me/{user_id}")
def get_user_status(user_id: int, db: Session = Depends(get_db)):
    """
    Lấy thông tin Học sinh kèm danh sách TẤT CẢ các lớp đã tham gia (Quan hệ N-N)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    
    # Lấy danh sách lớp từ bảng trung gian enrolled_classes
    enrolled_classes_info = []
    if hasattr(user, 'enrolled_classes') and user.enrolled_classes:
        for classroom in user.enrolled_classes:
            teacher_name = classroom.teacher.full_name if classroom.teacher else "Ẩn danh"
            enrolled_classes_info.append({
                "id": classroom.id,
                "name": classroom.name,
                "subject": classroom.subject,
                "teacher_name": teacher_name
            })

    return {
        "id": user.id,
        "fullname": user.full_name,
        "role": user.role,
        "student_id": user.student_id,
        "enrolled_classes": enrolled_classes_info # Trả về mảng (list) thay vì 1 object
    }