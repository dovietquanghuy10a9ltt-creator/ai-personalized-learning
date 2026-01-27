from db.database import SessionLocal
from config import settings

from db import crud

def test_create_user():
    db = SessionLocal()
    user = crud.create_user(db, "test_user")
    print("Created user:", user.username)
    db.close()

if __name__ == "__main__":
    test_create_user()
