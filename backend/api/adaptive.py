from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from db import models # Import models để truy vấn thông tin lớp
from agents.adaptive_agent import AdaptiveAgent

router = APIRouter()

# --- MODEL DỮ LIỆU ---
class TutorChatRequest(BaseModel):
    subject: str
    message: str
    roadmap_context: str 
    user_id: int # Bắt buộc gửi user_id từ frontend để biết học sinh thuộc lớp nào

# --- PHÂN TÍCH LỖI SAI & ĐỀ XUẤT LỘ TRÌNH ---
@router.get("/recommend/{subject}")
def get_learning_recommendation(subject: str, db: Session = Depends(get_db)):
    try:
        agent = AdaptiveAgent(db)
        result = agent.generate_learning_path(subject)
        
        if not result:
            return {
                "analysis": "Hệ thống ghi nhận bạn có lỗ hổng kiến thức cần ôn tập lại.",
                "roadmap": ["Xem lại lý thuyết chương này", "Làm lại bài kiểm tra để AI đánh giá lại"]
            }
            
        return result
    except Exception as e:
        print(f"❌ LỖI API RECOMMEND: {str(e)}")
        raise HTTPException(status_code=500, detail="Không thể tạo lộ trình học tập lúc này.")

# --- CHAT VỚI GIA SƯ (ĐÃ CẬP NHẬT LỌC THEO LỚP) ---
@router.post("/chat")
def chat_with_adaptive_tutor(req: TutorChatRequest, db: Session = Depends(get_db)):
    """
    API điều phối: Tìm danh sách tài liệu của lớp học sinh đang tham gia
    và yêu cầu Agent chỉ tìm kiếm trong các file đó.
    """
    try:
        # 1. Tìm học sinh để lấy class_id
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
        
        if not user.class_id:
            return {"reply": "Bạn chưa tham gia lớp học nào. Vui lòng nhập mã lớp để bắt đầu học với tài liệu của giáo viên."}

        # 2. Tìm danh sách file (Document) được gán cho class_id này
        allowed_docs = db.query(models.Document).filter(models.Document.class_id == user.class_id).all()
        
        # Chuyển thành danh sách tên file để dùng làm bộ lọc cho ChromaDB
        allowed_filenames = [doc.filename for doc in allowed_docs]

        if not allowed_filenames:
            return {"reply": "Giáo viên lớp bạn hiện chưa tải tài liệu giảng dạy lên hệ thống cho lớp này."}

        # 3. Khởi tạo Agent
        agent = AdaptiveAgent(db)
        
        # 4. Gọi hàm chat và truyền thêm tham số allowed_filenames
        response = agent.chat_with_tutor(
            subject=req.subject, 
            user_message=req.message, 
            roadmap_context=req.roadmap_context,
            allowed_filenames=allowed_filenames # Đây là chìa khóa để AI nhìn đúng lớp
        )
        
        return {"reply": response}
        
    except Exception as e:
        print(f"❌ LỖI API CHAT: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"reply": "Gia sư AI đang bận xử lý dữ liệu lớp học, vui lòng thử lại sau."}