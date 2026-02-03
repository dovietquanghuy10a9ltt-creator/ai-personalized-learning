import os
import re
import json
from groq import Groq
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, UnstructuredPowerPointLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from rag.vector_store import get_vector_store

# Tải biến môi trường
load_dotenv()

class ContentAgent:
    def __init__(self):
        # 👇 SỬ DỤNG API KEY RIÊNG CHO CONTENT AGENT
        self.api_key = os.getenv("GROQ_KEY_CONTENT")
        if not self.api_key:
            raise ValueError("Cần cấu hình GROQ_KEY_CONTENT trong file .env")
            
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile"
        
        self.vector_store = get_vector_store()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Danh sách môn học chuẩn
        self.subjects = [
            "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương",
            "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++",
            "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu",
            "Kiến trúc máy tính", "Xác suất thống kê", "Toán học tính toán",
            "Mạng máy tính", "PP lập trình hướng đối tượng",
            "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
        ]

    def _detect_subject(self, text_sample: str, file_name: str):
        """
        Nhận diện môn học thông minh bằng API Groq riêng.
        """
        # 1. Ưu tiên kiểm tra nhanh qua tên file
        for s in self.subjects:
            if s.lower() in file_name.lower():
                return s

        # 2. Dùng AI nhận diện với bộ quy tắc phân loại
        prompt = f"""
        Bạn là chuyên gia phân loại tài liệu học thuật. 
        Xác định môn học phù hợp nhất từ danh sách: {', '.join(self.subjects)}

        QUY TẮC PHÂN LOẠI:
        - MẠNG MÁY TÍNH: OSI, TCP/IP, IP Address, Router, Switch, LAN, WAN, Topology.
        - CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT: Linked List, Stack, Queue, Tree, Graph, Big O.
        - PP LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG: Class, Object, Inheritance, Polymorphism.
        - GIẢI TÍCH: Đạo hàm, Tích phân, Vi phân.

        Nội dung trích dẫn: {text_sample[:4000]}

        CHỈ TRẢ VỀ TÊN MÔN HỌC CHÍNH XÁC. KHÔNG GIẢI THÍCH.
        """
        
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.1
            )
            detected_name = chat_completion.choices[0].message.content.strip()
            
            # Làm sạch chuỗi và đối soát
            detected_name = re.sub(r'[^\w\s\+]', '', detected_name)
            for s in self.subjects:
                if s.lower() in detected_name.lower():
                    return s
            return "Khác"
        except Exception as e:
            print(f"⚠️ Lỗi nhận diện môn học: {e}")
            return "Khác"

    def quick_analyze(self, file_path: str):
        """Phân tích nhanh để gợi ý môn học trên giao diện."""
        try:
            file_name = os.path.basename(file_path)
            loader = self._get_loader(file_path)
            if not loader: return "Khác"

            raw_documents = loader.load()
            text_sample = " ".join([doc.page_content for doc in raw_documents[:5]])
            return self._detect_subject(text_sample, file_name)
        except Exception as e:
            print(f"⚠️ Lỗi phân tích nhanh: {e}")
            return "Khác"

    def process_file(self, file_path: str, manual_subject: str = None):
        """Quy trình nạp tài liệu vào Vector Store."""
        try:
            file_name = os.path.basename(file_path)
            loader = self._get_loader(file_path)
            if not loader: return False

            raw_documents = loader.load()
            
            # Xác định môn học
            if manual_subject and manual_subject in self.subjects:
                detected_subject = manual_subject
            else:
                full_text_sample = " ".join([doc.page_content for doc in raw_documents[:10]])
                detected_subject = self._detect_subject(full_text_sample, file_name)

            for doc in raw_documents:
                doc.metadata["subject"] = detected_subject

            chunks = self.text_splitter.split_documents(raw_documents)
            
            if chunks:
                self.vector_store.add_documents(chunks)
                print(f"✅ Content Agent: Đã nạp {len(chunks)} đoạn vào môn {detected_subject}")
                return {"success": True, "subject": detected_subject}
            return False

        except Exception as e:
            print(f"❌ Lỗi xử lý file Content Agent: {e}")
            return False

    def _get_loader(self, file_path):
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == ".pdf": return PyPDFLoader(file_path)
        if file_ext == ".docx": return Docx2txtLoader(file_path)
        if file_ext == ".pptx": return UnstructuredPowerPointLoader(file_path)
        return None

content_agent = ContentAgent()