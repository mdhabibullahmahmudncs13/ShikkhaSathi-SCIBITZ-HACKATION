"""
Docker database configuration for ShikkhaSathi
Uses PostgreSQL, MongoDB, and Redis running in Docker containers
"""

import os
from typing import List
from pydantic_settings import BaseSettings

class DockerSettings(BaseSettings):
    """Configuration for Docker database connections"""
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ShikkhaSathi API"
    
    # Database URLs for Docker containers
    DATABASE_URL: str = "postgresql://shikkhasathi_user:shikkhasathi_pass@localhost:5432/shikkhasathi"
    MONGODB_URL: str = "mongodb://shikkhasathi_user:shikkhasathi_pass@localhost:27017/shikkhasathi"
    REDIS_URL: str = "redis://:shikkhasathi_pass@localhost:6379/0"
    
    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://192.168.0.109:5173",
        "http://192.168.0.107:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # AI Configuration
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    # Optional API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    
    class Config:
        case_sensitive = True

# Global settings instance
docker_settings = DockerSettings()