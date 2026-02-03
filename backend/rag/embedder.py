# backend/rag/embedder.py
from langchain_community.embeddings import HuggingFaceEmbeddings

# Sử dụng model 'all-MiniLM-L6-v2': Nhẹ, chuẩn quốc tế, chạy offline
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")