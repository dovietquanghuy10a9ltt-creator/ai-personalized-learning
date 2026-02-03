from sqlalchemy.orm import Session
from sqlalchemy import func

from db import models


def get_dashboard_data(db: Session, user_id: int):
    # Level hiện tại
    profile = (
        db.query(models.LearnerProfile)
        .filter(models.LearnerProfile.user_id == user_id)
        .first()
    )

    # Assessment timeline
    assessments = (
        db.query(models.AssessmentResult)
        .filter(models.AssessmentResult.user_id == user_id)
        .order_by(models.AssessmentResult.created_at.desc())
        .all()
    )

    # Learning history
    history = (
        db.query(models.LearningHistory)
        .filter(models.LearningHistory.user_id == user_id)
        .order_by(models.LearningHistory.timestamp.desc())
        .limit(20)
        .all()
    )

    # Summary (query tối ưu)
    summary = (
        db.query(
            func.count(models.AssessmentResult.id),
            func.avg(models.AssessmentResult.score_percent),
            func.max(models.AssessmentResult.score_percent)
        )
        .filter(models.AssessmentResult.user_id == user_id)
        .one()
    )

    return {
        "user_id": user_id,
        "current_level": profile.level if profile else None,
        "summary": {
            "total_assessments": summary[0],
            "average_score": round(summary[1] or 0, 2),
            "last_score": summary[2] or 0,
            "learning_actions": len(history),
        },
        "assessment_timeline": assessments,
        "learning_history": history,
    }
