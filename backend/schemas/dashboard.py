from pydantic import BaseModel
from datetime import datetime


class AssessmentOut(BaseModel):
    score_percent: float
    created_at: datetime

    class Config:
        from_attributes = True


class LearningHistoryOut(BaseModel):
    action: str
    timestamp: datetime

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_assessments: int
    average_score: float
    last_score: float
    learning_actions: int


class DashboardOut(BaseModel):
    user_id: int
    current_level: str | None
    summary: DashboardSummary
    assessment_timeline: list[AssessmentOut]
    learning_history: list[LearningHistoryOut]
