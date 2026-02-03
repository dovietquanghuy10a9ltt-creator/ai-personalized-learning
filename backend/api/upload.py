import shutil
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from agents.content_agent import content_agent # Gọi Content Agent đã nâng cấp

router = APIRouter()

# 1. ENDPOINT PHÂN TÍCH NHANH (AI gợi ý môn học bằng GROQ_KEY_CONTENT)
@router.post("/analyze-subject")
async def analyze_document_subject(file: UploadFile = File(...)):
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Làm sạch tên file để tránh lỗi hệ thống
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(temp_dir, safe_filename)
    
    try:
        # Lưu file tạm thời để Content Agent có thể đọc
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # TƯƠNG TÁC AGENT: Gọi ContentAgent thực hiện nhận diện môn học thông minh
        suggested_subject = content_agent.quick_analyze(file_path)
        
        return {
            "suggested_subject": suggested_subject,
            "filename": file.filename
        }
    except Exception as e:
        print(f"❌ Lỗi tại API Analyze: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích tài liệu: {str(e)}")
    finally:
        # Luôn xóa file tạm sau khi phân tích xong
        if os.path.exists(file_path):
            os.remove(file_path)

# 2. ENDPOINT LƯU CHÍNH THỨC (Nạp dữ liệu vào Vector Store)
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
            
        # TƯƠNG TÁC AGENT: Content Agent thực hiện chia nhỏ (chunking) và gắn nhãn môn học
        # Nếu người dùng chọn nhãn thủ công, Agent sẽ ưu tiên nhãn đó
        if manual_subject and manual_subject != "Tự động nhận diện":
            result = content_agent.process_file(file_path, manual_subject=manual_subject)
        else:
            result = content_agent.process_file(file_path)
        
        if result and result.get("success"):
            final_subject = result.get("subject", "Khác")
            return {
                "filename": file.filename, 
                "subject": final_subject,
                "message": f"✅ Thành công: Tài liệu đã được nạp vào kho tri thức môn {final_subject}"
            }
        else:
            raise HTTPException(status_code=500, detail="❌ Content Agent không thể xử lý cấu trúc tài liệu này.")

    except Exception as e:
        print(f"❌ Lỗi tại API Upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")
    finally:
        # Dọn dẹp file tạm để tiết kiệm bộ nhớ server
        if os.path.exists(file_path):
            os.remove(file_path)