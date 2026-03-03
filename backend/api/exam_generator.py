# File: backend/api/exam_generator.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import unicodedata 
import json
import io
import random
import copy
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

from db.database import get_db
from db import models
from groq import Groq
import os
from rag.vector_store import get_vector_store

router = APIRouter()

class ExamRequest(BaseModel):
    class_id: int
    subject: str
    exam_type: str # "trắc nghiệm" hoặc "tự luận"
    num_questions: int
    num_versions: int # TÍNH NĂNG MỚI: Số lượng mã đề
    level: str 

def create_exam_header(doc, subject, exam_type, exam_code):
    """Hàm tạo Header chuẩn form Trường Đại học Xây Dựng Hà Nội"""
    # Tạo bảng vô hình 1 dòng 2 cột để căn lề 2 bên
    table = doc.add_table(rows=1, cols=2)
    table.autofit = True
    
    # Cột trái: Tên trường & Khoa
    cell_left = table.cell(0, 0)
    p_left1 = cell_left.paragraphs[0]
    p_left1.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    run_left1 = p_left1.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO\nTRƯỜNG ĐẠI HỌC XÂY DỰNG HÀ NỘI")
    run_left1.font.size = Pt(11)
    
    p_left2 = cell_left.add_paragraph()
    p_left2.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    run_left2 = p_left2.add_run("KHOA CÔNG NGHỆ THÔNG TIN")
    run_left2.font.size = Pt(12)
    run_left2.bold = True
    
    p_left3 = cell_left.add_paragraph()
    p_left3.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    p_left3.add_run("-----------------------").bold = True

    # Cột phải: Quốc hiệu
    cell_right = table.cell(0, 1)
    p_right1 = cell_right.paragraphs[0]
    p_right1.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    run_right1 = p_right1.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")
    run_right1.font.size = Pt(11)
    run_right1.bold = True
    
    p_right2 = cell_right.add_paragraph()
    p_right2.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    run_right2 = p_right2.add_run("Độc lập - Tự do - Hạnh phúc")
    run_right2.font.size = Pt(12)
    run_right2.bold = True
    
    p_right3 = cell_right.add_paragraph()
    p_right3.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    p_right3.add_run("-----------------------").bold = True

    doc.add_paragraph() # Dòng trống
    
    # Tiêu đề bài thi
    p_title = doc.add_paragraph()
    p_title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    run_title = p_title.add_run("ĐỀ THI KẾT THÚC HỌC PHẦN")
    run_title.font.size = Pt(16)
    run_title.bold = True

    # Thông tin cơ bản học sinh điền
    p_info = doc.add_paragraph()
    p_info.add_run(f"Môn thi: ").bold = True
    p_info.add_run(f"{subject}\n")
    p_info.add_run(f"Hình thức thi: ").bold = True
    p_info.add_run(f"{exam_type.title()}\n")
    p_info.add_run(f"Mã đề thi: ").bold = True
    p_info.add_run(f"{exam_code}\n")
    p_info.add_run("Họ và tên sinh viên: ..................................................... MSSV: ............................... Lớp: ..................")
    
    doc.add_paragraph("--------------------------------------------------------------------------------------------------------------------------")

def remove_accents(input_str):
    """Hàm loại bỏ dấu tiếng Việt để tránh lỗi Unicode header"""
    # Xử lý riêng chữ đ và Đ vì unicodedata không tự tách được
    s = input_str.replace('đ', 'd').replace('Đ', 'D')
    nfkd_form = unicodedata.normalize('NFKD', s)
    return u"".join([c for c in nfkd_form if not unicodedata.combining(c)])

