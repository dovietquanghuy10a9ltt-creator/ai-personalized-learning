# backend/agents/content_agent.py
import os
import json
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
        
        # DANH SÁCH 15 MÔN HỌC ĐẦY ĐỦ ĐỂ AI ĐỐI CHIẾU
        self.subjects = [
            "Vật lý", "Đại số tuyến tính", "Giải tích", "Tin học đại cương",
            "Chuyên đề giới thiệu ngành CNTT", "Ngôn ngữ lập trình C++",
            "Cấu trúc dữ liệu và giải thuật", "Hệ cơ sở dữ liệu",
            "Kiến trúc máy tính", "Xác suất thống kê", "Toán học tính toán",
            "Mạng máy tính", "PP lập trình hướng đối tượng",
            "Kỹ thuật truyền thông", "Cơ sở hệ điều hành"
        ]

    def _detect_subject(self, text_sample: str):
        """
        Dùng AI để tự nhận diện môn học và ÉP BUỘC phân biệt các môn khó
        """
        prompt = PromptTemplate(
            template="""
            Bạn là một chuyên gia phân loại tài liệu học thuật. 
            Dựa vào nội dung trích dẫn dưới đây, hãy xác định tài liệu này thuộc môn học nào 
            trong danh sách: {subject_list}

            LƯU Ý PHÂN BIỆT QUAN TRỌNG:
            1. Nếu thấy: Class, Object, Kế thừa (Inheritance), Đa hình (Polymorphism) 
               -> Chọn "PP lập trình hướng đối tượng".
            2. Nếu thấy: Danh sách liên kết (Linked List), Ngăn xếp (Stack), Hàng đợi (Queue), 
               Cây (Tree), Đồ thị (Graph), Thuật toán sắp xếp (Sorting) 
               -> Chọn "Cấu trúc dữ liệu và giải thuật".
            3. Nếu thấy: Đạo hàm, Tích phân, Chuỗi -> Chọn "Giải tích".

            Nội dung trích dẫn: {sample}

            CHỈ TRẢ VỀ TÊN MÔN HỌC CHÍNH XÁC CÓ TRONG DANH SÁCH. KHÔNG GIẢI THÍCH THÊM.
            Tên môn học:
            """,
            input_variables=["subject_list", "sample"]
        )
        
        chain = prompt | llm
        try:
            # Lấy 3000 ký tự để AI có đủ dữ liệu phân tích sâu hơn
            response = chain.invoke({
                "subject_list": ", ".join(self.subjects),
                "sample": text_sample[:3000]
            })
            detected_name = response.content.strip() if hasattr(response, 'content') else str(response).strip()
            
            # So khớp chính xác với danh sách
            for s in self.subjects:
                if s.lower() in detected_name.lower():
                    return s
            return "Khác"
        except Exception as e:
            print(f"⚠️ Lỗi nhận diện môn học: {e}")
            return "Khác"

    def process_file(self, file_path: str):
        """
        Quy trình xử lý: Load -> Detect Subject -> Tag Metadata -> Split -> Save
        """
        try:
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext == ".pdf":
                loader = PyPDFLoader(file_path)
            elif file_ext == ".docx":
                loader = Docx2txtLoader(file_path)
            elif file_ext == ".pptx":
                loader = UnstructuredPowerPointLoader(file_path, mode="elements")
            else:
                return False

            raw_documents = loader.load()
            
            # Lấy nội dung văn bản để AI nhận diện môn học
            full_text_sample = " ".join([doc.page_content for doc in raw_documents[:5]])

            # --- BƯỚC TỰ NHẬN DIỆN MÔN HỌC ---
            detected_subject = self._detect_subject(full_text_sample)
            print(f"🤖 AI nhận diện tài liệu '{os.path.basename(file_path)}' thuộc môn: {detected_subject}")

            # Gắn nhãn môn học vào Metadata của từng chunk để Adaptive Agent có thể lọc (filter)
            for doc in raw_documents:
                doc.metadata["subject"] = detected_subject

            chunks = self.text_splitter.split_documents(raw_documents)
            
            if chunks:
                self.vector_store.add_documents(chunks)
                print(f"✅ Đã lưu {len(chunks)} đoạn văn bản vào Database với nhãn: {detected_subject}")
                return {"success": True, "subject": detected_subject}
            return False

        except Exception as e:
            print(f"❌ Lỗi xử lý file: {e}")
            return False

content_agent = ContentAgent()