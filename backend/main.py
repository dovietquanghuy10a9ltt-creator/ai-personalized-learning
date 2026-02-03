from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- IMPORT DATABASE VÀ MODELS ---
from db import models
from db.database import engine

# --- IMPORT CÁC ROUTER API ---
from api import assessment, upload, adaptive, stats 

# Tự động tạo bảng nếu chưa có
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

# 1. Assessment: /api/assessment/...
app.include_router(assessment.router, prefix="/api/assessment", tags=["Assessment"])

# 2. Upload: /api/upload/... 
# 👇 SỬA TẠI ĐÂY: Đổi prefix từ "/api" thành "/api/upload"
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])

# 3. Adaptive: /api/adaptive/...
app.include_router(adaptive.router, prefix="/api/adaptive", tags=["AI Tutor"])

# 4. Stats: /api/stats/...
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])

@app.get("/")
def read_root():
    return {"message": "Hệ thống AI Learning đã sẵn sàng!"}