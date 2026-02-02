# backend/agents/content_agent.py
import os
import re
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, UnstructuredPowerPointLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import PromptTemplate
from rag.vector_store import get_vector_store
from rag.llm import llm 

class ContentAgent:
    def __init__(self):
        self.vector_store = get_vector_store()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Danh sách môn học chuẩn để đối soát cứng
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
        Nhận diện môn học thông minh dựa trên: Tên file + Từ khóa đặc trưng + AI
        """
        # 1. Ưu tiên kiểm tra nhanh qua tên file
        for s in self.subjects:
            if s.lower() in file_name.lower():
                return s

        # 2. Dùng AI nhận diện với bộ quy tắc phân loại chặt chẽ
        prompt = PromptTemplate(
            template="""
            Bạn là chuyên gia phân loại tài liệu học thuật. 
            Xác định môn học phù hợp nhất từ danh sách: {subject_list}

            QUY TẮC PHÂN LOẠI (ƯU TIÊN CAO NHẤT):
            - MẠNG MÁY TÍNH: OSI, TCP/IP, IP Address, Router, Switch, LAN, WAN, Topology, HTTP, DNS, Ethernet.
            - CẤU TRÚC DỮ LIỆU VÀ GIẢI THUẬT: Linked List, Stack, Queue, Tree, Graph, Sorting, Big O, Đồ thị.
            - PP LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG: Class, Object, Inheritance, Polymorphism, Encapsulation.
            - GIẢI TÍCH: Đạo hàm, Tích phân, Chuỗi, Vi phân, Hàm số.
            - CƠ SỞ HỆ ĐIỀU HÀNH: Process, Thread, Deadlock, Memory Management, Scheduling, Shell.

            Nội dung trích dẫn: {sample}

            CHỈ TRẢ VỀ TÊN MÔN HỌC CHÍNH XÁC CÓ TRONG DANH SÁCH. KHÔNG GIẢI THÍCH.
            Tên môn học:
            """,
            input_variables=["subject_list", "sample"]
        )
        
        try:
            response = (prompt | llm).invoke({
                "subject_list": ", ".join(self.subjects),
                "sample": text_sample[:4000]
            })
            detected_name = response.content.strip() if hasattr(response, 'content') else str(response).strip()
            
            # Làm sạch chuỗi và đối soát với danh sách chuẩn
            detected_name = re.sub(r'[^\w\s\+]', '', detected_name)
            for s in self.subjects:
                if s.lower() in detected_name.lower():
                    return s
            return "Khác"
        except Exception as e:
            print(f"⚠️ Lỗi nhận diện môn học: {e}")
            return "Khác"

    def quick_analyze(self, file_path: str):
        """
        Đọc nhanh tài liệu và gợi ý môn học, không thực hiện lưu trữ vào DB.
        Sử dụng cho bước 'AI gợi ý' trên giao diện.
        """
        try:
            file_name = os.path.basename(file_path)
            file_ext = os.path.splitext(file_name)[1].lower()
            
            # Khởi tạo loader phù hợp (chỉ load 5 trang đầu để phân tích nhanh)
            if file_ext == ".pdf":
                loader = PyPDFLoader(file_path)
            elif file_ext == ".docx":
                loader = Docx2txtLoader(file_path)
            elif file_ext == ".pptx":
                loader = UnstructuredPowerPointLoader(file_path)
            else:
                return "Khác"

            raw_documents = loader.load()
            
            # Lấy mẫu văn bản từ 5 trang đầu để AI đoán nhanh
            text_sample = " ".join([doc.page_content for doc in raw_documents[:5]])
            
            return self._detect_subject(text_sample, file_name)
        except Exception as e:
            print(f"⚠️ Lỗi phân tích nhanh: {e}")
            return "Khác"

    def process_file(self, file_path: str, manual_subject: str = None):
        """
        Quy trình xử lý chính: Chia nhỏ và lưu trữ vào Vector Store.
        Ưu tiên nhãn thủ công đã được người dùng xác nhận.
        """
        try:
            file_name = os.path.basename(file_path)
            file_ext = os.path.splitext(file_name)[1].lower()
            
            if file_ext == ".pdf":
                loader = PyPDFLoader(file_path)
            elif file_ext == ".docx":
                loader = Docx2txtLoader(file_path)
            elif file_ext == ".pptx":
                loader = UnstructuredPowerPointLoader(file_path)
            else:
                return False

            raw_documents = loader.load()
            
            # Nếu người dùng đã xác nhận/chọn lại nhãn, dùng nhãn đó.
            if manual_subject and manual_subject in self.subjects:
                detected_subject = manual_subject
                print(f"🎯 [Xác nhận] Gán nhãn '{detected_subject}' cho tài liệu: {file_name}")
            else:
                # Nếu không, AI tự nhận diện chính xác qua 10 trang đầu
                full_text_sample = " ".join([doc.page_content for doc in raw_documents[:10]])
                detected_subject = self._detect_subject(full_text_sample, file_name)
                print(f"🤖 [Tự động] AI nhận diện: {detected_subject}")

            for doc in raw_documents:
                doc.metadata["subject"] = detected_subject

            chunks = self.text_splitter.split_documents(raw_documents)
            
            if chunks:
                self.vector_store.add_documents(chunks)
                print(f"✅ Đã nạp {len(chunks)} đoạn vào môn: {detected_subject}")
                return {"success": True, "subject": detected_subject}
            return False

        except Exception as e:
            print(f"❌ Lỗi xử lý file '{file_path}': {e}")
            return False

content_agent = ContentAgent()