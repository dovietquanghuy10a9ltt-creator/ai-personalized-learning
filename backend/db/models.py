# backend/db/models.py
from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
from datetime import datetime

# 1. Bảng Hồ sơ tổng quan
class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True) 
    current_level = Column(String, default="Beginner") 
    total_tests = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)

# 2. Bảng Lịch sử làm bài (Đã thêm wrong_detail)
class AssessmentHistory(Base):
    __tablename__ = "assessment_history"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    score = Column(Float) # Điểm số (0-100)
    
    # Các thông tin thống kê
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    
    # 👇 QUAN TRỌNG: Cột này lưu danh sách câu sai để Gia sư AI phân tích
    wrong_detail = Column(Text, nullable=True) 
    
    level_at_time = Column(String) 
    timestamp = Column(DateTime, default=datetime.utcnow) 
    duration_seconds = Column(Integer)

# 3. Kho câu hỏi
class QuestionBank(Base):
    __tablename__ = "question_bank"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    difficulty = Column(String) 
    content = Column(String)
    options = Column(JSON) 
    correct_answer = Column(String)
    explanation = Column(Text, nullable=True) 
    is_used = Column(Boolean, default=False)

# Bảng Chunk để lưu kiến thức RAG
class Chunk(Base):
    __tablename__ = "chunks"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    subject = Column(String, index=True)
    source_file = Column(String)

# 4. Kết quả đánh giá chi tiết (Có thể ít dùng nhưng cứ giữ lại nếu cần logic cũ)
class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    score = Column(Float)
    wrong_topics = Column(Text, nullable=True) 
    timestamp = Column(DateTime(timezone=True), server_default=func.now())