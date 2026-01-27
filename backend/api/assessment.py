from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from services.learner_service import process_assessment
from schemas.assessment import AssessmentSubmit

router = APIRouter(prefix="/assessment", tags=["Assessment"])

@router.post("/{user_id}")
def submit_assessment(
    user_id: int,
    data: AssessmentSubmit,
    db: Session = Depends(get_db)
):
    level = process_assessment(db, user_id, data.score_percent)

    return {
        "user_id": user_id,
        "score_percent": data.score_percent,
        "recommended_level": level
    }
