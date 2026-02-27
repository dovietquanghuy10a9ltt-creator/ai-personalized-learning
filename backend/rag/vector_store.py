import os
from langchain_chroma import Chroma
from rag.embedder import embeddings 
from config import settings

# Đường dẫn lưu Database
ABS_PATH = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(ABS_PATH, "../chroma_db")

# Tên Collection cố định để quản lý dữ liệu tập trung
COLLECTION_NAME = "ai_learning_collection"

# Hàm 1: Lấy Database để tìm kiếm và Xóa
def get_vector_store():
    # Đảm bảo thư mục lưu trữ tồn tại
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
        
    vector_store = Chroma(
        persist_directory=DB_DIR,
        embedding_function=embeddings,
        collection_name=COLLECTION_NAME # Thêm tên collection cố định ở đây
    )
    return vector_store

# Hàm 2: Lưu tài liệu vào Database
def add_documents_to_db(docs):
    if not docs:
        return
        
    vector_store = get_vector_store()
    
    # Đảm bảo mỗi doc đều có metadata source là tên file để sau này xóa được
    vector_store.add_documents(docs)
    print(f"✅ Đã lưu {len(docs)} đoạn văn vào ChromaDB (Collection: {COLLECTION_NAME}).")