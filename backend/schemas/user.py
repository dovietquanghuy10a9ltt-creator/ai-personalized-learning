from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    role: Optional[str] = "learner"

class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True
