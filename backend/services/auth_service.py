from sqlalchemy.orm import Session
from db import crud

def register_user(db: Session, username: str, role: str = "learner"):
    # Kiểm tra user tồn tại
    existing = crud.get_user_by_username(db, username)
    if existing:
        return None

    # Tạo user
    user = crud.create_user(db, username, role)

    # Ghi learning history
    crud.log_learning_action(
        db,
        user.id,
        "User account created"
    )

    return user
