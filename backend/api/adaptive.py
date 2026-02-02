# backend/api/adaptive.py
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from db.models import AssessmentHistory
from groq import Groq

# --- CẤU HÌNH GROQ ---
# Giữ nguyên Key của bạn (Key không bị thay đổi, chỉ có tên model thay đổi)
GROQ_API_KEY = ""  
client = Groq(api_key=GROQ_API_KEY)

router = APIRouter()

# --- MODEL DỮ LIỆU ---
class TutorChatRequest(BaseModel):
    subject: str
    message: str
    roadmap_context: str 

# --- API 1: PHÂN TÍCH LỖI SAI & ĐỀ XUẤT LỘ TRÌNH ---
@router.get("/recommend/{subject}")
def get_learning_recommendation(subject: str, db: Session = Depends(get_db)):
    # 1. Lấy bài kiểm tra gần nhất
    last_test = db.query(AssessmentHistory)\
        .filter(AssessmentHistory.subject == subject)\
        .order_by(AssessmentHistory.timestamp.desc())\
        .first()

    if not last_test:
        return {
            "analysis": "Chưa có dữ liệu để phân tích.",
            "roadmap": ["Hãy làm bài kiểm tra đầu tiên để AI biết trình độ của bạn."]
        }

    # 2. Kiểm tra xem có lỗi sai không
    if not last_test.wrong_detail or last_test.score == 100:
        return {
            "analysis": "Tuyệt vời! Bạn không làm sai câu nào trong bài kiểm tra gần nhất.",
            "roadmap": ["Duy trì phong độ", "Thử sức với các bài nâng cao hơn"]
        }

    # 3. Gửi lỗi sai cho Groq phân tích
    try:
        wrong_questions = json.loads(last_test.wrong_detail)
        
        prompt = f"""
        Bạn là Gia sư AI môn {subject}. Học viên vừa sai các câu sau:
        {json.dumps(wrong_questions, ensure_ascii=False)}

        Nhiệm vụ:
        1. Phân tích NGẮN GỌN nguyên nhân sai (hổng kiến thức gì?).
        2. Đề xuất 3 hành động cụ thể để khắc phục.

        BẮT BUỘC trả về JSON chuẩn format này (không giải thích thêm):
        {{
            "analysis": "Nội dung phân tích...",
            "roadmap": ["Bước 1...", "Bước 2...", "Bước 3..."]
        }}
        """
        
        # Gọi Llama 3.3 (Model mới nhất, thay thế cho model cũ bị lỗi)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Bạn là AI chỉ trả về kết quả dưới dạng JSON hợp lệ."},
                {"role": "user", "content": prompt}
            ],
            # 👇 ĐÃ ĐỔI TÊN MODEL MỚI NHẤT
            model="llama-3.3-70b-versatile", 
            temperature=0.3,
            response_format={"type": "json_object"} 
        )
        
        result_content = chat_completion.choices[0].message.content
        return json.loads(result_content)

    except Exception as e:
        print(f"❌ LỖI GROQ (RECOMMEND): {str(e)}") 
        # Fallback nếu lỗi
        return {
            "analysis": "Hệ thống ghi nhận bạn có lỗ hổng kiến thức cần ôn tập lại.",
            "roadmap": ["Xem lại lý thuyết chương này", "Làm lại bài kiểm tra"]
        }

# --- API 2: CHAT VỚI GIA SƯ ---
@router.post("/chat")
def chat_with_adaptive_tutor(req: TutorChatRequest, db: Session = Depends(get_db)):
    try:
        context_prompt = f"""
        Bạn là Gia sư AI môn {req.subject}.
        Tình trạng học viên: {req.roadmap_context}
        Câu hỏi: "{req.message}"
        Hãy trả lời ngắn gọn, thân thiện và đi thẳng vào vấn đề.
        """
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": context_prompt}],
            # 👇 ĐÃ ĐỔI TÊN MODEL MỚI NHẤT
            model="llama-3.1-8b-instant",
        )
        
        return {"reply": chat_completion.choices[0].message.content}
        
    except Exception as e:
        print(f"❌ LỖI CHAT GROQ: {str(e)}")
        return {"reply": f"Gặp lỗi khi gọi AI: {str(e)}"}
