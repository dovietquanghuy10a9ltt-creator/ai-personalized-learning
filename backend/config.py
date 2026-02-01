import os
from dotenv import load_dotenv

# Load file .env
load_dotenv()

class Settings:
    # Lấy key từ môi trường, nếu không có thì trả về None (gây lỗi như bạn thấy)
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_db/app.db")
    CHROMA_DB_DIR = "chroma_db"

settings = Settings()

# Kiểm tra nhanh: In ra terminal xem đã đọc được key chưa (chỉ hiện 5 ký tự đầu)
if settings.GOOGLE_API_KEY:
    print(f"✅ Đã tìm thấy API Key: {settings.GOOGLE_API_KEY[:5]}...")
else:
    print("❌ LỖI: Chưa tìm thấy GOOGLE_API_KEY trong file .env!")