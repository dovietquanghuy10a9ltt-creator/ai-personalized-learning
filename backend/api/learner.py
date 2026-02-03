from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db import crud
from schemas.user import UserCreate, UserOut
from schemas.learner import LearnerProfileCreate, LearnerProfileOut

router = APIRouter(prefix="/learner", tags=["Learner"])

@router.post("/", response_model=UserOut)
def create_learner(user: UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_username(db, user.username)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    return crud.create_user(
        db,
        username=user.username,
        role=user.role
    )

@router.post("/{user_id}/profile", response_model=LearnerProfileOut)
def update_profile(
    user_id: int,
    profile: LearnerProfileCreate,
    db: Session = Depends(get_db)
):
    return crud.create_or_update_profile(db, user_id, profile.level)
