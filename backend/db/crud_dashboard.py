from sqlalchemy.orm import Session
from sqlalchemy import func
from db import models


def get_current_level(db: Session, user_id: int):
    return (
        db.query(models.LearnerProfile.level)
        .filter(models.LearnerProfile.user_id == user_id)
        .scalar()
    )


def get_assessment_summary(db: Session, user_id: int):
    result = (
        db.query(
            func.count(models.AssessmentResult.id).label("total"),
            func.avg(models.AssessmentResult.score_percent).label("avg_score"),
        )
        .filter(models.AssessmentResult.user_id == user_id)
        .first()
    )

    last_score = (
        db.query(models.AssessmentResult.score_percent)
        .filter(models.AssessmentResult.user_id == user_id)
        .order_by(models.AssessmentResult.created_at.desc())
        .limit(1)
        .scalar()
    )

    return {
        "total_assessments": result.total or 0,
        "average_score": round(result.avg_score, 2) if result.avg_score else 0,
        "last_score": last_score or 0,
    }


def get_assessment_timeline(db: Session, user_id: int, limit: int = 10):
    return (
        db.query(
            models.AssessmentResult.score_percent,
            models.AssessmentResult.created_at,
        )
        .filter(models.AssessmentResult.user_id == user_id)
        .order_by(models.AssessmentResult.created_at.desc())
        .limit(limit)
        .all()
    )


def get_learning_history(db: Session, user_id: int, limit: int = 20):
    return (
        db.query(
            models.LearningHistory.action,
            models.LearningHistory.timestamp,
        )
        .filter(models.LearningHistory.user_id == user_id)
        .order_by(models.LearningHistory.timestamp.desc())
        .limit(limit)
        .all()
    )
