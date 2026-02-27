from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# --- IMPORT DATABASE VÀ MODELS ---
from db import models
from db.database import engine

# --- IMPORT CÁC ROUTER API ---
from api import assessment, upload, adaptive, stats, auth, classroom 

# Tự động tạo bảng nếu chưa có 
# (Sẽ tạo thêm bảng 'users', 'classrooms', và cập nhật 'documents' từ models mới)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Personalized Learning API")

# --- CẤU HÌNH CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ĐĂNG KÝ ROUTER ---

# 0. Authentication (Xử lý Đăng nhập/Đăng ký)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# 1. Classroom (Xử lý Tạo lớp, Tham gia lớp, Lấy danh sách lớp)
app.include_router(classroom.router, prefix="/api/classroom", tags=["Classroom"])

# 2. Assessment
app.include_router(assessment.router, prefix="/api/assessment", tags=["Assessment"])

# 3. Upload (Quản lý tài liệu theo lớp)
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])

# 4. Adaptive (Gia sư AI cá nhân hóa theo tài liệu lớp)
app.include_router(adaptive.router, prefix="/api/adaptive", tags=["AI Tutor"])

# 5. Stats
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])


@app.get("/")
def read_root():
    return {"message": "Hệ thống AI Learning đã sẵn sàng!"}