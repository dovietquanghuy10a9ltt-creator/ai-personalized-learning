import shutil
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from agents.content_agent import content_agent

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # 1. Tạo thư mục tạm để chứa file upload
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    # 2. Tạo đường dẫn file trên ổ cứng
    # Lưu ý: file.filename có thể chứa khoảng trắng hoặc ký tự lạ, nên xử lý kỹ nếu cần
    file_path = os.path.join(temp_dir, file.filename)
    
    try:
        # 3. Lưu file từ RAM (UploadFile) xuống Ổ cứng
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"📥 Đã lưu tạm file tại: {file_path}")

        # 4. Gọi Agent xử lý
        # QUAN TRỌNG: 
        # - Truyền vào 'file_path' (string) chứ không phải 'file' (object)
        # - Không dùng 'await' vì hàm process_file là hàm đồng bộ (synchronous)
        success = content_agent.process_file(file_path)
        
        if success:
            return {"filename": file.filename, "message": "✅ Upload và xử lý thành công!"}
        else:
            raise HTTPException(status_code=500, detail="❌ AI không đọc được nội dung file này.")

    except Exception as e:
        print(f"Lỗi: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
    
    finally:
        # 5. Dọn dẹp: Xóa file tạm sau khi xử lý xong (dù thành công hay thất bại)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Đã xóa file tạm: {file_path}")