from sqlalchemy.orm import Session
from db import crud

def get_user_learning_history(db: Session, user_id: int):
    return crud.get_learning_history(db, user_id)