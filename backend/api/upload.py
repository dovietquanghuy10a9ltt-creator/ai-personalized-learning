import shutil
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from agents.content_agent import content_agent 

router = APIRouter()

#Hàm phụ trợ: Kiểm tra đuôi file hợp lệ
def validate_file_extension(filename: str):
    allowed_extensions = {".pdf", ".docx", ".doc", ".pptx", ".txt"}
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File không hỗ trợ. Chỉ nhận: {', '.join(allowed_extensions)}")

@router.post("/analyze-subject")
async def analyze_document_subject(file: UploadFile = File(...)):
    # 1. Check đuôi file ngay lập tức
    validate_file_extension(file.filename) 
    
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    # 2. Xử lý tên file an toàn (giữ nguyên đuôi file)
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(temp_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Gọi Agent
        suggested_subject = content_agent.quick_analyze(file_path)
        
        return {
            "suggested_subject": suggested_subject,
            "filename": file.filename
        }
    except HTTPException as he:
        raise he # Ném lại lỗi 400 nếu sai đuôi file
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        raise HTTPException(status_code=500, detail="Lỗi xử lý file")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    manual_subject: Optional[str] = Form(None) 
):
    # Check đuôi file
    validate_file_extension(file.filename)
    
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(temp_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        if manual_subject and manual_subject != "Tự động nhận diện":
            result = content_agent.process_file(file_path, manual_subject=manual_subject)
        else:
            result = content_agent.process_file(file_path)
        
        if result and result.get("success"):
            return {
                "filename": file.filename, 
                "subject": result.get("subject", "Khác"),
                "message": f"✅ Đã nạp thành công tài liệu môn {result.get('subject')}"
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi xử lý nội dung")

    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)