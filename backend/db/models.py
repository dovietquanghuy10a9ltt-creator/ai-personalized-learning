from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Boolean,Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
from datetime import datetime

# 1. Bảng Hồ sơ tổng quan (Lưu Level hiện tại)
class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True) 
    current_level = Column(String, default="Beginner") 
    total_tests = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)

# 2. Bảng Lịch sử làm bài (Dữ liệu cho Evaluation Agent phân tích)
class AssessmentHistory(Base):
    __tablename__ = "assessment_history"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    score = Column(Float) # Điểm số (0-100)
    level_at_time = Column(String) # Level tại thời điểm thi
    timestamp = Column(DateTime, default=datetime.utcnow) # Thời gian nộp bài
    duration_seconds = Column(Integer) # Thời gian làm bài (để tính nỗ lực)
    
# 3. Kho câu hỏi (Giữ nguyên)
class QuestionBank(Base):
    __tablename__ = "question_bank"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    difficulty = Column(String)
    content = Column(String)
    options = Column(JSON)
    correct_answer = Column(String)
    is_used = Column(Boolean, default=False)
    
class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    score = Column(Float)
    
    # Cột này để lưu danh sách các chủ đề học viên làm sai
    # Ví dụ: "Linked List, Stack Overflow, Binary Tree"
    wrong_topics = Column(Text, nullable=True) 
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())    