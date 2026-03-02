from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager # Thêm thư viện quản lý vòng đời (lifespan)

# --- IMPORT DATABASE VÀ MODELS ---
from db import models
from db.database import engine, SessionLocal 
from db.models import User

# --- IMPORT HÀM BĂM MẬT KHẨU ---
from api.auth import hash_password 

# --- IMPORT CÁC ROUTER API ---
from api import assessment, upload, adaptive, stats, auth, classroom, admin, document 

from fastapi.staticfiles import StaticFiles
import os

# Tự động tạo bảng nếu chưa có 
models.Base.metadata.create_all(bind=engine)

# --- HÀM TẠO ADMIN MẶC ĐỊNH (SEEDING) ---
def create_initial_admin():
    db = SessionLocal()
    try:
        # Kiểm tra xem tài khoản admin đã tồn tại chưa
        admin_exists = db.query(User).filter(User.username == "admin").first()
        if not admin_exists:
            print("🚀 Đang khởi tạo tài khoản Admin mặc định...")
            admin_user = User(
                username="admin",
                hashed_password=hash_password("admin123"), # Băm mật khẩu mặc định
                role="admin",
                full_name="Quản trị viên hệ thống"
            )
            db.add(admin_user)
            db.commit()
            print("✅ Đã tạo tài khoản Admin mặc định (Tài khoản: admin / Mật khẩu: admin123)")
    except Exception as e:
        # Bắt lỗi rõ ràng để không bị treo server (xoay vòng)
        db.rollback()
        print(f"❌ LỖI KHỞI TẠO ADMIN: {e}")
    finally:
        db.close()

# --- QUẢN LÝ VÒNG ĐỜI (LIFESPAN) ---
# Đảm bảo server khởi động xong mới chạy hàm tạo Admin
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_initial_admin()
    yield # App đang chạy
    # Code dọn dẹp khi tắt app có thể để ở đây

# Khởi tạo App với lifespan
app = FastAPI(title="AI Personalized Learning API", lifespan=lifespan)

# --- CẤU HÌNH CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("temp_uploads", exist_ok=True) # Đảm bảo thư mục tồn tại để không báo lỗi
app.mount("/temp_uploads", StaticFiles(directory="temp_uploads"), name="temp_uploads")
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

# 6. Admin (Quản lý người dùng - Giáo viên/Học sinh)
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# 7. Document (Quản lý Thư viện học liệu) 
app.include_router(document.router, prefix="/api/document", tags=["Document"])


@app.get("/")
def read_root():
    return {"message": "Hệ thống AI Learning đã sẵn sàng!"}