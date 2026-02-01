# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- QUAN TRỌNG: CHỈ IMPORT NHỮNG FILE CÒN TỒN TẠI ---
# Đã xóa 'chat' khỏi dòng này vì bạn không còn file api/chat.py nữa
from api import assessment, upload, adaptive 

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

# 3. Adaptive (Gia sư AI - Thay thế cho Chat cũ)
app.include_router(adaptive.router, prefix="/api/adaptive", tags=["Adaptive Learning"])

# (Đã xóa dòng app.include_router(chat.router...) gây lỗi)

@app.get("/")
def read_root():
    return {"message": "AI Learning System is Running!"}