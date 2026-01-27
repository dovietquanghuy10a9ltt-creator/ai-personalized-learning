from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from db.database import Base

# Bảng người dùng
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(String, default="learner")  # learner | teacher
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("LearnerProfile", back_populates="user", uselist=False)

# Bảng hồ sơ học viên
class LearnerProfile(Base):
    __tablename__ = "learner_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    level = Column(String)  # Beginner / Intermediate / Advanced

    user = relationship("User", back_populates="profile")

# Bảng lịch sử học tập
class LearningHistory(Base):
    __tablename__ = "learning_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    action = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Bảng kết quả đánh giá
class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    score_percent = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

