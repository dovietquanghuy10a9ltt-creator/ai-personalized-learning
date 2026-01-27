from fastapi import FastAPI
from config import settings
from db.database import engine
from db import models
from api import learner, assessment, dashboard

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(learner.router)
app.include_router(assessment.router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {"message": "Backend is running"}
