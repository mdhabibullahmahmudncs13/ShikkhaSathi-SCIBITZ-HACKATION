"""
Development configuration for ShikkhaSathi
Simple configuration without external dependencies
"""
import os


class DevSettings:
    """Simple development settings class"""
    
    API_V1_STR = "/api/v1"
    SECRET_KEY = "dev-secret-key-for-testing-only"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 8  # 8 days
    
    # CORS origins
    BACKEND_CORS_ORIGINS = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alternative port)
        "http://localhost:8080",  # Alternative frontend port
        "https://localhost:5173",  # Vite dev server HTTPS
        "https://localhost:5174",  # Vite dev server HTTPS (alternative port)
        "http://192.168.0.109:5173",  # Network access to Vite dev server
        "http://192.168.0.109:5174",  # Network access to Vite dev server (alternative port)
        "http://192.168.0.107:5173",  # Network access to Vite dev server (alternative IP)
        "http://192.168.0.109:3000",  # Network access to React dev server
        "http://192.168.0.107:3000",  # Network access to React dev server (alternative IP)
        "https://192.168.0.109:5173",  # Network access to Vite dev server HTTPS
        "https://192.168.0.109:5174",  # Network access to Vite dev server HTTPS (alternative port)
        "https://192.168.0.107:5173",  # Network access to Vite dev server HTTPS (alternative IP)
        "https://192.168.0.107:5174",  # Network access to Vite dev server HTTPS (alternative IP, alt port)
        "https://192.168.1.161:5173",  # Network access to Vite dev server HTTPS (current server IP)
        "https://192.168.1.161:5174",  # Network access to Vite dev server HTTPS (current server IP, alt port)
        "http://192.168.1.161:5173",   # Network access to Vite dev server HTTP (current server IP)
        "http://192.168.1.161:5174",   # Network access to Vite dev server HTTP (current server IP, alt port)
        "*",  # Allow all origins for development (not recommended for production)
    ]

    # SQLite Database for development
    @property
    def SQLALCHEMY_DATABASE_URI(self):
        db_path = os.path.join(os.path.dirname(__file__), "..", "..", "dev_database.db")
        return f"sqlite:///{db_path}"
    
    # Mock services
    MONGODB_URL = "mock://localhost:27017"
    MONGODB_DB_NAME = "shikkhasathi_dev"
    REDIS_URL = "mock://localhost:6379"
    
    # API Keys (optional for development)
    OPENAI_API_KEY = ""
    PINECONE_API_KEY = ""
    PINECONE_ENVIRONMENT = ""
    PINECONE_INDEX_NAME = "shikkhasathi-embeddings"
    ELEVENLABS_API_KEY = ""
    ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
    
    # Local AI Configuration
    OLLAMA_BASE_URL = "http://localhost:11434"
    OLLAMA_MODEL = "llama2"
    
    # Local Voice Services Configuration
    USE_LOCAL_VOICE_SERVICES = True
    VOICE_API_FALLBACK = False
    
    # Development mode flags
    DEVELOPMENT_MODE = True
    USE_MOCK_DATABASES = True


dev_settings = DevSettings()