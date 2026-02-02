from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- IMPORT DATABASE VÀ MODELS ---
from db import models
from db.database import engine

# --- IMPORT CÁC ROUTER API ---
# Đảm bảo bạn đã có đủ 4 file này trong thư mục api/
from api import assessment, upload, adaptive, stats 

# LỆNH QUAN TRỌNG: Tự động tạo file app.db và các bảng nếu chưa có
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CẤU HÌNH CORS (Cho phép Frontend gọi API) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ĐĂNG KÝ ROUTER ---

# 1. Assessment (Kiểm tra & Chấm điểm)
# Endpoint: /api/assessment/generate, /api/assessment/submit...
app.include_router(assessment.router, prefix="/api/assessment", tags=["Assessment"])

# 2. Upload (Tải tài liệu)
# Endpoint: /api/upload
app.include_router(upload.router, prefix="/api", tags=["Upload"])

# 3. Adaptive (Gia sư AI - Groq Llama 3)
# Endpoint: /api/adaptive/recommend, /api/adaptive/chat
app.include_router(adaptive.router, prefix="/api/adaptive", tags=["AI Tutor"])

# 4. Stats (Thống kê Dashboard)
# Endpoint: /api/stats/learning-stats
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])

@app.get("/")
def read_root():
    return {"message": "Hệ thống AI Learning đã sẵn sàng!"}