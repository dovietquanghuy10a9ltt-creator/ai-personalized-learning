from sqlalchemy.orm import Session
from db import models

# --------------------
# USER
# --------------------
def create_user(db: Session, username: str, role: str = "learner"):
    user = models.User(username=username, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_username(db: Session, username: str):
    return (
        db.query(models.User)
        .filter(models.User.username == username)
        .first()
    )

# --------------------
# LEARNER PROFILE
# --------------------
def create_or_update_profile(db: Session, user_id: int, level: str):
    profile = (
        db.query(models.LearnerProfile)
        .filter(models.LearnerProfile.user_id == user_id)
        .first()
    )

    if profile:
        profile.level = level
    else:
        profile = models.LearnerProfile(
            user_id=user_id,
            level=level
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile

# --------------------
# ASSESSMENT RESULT
# --------------------
def save_assessment_result(db: Session, user_id: int, score_percent: float):
    result = models.AssessmentResult(
        user_id=user_id,
        score_percent=score_percent
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result

# --------------------
# LEARNING HISTORY
# --------------------
def log_learning_action(db: Session, user_id: int, action: str):
    history = models.LearningHistory(
        user_id=user_id,
        action=action
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history
