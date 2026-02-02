# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- IMPORT DATABASE VÀ MODELS ---
from db import models
from db.database import engine
# 👇 THÊM "stats" VÀO DÒNG IMPORT NÀY
from api import assessment, upload, adaptive, stats 

# LỆNH QUAN TRỌNG: Tự động tạo file app.db và các bảng nếu chưa có
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ĐĂNG KÝ ROUTER ---

# 1. Assessment (Kiểm tra)
app.include_router(assessment.router, prefix="/api/assessment", tags=["Assessment"])

# 2. Upload (Tải tài liệu)
app.include_router(upload.router, prefix="/api", tags=["Upload"])

# 3. Adaptive (Gia sư AI)
app.include_router(adaptive.router, prefix="/api/adaptive", tags=["Adaptive Learning"])

# 4. Stats (Thống kê học tập) - 👇 THÊM DÒNG NÀY ĐỂ KẾT NỐI DASHBOARD
app.include_router(stats.router, prefix="/api/stats", tags=["Stats"])

@app.get("/")
def read_root():
    return {"message": "AI Learning System is Running!"}