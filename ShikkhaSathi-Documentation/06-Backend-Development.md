# 06 - Backend Development Guide

**Complete Backend Implementation Reference**

---

## 📖 Table of Contents

1. [Backend Overview](#backend-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [API Development](#api-development)
5. [Database Models](#database-models)
6. [Service Layer](#service-layer)
7. [Authentication](#authentication)
8. [Quiz System](#quiz-system)
9. [Best Practices](#best-practices)

---

## 🎯 Backend Overview

### Technology Stack

**Core Framework:**
- **FastAPI 0.104+** - Modern, fast web framework
- **Python 3.9+** - Programming language
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

**Key Features:**
- Async/await support for high performance
- Automatic API documentation (Swagger/OpenAPI)
- Type hints and validation
- Dependency injection
- WebSocket support

### Architecture Pattern

```
┌─────────────────────────────────────┐
│         API Layer (Routes)          │
│  - Request handling                 │
│  - Response formatting              │
│  - Input validation                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Service Layer (Business)       │
│  - Business logic                   │
│  - Data processing                  │
│  - External integrations            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│       Data Layer (Models)           │
│  - Database operations              │
│  - ORM models                       │
│  - Data validation                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         Database Layer              │
│  - PostgreSQL, MongoDB, Redis       │
└─────────────────────────────────────┘
```

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Application entry point
│   ├── api/
│   │   ├── __init__.py
│   │   └── api_v1/
│   │       ├── __init__.py
│   │       ├── auth.py            # Authentication endpoints
│   │       ├── users.py           # User management
│   │       ├── quiz.py            # Quiz operations
│   │       ├── chat.py            # AI tutor chat
│   │       ├── dashboard.py       # Dashboard data
│   │       └── websocket.py       # WebSocket connections
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Configuration
│   │   ├── deps.py                # Dependencies
│   │   ├── security.py            # Security utilities
│   │   └── error_handlers.py      # Error handling
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py             # Database session
│   │   ├── mongodb.py             # MongoDB connection
│   │   └── redis_client.py        # Redis connection
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                # User model
│   │   ├── quiz_attempt.py        # Quiz attempt model
│   │   ├── student_progress.py    # Progress model
│   │   └── gamification.py        # Gamification model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py                # User schemas
│   │   ├── quiz.py                # Quiz schemas
│   │   └── auth.py                # Auth schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py        # Auth logic
│   │   ├── quiz/
│   │   │   ├── __init__.py
│   │   │   └── quiz_service.py    # Quiz generation
│   │   ├── rag/
│   │   │   ├── __init__.py
│   │   │   └── rag_service.py     # RAG implementation
│   │   └── gamification_service.py # XP/achievements
│   └── utils/
│       ├── __init__.py
│       └── helpers.py             # Utility functions
├── alembic/                       # Database migrations
├── tests/                         # Test files
├── requirements.txt               # Dependencies
└── run_dev_with_ollama.py        # Development server
```

---

## 🔧 Core Components

### 1. Application Entry Point (main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_v1 import auth, users, quiz, chat, dashboard
from app.core.config import settings
from app.core.error_handlers import add_exception_handlers

# Create FastAPI application
app = FastAPI(
    title="ShikkhaSathi API",
    description="AI-powered adaptive learning platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handlers
add_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(quiz.router, prefix="/api/v1/quiz", tags=["quiz"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 ShikkhaSathi API starting...")
    # Initialize database connections
    # Load AI models
    # Setup caching

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("👋 ShikkhaSathi API shutting down...")
    # Close database connections
    # Cleanup resources
```

### 2. Configuration (core/config.py)

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "ShikkhaSathi"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str
    MONGODB_URL: str
    REDIS_URL: str
    
    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MATH_MODEL: str = "phi3:mini"
    OLLAMA_BANGLA_MODEL: str = "llama3.2:3b"
    OLLAMA_GENERAL_MODEL: str = "llama3.2:1b"
    
    # ChromaDB
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### 3. Dependencies (core/deps.py)

```python
from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.config import settings
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_db() -> Generator:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
```

---

## 🛣️ API Development

### Authentication Endpoints (api/api_v1/auth.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.deps import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserResponse

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
async def signup(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register new user"""
    # Check if user exists
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        grade=user_data.grade,
        medium=user_data.medium
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login user and return JWT token"""
    # Authenticate user
    user = db.query(User).filter(
        User.email == form_data.username
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
```

### Quiz Endpoints (api/api_v1/quiz.py)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.quiz_attempt import QuizAttempt
from app.schemas.quiz import QuizGenerate, QuizResponse, QuizSubmit
from app.services.quiz.quiz_service import QuizService

router = APIRouter()
quiz_service = QuizService()

@router.get("/subjects")
async def get_subjects():
    """Get available subjects"""
    return {
        "subjects": [
            {"id": "mathematics", "name": "গণিত (Mathematics)"},
            {"id": "physics", "name": "পদার্থবিজ্ঞান (Physics)"},
            {"id": "chemistry", "name": "রসায়ন (Chemistry)"},
            {"id": "biology", "name": "জীববিজ্ঞান (Biology)"},
            {"id": "bangla", "name": "বাংলা (Bengali)"},
            {"id": "english", "name": "English"},
            {"id": "ict", "name": "ICT"}
        ]
    }

@router.get("/topics/{subject}")
async def get_topics(subject: str):
    """Get topics for a subject"""
    topics = await quiz_service.get_topics_for_subject(subject)
    return {"topics": topics}

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(
    quiz_params: QuizGenerate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a new quiz"""
    try:
        quiz = await quiz_service.generate_quiz(
            subject=quiz_params.subject,
            topic=quiz_params.topic,
            question_count=quiz_params.question_count,
            difficulty=quiz_params.difficulty,
            user_id=current_user.id,
            db=db
        )
        return quiz
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz: {str(e)}"
        )

@router.post("/submit")
async def submit_quiz(
    submission: QuizSubmit,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit quiz answers and get results"""
    try:
        result = await quiz_service.grade_quiz(
            quiz_id=submission.quiz_id,
            answers=submission.answers,
            user_id=current_user.id,
            db=db
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit quiz: {str(e)}"
        )

@router.get("/history")
async def get_quiz_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's quiz history"""
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.id
    ).order_by(QuizAttempt.created_at.desc()).limit(20).all()
    
    return {"attempts": attempts}
```

---

## 🗄️ Database Models

### User Model (models/user.py)

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.session import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    PARENT = "parent"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    
    # Student-specific fields
    grade = Column(Integer, nullable=True)
    medium = Column(String, nullable=True)  # "bangla" or "english"
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
    progress = relationship("StudentProgress", back_populates="user")
    gamification = relationship("Gamification", back_populates="user", uselist=False)
```

### Quiz Attempt Model (models/quiz_attempt.py)

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Quiz details
    subject = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    
    # Questions and answers (stored as JSON)
    questions = Column(JSON, nullable=False)
    answers = Column(JSON, nullable=False)
    
    # Results
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    
    # XP earned
    xp_earned = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
```

### Gamification Model (models/gamification.py)

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Gamification(Base):
    __tablename__ = "gamification"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # XP and Level
    total_xp = Column(Integer, default=0)
    current_level = Column(Integer, default=1)
    xp_to_next_level = Column(Integer, default=100)
    
    # Streak
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(DateTime, nullable=True)
    
    # Achievements (stored as JSON array)
    achievements = Column(JSON, default=list)
    
    # Statistics
    total_quizzes = Column(Integer, default=0)
    total_questions_answered = Column(Integer, default=0)
    total_correct_answers = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="gamification")
```

---

## 🔐 Authentication

### Security Utilities (core/security.py)

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

def create_access_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt
```

---

## 🎯 Quiz System

### Quiz Service (services/quiz/quiz_service.py)

```python
from typing import List, Dict
from sqlalchemy.orm import Session
from app.services.rag.rag_service import RAGService
from app.models.quiz_attempt import QuizAttempt
from app.models.gamification import Gamification
import httpx
import json

class QuizService:
    def __init__(self):
        self.rag_service = RAGService()
        self.ollama_url = "http://localhost:11434/api/generate"
    
    async def get_topics_for_subject(self, subject: str) -> List[Dict]:
        """Get topics from NCTB textbooks"""
        # Extract chapters from textbook
        topics = await self.rag_service.get_chapters(subject)
        return topics
    
    async def generate_quiz(
        self,
        subject: str,
        topic: str,
        question_count: int,
        difficulty: str,
        user_id: int,
        db: Session
    ) -> Dict:
        """Generate quiz using Ollama and RAG"""
        
        # 1. Retrieve relevant content from NCTB textbooks
        context = await self.rag_service.search(
            query=f"{subject} {topic}",
            n_results=5
        )
        
        # 2. Construct prompt for Ollama
        prompt = f"""Generate {question_count} multiple choice questions about {topic} in {subject}.
        
Use this content from NCTB textbook:
{context}

Difficulty: {difficulty}

Format each question as JSON:
{{
    "question_text": "Question here",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct_answer": "A",
    "explanation": "Why this is correct"
}}

Return only valid JSON array of questions."""
        
        # 3. Call Ollama to generate questions
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.ollama_url,
                json={
                    "model": "llama3.2:3b",
                    "prompt": prompt,
                    "stream": False
                }
            )
            
            result = response.json()
            questions_text = result.get("response", "")
            
            # Parse JSON response
            questions = json.loads(questions_text)
        
        # 4. Store quiz attempt
        quiz_attempt = QuizAttempt(
            user_id=user_id,
            subject=subject,
            topic=topic,
            difficulty=difficulty,
            questions=questions,
            answers={},
            score=0,
            total_questions=len(questions),
            correct_answers=0
        )
        
        db.add(quiz_attempt)
        db.commit()
        db.refresh(quiz_attempt)
        
        return {
            "quiz_id": quiz_attempt.id,
            "questions": questions
        }
    
    async def grade_quiz(
        self,
        quiz_id: int,
        answers: Dict[str, str],
        user_id: int,
        db: Session
    ) -> Dict:
        """Grade quiz and update progress"""
        
        # Get quiz attempt
        quiz = db.query(QuizAttempt).filter(
            QuizAttempt.id == quiz_id,
            QuizAttempt.user_id == user_id
        ).first()
        
        if not quiz:
            raise ValueError("Quiz not found")
        
        # Calculate score
        correct = 0
        total = len(quiz.questions)
        
        for i, question in enumerate(quiz.questions):
            student_answer = answers.get(str(i))
            correct_answer = question["correct_answer"]
            
            if student_answer == correct_answer:
                correct += 1
        
        score = (correct / total) * 100
        
        # Calculate XP
        xp_earned = int(score / 2)  # 50 XP for perfect score
        if score == 100:
            xp_earned += 20  # Bonus for perfect score
        
        # Update quiz attempt
        quiz.answers = answers
        quiz.score = score
        quiz.correct_answers = correct
        quiz.xp_earned = xp_earned
        quiz.completed_at = datetime.utcnow()
        
        # Update gamification
        gamification = db.query(Gamification).filter(
            Gamification.user_id == user_id
        ).first()
        
        if gamification:
            gamification.total_xp += xp_earned
            gamification.total_quizzes += 1
            gamification.total_questions_answered += total
            gamification.total_correct_answers += correct
            
            # Check for level up
            while gamification.total_xp >= gamification.xp_to_next_level:
                gamification.current_level += 1
                gamification.xp_to_next_level = gamification.current_level * 100
        
        db.commit()
        
        return {
            "score": score,
            "correct": correct,
            "total": total,
            "xp_earned": xp_earned,
            "level": gamification.current_level if gamification else 1
        }
```

---

## ✅ Best Practices

### 1. Error Handling

```python
from fastapi import HTTPException, status

# Use appropriate HTTP status codes
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Resource not found"
)

# Provide clear error messages
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid quiz parameters: question_count must be between 5 and 20"
)
```

### 2. Input Validation

```python
from pydantic import BaseModel, Field, validator

class QuizGenerate(BaseModel):
    subject: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)
    question_count: int = Field(..., ge=5, le=20)
    difficulty: str = Field(..., regex="^(easy|medium|hard)$")
    
    @validator('subject')
    def validate_subject(cls, v):
        allowed = ['mathematics', 'physics', 'chemistry', 'biology', 'bangla', 'english', 'ict']
        if v.lower() not in allowed:
            raise ValueError(f'Subject must be one of: {allowed}')
        return v.lower()
```

### 3. Async Operations

```python
# Use async for I/O operations
async def get_data_from_api():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()

# Use async database queries
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

### 4. Dependency Injection

```python
# Reusable dependencies
def get_quiz_service() -> QuizService:
    return QuizService()

@router.post("/generate")
async def generate_quiz(
    quiz_service: QuizService = Depends(get_quiz_service)
):
    return await quiz_service.generate_quiz(...)
```

### 5. Testing

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_generate_quiz():
    response = client.post(
        "/api/v1/quiz/generate",
        json={
            "subject": "mathematics",
            "topic": "algebra",
            "question_count": 5,
            "difficulty": "medium"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "quiz_id" in response.json()
```

---

**Next:** [[07-Frontend-Development]] - Frontend implementation guide

**শিক্ষাসাথী** - Backend built with FastAPI 🇧🇩
