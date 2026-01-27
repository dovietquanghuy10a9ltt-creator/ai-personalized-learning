from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import os

load_dotenv()

class Settings:
    PROJECT_NAME = "AI Personalized Learning System"
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_db/app.db")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    CHROMA_PATH = "./chroma_db"

settings = Settings()
