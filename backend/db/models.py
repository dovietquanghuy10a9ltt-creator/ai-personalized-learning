from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
from datetime import datetime

# --- BẢNG NGƯỜI DÙNG ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) 
    full_name = Column(String)
    
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

    managed_classes = relationship("Classroom", back_populates="teacher", foreign_keys="[Classroom.teacher_id]")
    enrolled_class = relationship("Classroom", back_populates="students", foreign_keys=[class_id])
    uploaded_docs = relationship("Document", back_populates="uploader")
    assessment_histories = relationship("AssessmentHistory", back_populates="user")
    # Quan hệ với lộ trình học tập
    roadmaps = relationship("LearningRoadmap", back_populates="user")

# --- BẢNG LỚP HỌC ---
class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) 
    teacher_id = Column(Integer, ForeignKey("users.id"))

    teacher = relationship("User", back_populates="managed_classes", foreign_keys=[teacher_id])
    students = relationship("User", back_populates="enrolled_class", foreign_keys="[User.class_id]")
    documents = relationship("Document", back_populates="classroom")

# --- BẢNG QUẢN LÝ TÀI LIỆU ---
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True) 
    subject = Column(String, index=True) 
    upload_time = Column(DateTime, default=datetime.utcnow) 
    
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True) 

    uploader = relationship("User", back_populates="uploaded_docs")
    classroom = relationship("Classroom", back_populates="documents")

# --- BẢNG LỘ TRÌNH HỌC TẬP TỔNG THỂ (MỚI) ---
# Được sinh bởi Adaptive Agent sau khi Content Agent phân tích tài liệu
class LearningRoadmap(Base):
    __tablename__ = "learning_roadmaps"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String, index=True)
    
    # Trình độ được gán sau bài test đầu vào: Beginner, Intermediate, Advanced
    level_assigned = Column(String) 
    
    # Dữ liệu lộ trình do Adaptive Agent sinh ra (JSON list các sessions/topics)
    # Cấu trúc: [{"session": 1, "topic": "...", "description": "...", "status": "pending"}]
    roadmap_data = Column(JSON) 
    
    current_session = Column(Integer, default=1)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="roadmaps")

# --- CÁC BẢNG LƯU TRỮ HỌC TẬP ---

class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String, index=True) 
    # Cập nhật dựa trên luật: <40% Beginner, 40-70% Intermediate, >70% Advanced
    current_level = Column(String, default="Beginner") 
    total_tests = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)

class AssessmentHistory(Base):
    __tablename__ = "assessment_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String, index=True)
    score = Column(Float)
    
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    wrong_detail = Column(Text, nullable=True) 
    
    level_at_time = Column(String) 
    timestamp = Column(DateTime, default=datetime.utcnow) 
    duration_seconds = Column(Integer)

    user = relationship("User", back_populates="assessment_histories")

class QuestionBank(Base):
    __tablename__ = "question_bank"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    difficulty = Column(String, nullable=True) # <-- Đã cập nhật nullable=True
    content = Column(String)
    options = Column(JSON) 
    correct_answer = Column(String)
    explanation = Column(Text, nullable=True) 
    is_used = Column(Boolean, default=False)
    source_file = Column(String, index=True, nullable=True)

class Chunk(Base):
    __tablename__ = "chunks"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    subject = Column(String, index=True)
    source_file = Column(String)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)

class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String, index=True)
    score = Column(Float)
    wrong_topics = Column(Text, nullable=True) 
    timestamp = Column(DateTime(timezone=True), server_default=func.now())