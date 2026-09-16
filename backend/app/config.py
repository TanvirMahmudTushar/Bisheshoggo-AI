"""
Bisheshoggo AI - Configuration Settings
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Bisheshoggo AI"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./bisheshoggo.db"
    
    # JWT Settings
    SECRET_KEY: str = "bisheshoggo-ai-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # AI Settings
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()


