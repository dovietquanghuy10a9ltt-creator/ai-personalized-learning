import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from typing import Optional
from datetime import timedelta

# Import hàm lấy vector store từ chính module RAG của bạn
from rag.vector_store import get_vector_store 

router = APIRouter()

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

    # --- 2. XÓA TRI THỨC TRONG CHROMADB (Chọc thẳng vào Lõi) ---
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