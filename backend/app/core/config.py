import os
from dotenv import load_dotenv

from pydantic_settings import BaseSettings
from typing import Optional

load_dotenv(override=True)

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "FinSight AI"

    # Database
    # Default to SQLite for local development; will use PostgreSQL in production
    DATABASE_URL: str = "sqlite:///./finsight.db"

    @property
    def sqlalchemy_database_url(self) -> str:
        # Some platforms (like Render/Heroku) provide "postgres://", but SQLAlchemy requires "postgresql://"
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

    # JWT Auth
    JWT_SECRET_KEY: str = "supersecretkey_change_later"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Encryption (for saving PDF password securely)
    ENCRYPTION_KEY: str = "4Rbznc1uUJ5Zh4riupNU7zRqk2hriiH6kDfKzGMHUS8="

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEYS: Optional[str] = None

    # Groq AI
    GROQ_API_KEY: Optional[str] = None

    # Google (speech / credentials)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GOOGLE_CLIENT_ID: str = ""
    
    # Twilio WhatsApp (optional — leave blank to disable)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_FROM: Optional[str] = "whatsapp:+14155238886"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
        "case_sensitive": False
    }

settings = Settings()
