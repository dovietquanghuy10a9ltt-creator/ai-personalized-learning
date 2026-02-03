from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from services.history_service import get_user_learning_history
from schemas.history import LearningHistoryOut

router = APIRouter(prefix="/history", tags=["Learning History"])

@router.get("/{user_id}", response_model=list[LearningHistoryOut])
def read_learning_history(
    user_id: int,
    db: Session = Depends(get_db)
):
    return get_user_learning_history(db, user_id)
