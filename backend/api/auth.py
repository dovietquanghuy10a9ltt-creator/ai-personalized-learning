from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
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

# Sửa lỗi Bcrypt bằng cách ép ident="2b"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__ident="2b")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# --- SCHEMAS ---
class UserRegister(BaseModel):
    fullname: str
    email: str
    password: str
    role: str 

class UserLogin(BaseModel):
    email: str
    password: str

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

# --- ROUTES ---

@router.post("/register")
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    user_exists = db.query(models.User).filter(models.User.username == user_in.email).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký.")
    
    new_user = models.User(
        full_name=user_in.fullname,
        username=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "Đăng ký thành công"}

@router.post("/login")
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role, "id": user.id})
    
    # TRẢ VỀ userId ĐỂ FRONTEND LƯU VÀO LOCALSTORAGE
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "fullname": user.full_name,
        "userId": user.id 
    }

# --- API LẤY THÔNG TIN NGƯỜI DÙNG & LỚP HỌC ---
@router.get("/me/{user_id}")
def get_user_status(user_id: int, db: Session = Depends(get_db)):
    """
    API giúp Học sinh kiểm tra xem mình đã thuộc lớp nào chưa.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    
    class_info = None
    if user.class_id:
        classroom = db.query(models.Classroom).filter(models.Classroom.id == user.class_id).first()
        if classroom:
            teacher = db.query(models.User).filter(models.User.id == classroom.teacher_id).first()
            class_info = {
                "id": classroom.id,
                "name": classroom.name,
                "teacher_name": teacher.full_name if teacher else "Ẩn danh"
            }

    return {
        "id": user.id,
        "fullname": user.full_name,
        "role": user.role,
        "enrolled_class": class_info
    }