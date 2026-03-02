import shutil
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional, List
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from agents.content_agent import content_agent 
from rag.vector_store import get_vector_store

router = APIRouter()

# --- HÀM PHỤ TRỢ ---
def validate_file_extension(filename: str):
    allowed_extensions = {".pdf", ".docx", ".doc", ".pptx", ".txt"}
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File không hỗ trợ. Chỉ nhận: {', '.join(allowed_extensions)}")

# --- API 1: PHÂN TÍCH MÔN HỌC ---
@router.post("/analyze-subject")
async def analyze_document_subject(file: UploadFile = File(...)):
    validate_file_extension(file.filename) 
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(temp_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        suggested_subject = content_agent.quick_analyze(file_path)
        return {"suggested_subject": suggested_subject, "filename": safe_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# --- API 2: UPLOAD VÀ LƯU DATABASE ---
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    manual_subject: Optional[str] = Form(None),
    teacher_id: Optional[int] = Form(None),
    class_id: Optional[int] = Form(None), 
    db: Session = Depends(get_db)
):
    validate_file_extension(file.filename)
    
    if not class_id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn một lớp học để nạp tài liệu.")

    safe_filename = file.filename.replace(" ", "_")
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Xử lý RAG thông qua Content Agent
        if manual_subject and manual_subject != "Tự động nhận diện":
            result = content_agent.process_file(file_path, manual_subject=manual_subject)
        else:
            result = content_agent.process_file(file_path)
        
        if result and result.get("success"):
            final_subject = result.get("subject", "Khác")
            
            # Lưu thông tin tài liệu vào SQL kèm class_id
            new_doc = models.Document(
                filename=safe_filename, 
                subject=final_subject,
                teacher_id=teacher_id,
                class_id=class_id # <--- GẮN TÀI LIỆU VÀO LỚP CỤ THỂ
            )
            db.add(new_doc)
            db.commit()
            db.refresh(new_doc)

            return {
                "id": new_doc.id,
                "filename": safe_filename, 
                "subject": final_subject,
                "class_id": class_id,
                "message": f"✅ Tài liệu đã được nạp riêng cho lớp học này."
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi xử lý nội dung RAG")

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # if os.path.exists(file_path):
        #     os.remove(file_path)
        pass

# --- API 3: LẤY DANH SÁCH FILE CỦA GIÁO VIÊN/LỚP ---
@router.get("/documents")
async def get_documents(teacher_id: Optional[int] = None, class_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Document)
    
    if class_id:
        query = query.filter(models.Document.class_id == class_id)
    elif teacher_id:
        query = query.filter(models.Document.teacher_id == teacher_id)
        
    docs = query.order_by(models.Document.upload_time.desc()).all()
    return docs

# --- API 4: XÓA TÀI LIỆU TRIỆT ĐỂ ---
@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu.")

    try:
        filename = doc.filename
        vector_store = get_vector_store()
        
        # Quét và xóa trong Vector DB
        all_data = vector_store.get()
        ids = all_data.get("ids", [])
        metadatas = all_data.get("metadatas", [])
        
        ids_to_delete = []
        for i, meta in enumerate(metadatas):
            if any(filename in str(val) for val in meta.values()):
                ids_to_delete.append(ids[i])

        if ids_to_delete:
            vector_store.delete(ids=ids_to_delete)

        # Xóa trong SQL (Chunks và Document)
        db.query(models.Chunk).filter(models.Chunk.source_file == filename).delete()
        db.delete(doc)
        
        db.commit()
        return {"message": f"✅ Đã dọn dẹp sạch sẽ tri thức của: {filename}"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa: {str(e)}")