@router.post("/generate-word")
def generate_exam_word(req: ExamRequest, db: Session = Depends(get_db)):
    # 1. RAG - Lấy tài liệu
    docs = db.query(models.Document).filter(
        models.Document.class_id == req.class_id,
        models.Document.subject == req.subject
    ).all()
    allowed_filenames = [doc.filename for doc in docs]
    
    context_summary = "Sử dụng kiến thức chuyên ngành chuẩn xác."
    if allowed_filenames:
        try:
            vector_store = get_vector_store()
            search_results = vector_store.similarity_search(
                f"Kiến thức trọng tâm môn {req.subject}", k=15, filter={"source": {"$in": allowed_filenames}}
            )
            context_summary = "\n".join([d.page_content for d in search_results])
        except:
            pass

    # 2. PROMPT CHO AI TẠO BỘ CÂU HỎI GỐC
    api_key = os.getenv("GROQ_KEY_ADAPTIVE")
    client = Groq(api_key=api_key)
    
    if req.exam_type == "trắc nghiệm":
        prompt = f"""Soạn {req.num_questions} câu hỏi TRẮC NGHIỆM môn {req.subject}. Mức độ: {req.level}.
        Tài liệu: {context_summary[:3000]}
        Đầu ra BẮT BUỘC là JSON: {{"questions": [{{"q": "Câu hỏi?", "options": ["A. x", "B. y", "C. z", "D. w"], "ans": "A", "exp": "Giải thích"}}]}}"""
    else:
        prompt = f"""Soạn {req.num_questions} câu hỏi TỰ LUẬN môn {req.subject}. Mức độ: {req.level}.
        Tài liệu: {context_summary[:3000]}
        Đầu ra JSON: {{"questions": [{{"q": "Câu hỏi tự luận?", "ans": "Đáp án/Bareme", "exp": "Gợi ý"}}]}}"""

    # 3. GỌI AI
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": "Output valid JSON only."}, {"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant", temperature=0.3, max_tokens=5000, response_format={"type": "json_object"}
        )
        ai_data = json.loads(chat_completion.choices[0].message.content)
        base_questions = ai_data.get("questions", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi AI sinh đề: {str(e)}")

    doc = Document()
    exam_versions = []

    # =========================================================
    # 4. THUẬT TOÁN TRỘN ĐỀ VÀ TẠO FILE WORD
    # =========================================================
    for v in range(req.num_versions):
        exam_code = str(random.randint(101, 999))
        
        # Clone bộ câu hỏi gốc để xáo trộn mà không làm hỏng bộ gốc
        shuffled_qs = copy.deepcopy(base_questions)
        random.shuffle(shuffled_qs) # Trộn thứ tự câu hỏi
        
        exam_versions.append({"code": exam_code, "questions": shuffled_qs})
        
        # --- VẼ GIAO DIỆN ĐỀ THI VÀO WORD ---
        create_exam_header(doc, req.subject, req.exam_type, exam_code)

        for i, q in enumerate(shuffled_qs):
            p = doc.add_paragraph()
            p.add_run(f'Câu {i+1}: ').bold = True
            p.add_run(q.get('q', ''))
            
            if req.exam_type == "trắc nghiệm":
                # Trộn luôn cả đáp án A, B, C, D bên trong mỗi câu
                options = q.get('options', [])
                correct_opt_text = ""
                # Tìm text của đáp án đúng để sau khi trộn biết nó nằm ở đâu
                for opt in options:
                    if opt.startswith(q.get('ans', '')):
                        correct_opt_text = opt[3:].strip()
                
                random.shuffle(options) # Trộn options
                
                labels = ['A', 'B', 'C', 'D']
                new_correct_label = ""
                for idx, opt in enumerate(options):
                    clean_opt_text = opt[3:].strip()
                    if clean_opt_text == correct_opt_text:
                        new_correct_label = labels[idx]
                        
                    doc.add_paragraph(f"{labels[idx]}. {clean_opt_text}", style='List Bullet')
                
                # Lưu lại đáp án mới vào để tí nữa in ra phiếu soi đáp án
                q['new_ans'] = new_correct_label
            else:
                for _ in range(4): doc.add_paragraph("................................................................................................................................")
            doc.add_paragraph()
            
        doc.add_page_break() # Hết 1 mã đề thì ngắt sang trang mới

    # =========================================================
    # 5. VẼ ĐÁP ÁN CHO GIÁO VIÊN
    # =========================================================
    ans_heading = doc.add_heading('HƯỚNG DẪN CHẤM & ĐÁP ÁN CHI TIẾT', 1)
    ans_heading.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
    doc.add_paragraph()

    for version in exam_versions:
        doc.add_paragraph(f"MÃ ĐỀ: {version['code']}").bold = True
        
        if req.exam_type == "trắc nghiệm":
            # Tạo bảng hiển thị đáp án nhanh (Giống form thi đại học)
            table = doc.add_table(rows=1, cols=6)
            table.style = 'Table Grid'
            hdr_cells = table.rows[0].cells
            for i in range(6): hdr_cells[i].text = 'Câu - Đáp án'
            
            row_cells = table.add_row().cells
            col_idx = 0
            for i, q in enumerate(version['questions']):
                if col_idx > 5:
                    row_cells = table.add_row().cells
                    col_idx = 0
                row_cells[col_idx].text = f"Câu {i+1}: {q.get('new_ans', q.get('ans'))}"
                col_idx += 1
            doc.add_paragraph()
        else:
            for i, q in enumerate(version['questions']):
                p = doc.add_paragraph()
                p.add_run(f'Câu {i+1}: ').bold = True
                doc.add_paragraph(q.get('ans', ''))
                doc.add_paragraph(f"Gợi ý chấm: {q.get('exp', '')}").italic = True
        doc.add_paragraph("----------------------------------------------------------------")

    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)

    # --- SỬA LỖI UNICODE TÊN FILE BẰNG CÁCH XÓA DẤU TIẾNG VIỆT ---
    clean_subject = remove_accents(req.subject).replace(' ', '')
    clean_exam_type = remove_accents(req.exam_type).replace(' ', '')
    filename = f"DeThi_{clean_subject}_{clean_exam_type}.docx"
    
    return StreamingResponse(
        file_stream, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )