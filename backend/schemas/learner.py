from pydantic import BaseModel

class LearnerProfileCreate(BaseModel):
    level: str

class LearnerProfileOut(BaseModel):
    user_id: int
    level: str

    class Config:
        from_attributes = True
