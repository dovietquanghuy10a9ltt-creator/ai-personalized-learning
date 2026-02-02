# backend/db/models.py
from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
from datetime import datetime

# 1. Bảng Hồ sơ tổng quan (Lưu trình độ hiện tại của người dùng theo môn học)
class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True) 
    current_level = Column(String, default="Beginner") 
    total_tests = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)

# 2. Bảng Lịch sử làm bài (Đã thêm các cột bị thiếu)
class AssessmentHistory(Base):
    __tablename__ = "assessment_history"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    score = Column(Float) # Điểm số (0-100)
    
    # 👇 ĐÃ BỔ SUNG 2 CỘT QUAN TRỌNG NÀY:
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    
    level_at_time = Column(String) # Level tại thời điểm thi
    timestamp = Column(DateTime, default=datetime.utcnow) 
    duration_seconds = Column(Integer) # Thời gian làm bài

# 3. Kho câu hỏi
class QuestionBank(Base):
    __tablename__ = "question_bank"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    difficulty = Column(String) # Beginner, Intermediate, Advanced
    content = Column(String)
    options = Column(JSON) # Lưu danh sách 4 lựa chọn [A, B, C, D]
    correct_answer = Column(String)
    explanation = Column(Text, nullable=True) 
    is_used = Column(Boolean, default=False)
    
    # Thêm bảng Chunk để lưu kiến thức RAG (nếu chưa có)
class Chunk(Base):
    __tablename__ = "chunks"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    subject = Column(String, index=True) # Lưu tên môn học (VD: Mạng máy tính)
    source_file = Column(String)

# 4. Kết quả đánh giá chi tiết
class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    score = Column(Float)
    wrong_topics = Column(Text, nullable=True) 
    timestamp = Column(DateTime(timezone=True), server_default=func.now())