from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from services.auth_service import register_user
from schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    new_user = register_user(db, user.username, user.role)
    if not new_user:
        raise HTTPException(status_code=400, detail="User already exists")
    return new_user
