# backend/api/upload.py
import shutil
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from agents.content_agent import content_agent

router = APIRouter()

# 1. ENDPOINT PHÂN TÍCH NHANH (AI gợi ý môn học, chưa lưu vào DB)
@router.post("/analyze-subject")
async def analyze_document_subject(file: UploadFile = File(...)):
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(temp_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Gọi hàm phân tích nhanh từ ContentAgent (chỉ đọc, không lưu)
        suggested_subject = content_agent.quick_analyze(file_path)
        
        return {
            "suggested_subject": suggested_subject,
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# 2. ENDPOINT LƯU CHÍNH THỨC (Người dùng đã xác nhận nhãn)
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    manual_subject: Optional[str] = Form(None) 
):
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(temp_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Ưu tiên nhãn thủ công từ giao diện gửi lên
        if manual_subject and manual_subject != "Tự động nhận diện":
            success = content_agent.process_file(file_path, manual_subject=manual_subject)
        else:
            success = content_agent.process_file(file_path)
        
        if success:
            final_subject = success.get("subject", "Khác")
            return {
                "filename": file.filename, 
                "subject": final_subject,
                "message": f"✅ Đã nạp tài liệu vào môn: {final_subject}"
            }
        else:
            raise HTTPException(status_code=500, detail="❌ Không thể xử lý tài liệu.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)