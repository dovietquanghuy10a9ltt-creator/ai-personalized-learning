from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from agents.adaptive_agent import recommend

from db.database import get_db
from db import crud_dashboard

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/{user_id}")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):

    level = crud_dashboard.get_current_level(db, user_id)
    summary = crud_dashboard.get_assessment_summary(db, user_id)
    timeline = crud_dashboard.get_assessment_timeline(db, user_id)
    history = crud_dashboard.get_learning_history(db, user_id)

    adaptive_recommendation = recommend(level) if level else None

    return {
        "user_id": user_id,
        "current_level": level,
        "summary": {
            **summary,
            "learning_actions": len(history)
        },
        "assessment_timeline": timeline,
        "learning_history": history,
        "adaptive_recommendation": adaptive_recommendation
    }

