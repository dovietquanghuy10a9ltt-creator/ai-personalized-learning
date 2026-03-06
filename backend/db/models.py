from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Boolean, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base
from datetime import datetime

# --- BẢNG TRUNG GIAN: QUẢN LÝ SINH VIÊN JOIN NHIỀU LỚP ---
enrollment_table = Table(
    "enrollments",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("class_id", Integer, ForeignKey("classrooms.id"), primary_key=True)
)

# --- BẢNG NGƯỜI DÙNG ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="student") 
    full_name = Column(String)
    
    # MSSV ĐỂ GIÁO VIÊN PHÂN BIỆT SINH VIÊN
    student_id = Column(String, unique=True, index=True, nullable=True)

    managed_classes = relationship("Classroom", back_populates="teacher", foreign_keys="[Classroom.teacher_id]")
    
    # QUAN HỆ N-N: SINH VIÊN VÀ LỚP HỌC
    enrolled_classes = relationship("Classroom", secondary=enrollment_table, back_populates="students")
    
    uploaded_docs = relationship("Document", back_populates="uploader")
    assessment_histories = relationship("AssessmentHistory", back_populates="user")
    roadmaps = relationship("LearningRoadmap", back_populates="user")
    
    # QUAN HỆ ĐỂ TÍNH EFFORT SCORE (THỜI GIAN HỌC)
    study_sessions = relationship("StudySession", back_populates="user")

# --- BẢNG LỚP HỌC ---
class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) 
    
    # MÔN HỌC VÀ MÃ CODE LỚP HỌC
    subject = Column(String, index=True)
    class_code = Column(String, unique=True, index=True)
    
    teacher_id = Column(Integer, ForeignKey("users.id"))

    teacher = relationship("User", back_populates="managed_classes", foreign_keys=[teacher_id])
    
    # QUAN HỆ N-N: LỚP HỌC VÀ SINH VIÊN
    students = relationship("User", secondary=enrollment_table, back_populates="enrolled_classes")
    documents = relationship("Document", back_populates="classroom")

# --- BẢNG QUẢN LÝ TÀI LIỆU ---
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)          
    file_path = Column(String)                  
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 
    
    filename = Column(String, index=True) 
    subject = Column(String, index=True) 
    upload_time = Column(DateTime, default=datetime.utcnow) 
    
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True) 

    uploader = relationship("User", back_populates="uploaded_docs")
    classroom = relationship("Classroom", back_populates="documents")

# --- BẢNG LỘ TRÌNH HỌC TẬP TỔNG THỂ ---
class LearningRoadmap(Base):
    __tablename__ = "learning_roadmaps"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String, index=True)
    
    level_assigned = Column(String) 
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
    current_level = Column(String, default="Beginner") 
    total_tests = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)

# BẢNG NÀY ĐỂ TÍNH EFFORT SCORE (LƯU THỜI GIAN VÀ SỐ PHIÊN HỌC)
class StudySession(Base):
    __tablename__ = "study_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String, index=True)
    
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=0) # Thời gian học thực tế của phiên này
    
    user = relationship("User", back_populates="study_sessions")

class AssessmentHistory(Base):
    __tablename__ = "assessment_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String, index=True)
    score = Column(Float)
    
    # CỘT NÀY ĐỂ PHÂN BIỆT LOẠI BÀI KIỂM TRA
    # Có thể là: "baseline" (đánh giá đầu vào), "chapter" (bài qua bài), "final" (bài cuối kỳ)
    test_type = Column(String, default="chapter", index=True) 
    
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
    difficulty = Column(String, nullable=True) 
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