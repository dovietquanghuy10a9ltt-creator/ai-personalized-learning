import os
from langchain_chroma import Chroma
from rag.embedder import embeddings 
from config import settings

# Đường dẫn lưu Database
ABS_PATH = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(ABS_PATH, "../chroma_db")

# Hàm 1: Lấy Database để tìm kiếm (Dùng cho Chat)
def get_vector_store():
    vector_store = Chroma(
        persist_directory=DB_DIR,
        embedding_function=embeddings
    )
    return vector_store

# Hàm 2: Lưu tài liệu vào Database
def add_documents_to_db(docs):
    vector_store = get_vector_store()
    vector_store.add_documents(docs)
    print(f"✅ Đã lưu {len(docs)} đoạn văn vào ChromaDB.")