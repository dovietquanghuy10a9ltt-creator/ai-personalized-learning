import os
from dotenv import load_dotenv

# Load file .env
load_dotenv()

class Settings:
   
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_db/app.db")
    CHROMA_DB_DIR = "chroma_db"

settings = Settings()

