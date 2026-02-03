from pydantic import BaseModel
from datetime import datetime

class LearningHistoryOut(BaseModel):
    action: str
    timestamp: datetime

    class Config:
        from_attributes = True
