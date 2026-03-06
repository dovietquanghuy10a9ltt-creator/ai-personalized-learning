import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse 
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from typing import Optional
from datetime import timedelta

# Import hàm lấy vector store
from rag.vector_store import get_vector_store 

router = APIRouter()

# ==========================================
# 1. API CHO GIÁO VIÊN: LẤY DANH SÁCH TÀI LIỆU
# ==========================================
@router.get("/class-documents/{class_id}")
def get_documents(
    class_id: int, 
    subject: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Lấy danh sách tài liệu của một lớp với múi giờ VN"""
    query = db.query(models.Document).filter(models.Document.class_id == class_id)
    
    if subject and subject != "all":
        query = query.filter(models.Document.subject == subject)
        
    docs = query.order_by(models.Document.upload_time.desc()).all()
    
    results = []
    for doc in docs:
        # FIX GIỜ VIỆT NAM (UTC+7)
        time_str = (doc.upload_time + timedelta(hours=7)).strftime("%H:%M - %d/%m/%Y") if doc.upload_time else "Chưa xác định"
        
        results.append({
            "id": doc.id,
            "title": doc.filename, 
            "subject": doc.subject,
            "file_path": f"temp_uploads/{doc.filename}", 
            "created_at": time_str 
        })
        
    return results

# ==========================================
# 2. API CHO GIÁO VIÊN: XÓA TÀI LIỆU
# ==========================================
@router.delete("/delete/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Xóa tài liệu hoàn toàn khỏi 3 nơi: File vật lý, ChromaDB và SQLite"""
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    filename = doc.filename

    # --- 1. XÓA FILE VẬT LÝ TRONG THƯ MỤC TEMP_UPLOADS ---
    if filename:
        file_path = os.path.join("temp_uploads", filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"✅ Đã dọn dẹp file vật lý: {file_path}")
            except Exception as e:
                print(f"❌ Lỗi khi xóa file vật lý: {e}")

    # --- 2. XÓA TRI THỨC TRONG CHROMADB ---
    try:
        vector_store = get_vector_store()
        
        # Lấy trực tiếp đối tượng Collection gốc của ChromaDB thay vì dùng vỏ bọc LangChain
        collection = vector_store._collection
        
        # Ép Collection phải trả về TOÀN BỘ dữ liệu metadatas (không bị limit)
        all_data = collection.get(include=["metadatas"])
        ids = all_data.get("ids", [])
        metadatas = all_data.get("metadatas", [])
        
        ids_to_delete = []
        for i, meta in enumerate(metadatas):
            if meta and "source" in meta:
                source_path = str(meta["source"])
                # Miễn là tên file có xuất hiện trong đường dẫn thì gom vào danh sách tử hình
                if filename in source_path:
                    ids_to_delete.append(ids[i])

        if ids_to_delete:
            # Lệnh xóa ép buộc từ Core ChromaDB
            collection.delete(ids=ids_to_delete)
            print(f"✅ Đã dọn dẹp sạch {len(ids_to_delete)} đoạn băm của {filename} trong ChromaDB")
        else:
            print(f"⚠️ Không tìm thấy tri thức của {filename} trong ChromaDB")
            
    except Exception as e:
        print(f"⚠️ Lỗi khi dọn dẹp ChromaDB: {e}")

    # --- 3. XÓA DỮ LIỆU TRONG SQLITE ---
    try:
        # Xóa các Chunks liên quan trong bảng chunks (nếu có)
        db.query(models.Chunk).filter(models.Chunk.source_file == filename).delete()
        
        # Xóa bản ghi trong bảng documents
        db.delete(doc)
        db.commit()
        return {"message": "Đã xóa tài liệu và tri thức AI thành công"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")

# ==========================================
# 3. API CHO HỌC SINH: LẤY DANH SÁCH TÀI LIỆU
# ==========================================
@router.get("/student/{user_id}")
def get_student_documents(user_id: int, subject: Optional[str] = None, db: Session = Depends(get_db)):
    """Lấy danh sách tài liệu dành cho học sinh dựa vào các lớp đã tham gia"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")

    # Lấy danh sách ID các lớp mà học sinh đang tham gia
    enrolled_class_ids = [c.id for c in getattr(user, 'enrolled_classes', [])]
    
    if not enrolled_class_ids:
        return []

    # Lấy tài liệu thuộc về các lớp đó
    query = db.query(models.Document).filter(models.Document.class_id.in_(enrolled_class_ids))
    
    # Nếu có chọn môn cụ thể thì lọc thêm theo môn
    if subject and subject != "Tất cả":
        query = query.filter(models.Document.subject == subject)
        
    docs = query.order_by(models.Document.id.desc()).all()
    
    result = []
    for doc in docs:
        time_str = (doc.upload_time + timedelta(hours=7)).strftime("%H:%M - %d/%m/%Y") if doc.upload_time else "Chưa xác định"
        result.append({
            "id": doc.id,
            "filename": doc.filename,
            "subject": doc.subject,
            "class_id": doc.class_id,
            "upload_time": time_str
        })
        
    return result

# ==========================================
# 4. API CHUNG: TẢI FILE VỀ MÁY (DOWNLOAD)
# ==========================================
@router.get("/download/{doc_id}")
def download_document(doc_id: int, db: Session = Depends(get_db)):
    """API cho phép tải file vật lý về thiết bị"""
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
        
    # Trỏ đúng vào thư mục temp_uploads theo logic lưu file
    file_path = os.path.join("temp_uploads", doc.filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File vật lý không tồn tại trên server")
        
    return FileResponse(
        path=file_path, 
        filename=doc.filename,
        media_type='application/octet-stream' # Ép trình duyệt tự động tải file xuống
    )