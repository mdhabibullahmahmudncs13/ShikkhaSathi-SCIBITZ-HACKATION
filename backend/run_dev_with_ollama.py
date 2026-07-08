#!/usr/bin/env python3
"""
ShikkhaSathi Development Server with Proper Ollama Integration
Uses actual Ollama models instead of hardcoded responses
"""

import sys
import os
import uvicorn
import logging
import requests
import random
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json
import random

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import development configuration
try:
    from app.core.config_dev import dev_settings
    from app.db.session_dev import create_tables
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    print("⚠️  Configuration not available, using minimal setup")

# Create FastAPI app
app = FastAPI(
    title="ShikkhaSathi API",
    description="AI-powered education platform for Bangladesh students",
    version="1.0.0-dev-ollama"
)

# CORS configuration - Allow all network access
cors_origins = [
    "http://localhost:3000",
    "https://localhost:3000", 
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:5174",
    "https://localhost:5174",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
    "http://127.0.0.1:5173", 
    "https://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://127.0.0.1:5174",
    # Network access
    "http://192.168.0.109:3000",
    "https://192.168.0.109:3000",
    "http://192.168.0.109:5173",
    "https://192.168.0.109:5173",
    "http://192.168.0.109:5174",
    "https://192.168.0.109:5174",
    "http://192.168.0.107:3000",
    "https://192.168.0.107:3000",
    "http://192.168.0.107:5173",
    "https://192.168.0.107:5173",
    "http://192.168.0.107:5174",
    "https://192.168.0.107:5174",
    # Allow all local network (for development)
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting ShikkhaSathi with Ollama Integration...")
    if CONFIG_AVAILABLE:
        try:
            create_tables()
            print("✅ Database initialized")
        except Exception as e:
            print(f"⚠️  Database initialization warning: {e}")
    print("🦙 Ollama models ready!")
    print("🌐 Server ready!")

# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "ShikkhaSathi API with Ollama",
        "version": "1.0.0-dev-ollama",
        "status": "running",
        "models": ["llama3.2:1b", "llama3.2:3b", "phi3:mini"],
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ollama": "enabled"
    }

@app.get("/api/v1/health")
async def health_check_v1():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ollama": "enabled"
    }

@app.head("/api/v1/health")
async def health_check_head():
    """Health check HEAD endpoint for monitoring"""
    return Response()

# Ollama integration functions
async def call_ollama_model(model_name: str, prompt: str, temperature: float = 0.7) -> str:
    """Call Ollama model with proper error handling"""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": 0.9
                }
            },
            timeout=60  # Increased timeout for larger models
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get('response', 'Sorry, I could not generate a response.')
        else:
            logger.error(f"Ollama API error: {response.status_code}")
            return "Sorry, there was an error processing your question."
            
    except Exception as e:
        logger.error(f"Error calling Ollama: {e}")
        return "Sorry, I'm having trouble processing your question right now."

async def get_rag_context(message: str, subject_filter: str = None) -> tuple[str, bool]:
    """Get RAG context for the message"""
    try:
        from app.services.rag.rag_service import get_rag_service
        rag_service = get_rag_service()
        
        if rag_service:
            logger.info(f"Searching RAG for: '{message}' with subject filter: {subject_filter}")
            
            relevant_docs = await rag_service.search_similar(
                query=message,
                n_results=3,
                subject_filter=subject_filter
            )
            
            logger.info(f"RAG search returned {len(relevant_docs)} documents")
            
            if relevant_docs:
                context = "\n\n".join([
                    f"📚 From {doc['metadata'].get('textbook_name', 'NCTB Textbook')}:\n{doc['content'][:300]}..."
                    for doc in relevant_docs
                ])
                logger.info("RAG context added to request")
                return context, True
            else:
                logger.warning("No relevant documents found")
                return "", False
        else:
            logger.warning("RAG service not available")
            return "", False
    except Exception as e:
        logger.error(f"RAG search failed: {e}", exc_info=True)
        return "", False

# AI Chat endpoint with proper Ollama integration
@app.post("/api/v1/chat/chat")
async def ai_chat(request: dict):
    """Main AI chat endpoint"""
    return await process_chat_request(request)

@app.post("/api/v1/ai/chat")
async def ai_chat_alias(request: dict):
    """Alias endpoint for AI chat (frontend compatibility)"""
    return await process_chat_request(request)

async def process_chat_request(request: dict):
    message = request.get("message", "")
    model_category = request.get("model_category", "general")
    ai_mode = request.get("ai_mode", "tutor")
    conversation_history = request.get("conversation_history", [])
    
    # Auto-detect model category from subject if not provided
    subject = request.get("subject", "").lower()
    if model_category == "general" and subject:
        if subject in ["mathematics", "math", "গণিত"]:
            model_category = "math"
        elif subject in ["bangla", "বাংলা", "bengali"]:
            model_category = "bangla"
    
    logger.info(f"Received chat request: {message[:50]}... (category: {model_category}, subject: {subject})")
    
    # Get RAG context
    subject_filter = None
    if model_category == "math":
        subject_filter = "Mathematics"
    elif model_category == "bangla":
        subject_filter = "Bangla"
    
    rag_context, has_rag_context = await get_rag_context(message, subject_filter)
    
    # Select appropriate model and create prompt
    if model_category == "math":
        model_name = "phi3:mini"
        temperature = 0.1  # Very low temperature for mathematical precision
        
        prompt = f"""You are a precise mathematics solver for ShikkhaSathi. Your job is to solve mathematical problems clearly and accurately.

PROBLEM: {message}

{f"REFERENCE: {rag_context}\\n" if has_rag_context else ""}

INSTRUCTIONS:
1. Identify the type of problem (algebra, arithmetic, geometry, etc.)
2. Show step-by-step solution
3. State the FINAL ANSWER clearly at the end

SOLUTION:"""
        
    elif model_category == "bangla":
        model_name = "llama3.2:3b"
        temperature = 0.6
        
        prompt = f"""আপনি শিক্ষাসাথীর বাংলা ভাষা ও সাহিত্য শিক্ষক - বাংলাদেশের ৯ম-১০ম শ্রেণীর শিক্ষার্থীদের জন্য একজন বিশেষজ্ঞ শিক্ষক। আপনার লক্ষ্য হলো বাংলা ভাষা ও সাহিত্যকে সহজ, আকর্ষণীয় এবং বোধগম্য করে তোলা।

🎓 শিক্ষার্থীর প্রশ্ন:
{message}

{f"📚 NCTB পাঠ্যবই থেকে প্রাসঙ্গিক তথ্য:\\n{rag_context}\\n" if has_rag_context else ""}

📝 আপনার শিক্ষাদান পদ্ধতি:

১. প্রশ্ন বুঝুন
   • প্রশ্নটি কোন বিষয়ে? (ব্যাকরণ, সাহিত্য, রচনা)
   • মূল বিষয়বস্তু কী?
   • NCTB পাঠ্যক্রমের সাথে সম্পর্ক

২. বিস্তারিত ব্যাখ্যা
   • সহজ ও স্পষ্ট ভাষায় ব্যাখ্যা করুন
   • উদাহরণ দিয়ে বুঝান
   • প্রয়োজনে সূত্র বা নিয়ম উল্লেখ করুন
   • বাস্তব জীবনের সাথে সংযোগ স্থাপন করুন

৩. উত্তর সংক্ষেপ
   • মূল পয়েন্টগুলো তুলে ধরুন
   • মনে রাখার টিপস দিন
   • অনুশীলনের পরামর্শ দিন

💡 শিক্ষাদানের নীতি:
- সহজ বাংলা ব্যবহার করুন (SSC স্তরের উপযুক্ত)
- NCTB পাঠ্যবই থেকে উদাহরণ দিন
- শিক্ষার্থীকে উৎসাহিত করুন
- ধৈর্য ও সহানুভূতির সাথে শেখান
- বাংলা ভাষার প্রতি ভালোবাসা জাগান

🎯 এবার আসুন, একসাথে এই প্রশ্নের উত্তর খুঁজি:"""
        
    else:  # general
        model_name = "llama3.2:1b"
        temperature = 0.7
        
        prompt = f"""You are ShikkhaSathi's General Knowledge AI Tutor - an expert educator for Bangladesh SSC students (Classes 9-10). You specialize in Science (Physics, Chemistry, Biology), English, History, Geography, and other subjects.

🎓 STUDENT'S QUESTION:
{message}

{f"📚 NCTB TEXTBOOK REFERENCE:\\n{rag_context}\\n" if has_rag_context else ""}

📝 YOUR TEACHING APPROACH:

1️⃣ IDENTIFY THE SUBJECT
   • Which subject does this question belong to?
   • What specific topic or concept?
   • How does it relate to NCTB curriculum?

2️⃣ CLEAR EXPLANATION
   • Start with the basics
   • Build up to the answer logically
   • Use examples from Bangladesh context
   • Include diagrams or visual descriptions when helpful
   • Connect to real-world applications

3️⃣ KEY TAKEAWAYS
   • Summarize the main points
   • Provide memory tips or mnemonics
   • Suggest related topics to explore
   • Encourage further learning

💡 TEACHING PRINCIPLES:
- Use simple English appropriate for SSC level
- Reference NCTB textbooks and curriculum
- Make learning engaging and relatable
- Use Bangladesh-specific examples (local flora/fauna, geography, culture)
- Be encouraging and supportive
- Foster curiosity and critical thinking

🌟 SUBJECT-SPECIFIC TIPS:
- Physics: Use everyday examples (rickshaw, fan, light bulb)
- Chemistry: Relate to common substances (salt, water, air)
- Biology: Use local examples (rice plant, mango tree, pond ecosystem)
- English: Focus on grammar, vocabulary, and communication
- History: Connect to Bangladesh's rich heritage
- Geography: Reference Bangladesh's rivers, climate, and regions

🎯 Let's explore this topic together:"""
    
    # Call the appropriate Ollama model
    logger.info(f"Calling {model_name} model...")
    response_text = await call_ollama_model(model_name, prompt, temperature)
    
    # Generate response
    response = {
        "response": response_text,
        "session_id": f"ollama_session_{random.randint(1000, 9999)}",
        "message_id": f"msg_{random.randint(1000, 9999)}",
        "model_used": model_name,
        "model_category": model_category,
        "has_rag_context": has_rag_context,
        "sources": ["NCTB Curriculum", "Ollama AI Models"],
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"Generated response with {model_name}: {len(response_text)} chars")
    return response

# In-memory user storage for development
registered_users = {}

# In-memory storage for created classes
created_classes = []

# In-memory storage for joined classes (student_id -> list of class info)
joined_classes = {}

# In-memory storage for scheduled classes
scheduled_classes = []

# Authentication endpoints
@app.post("/api/v1/auth/login")
async def login(credentials: dict):
    """Mock login for development"""
    email = credentials.get("email", "")
    password = credentials.get("password", "")
    
    # Mock users for testing
    mock_users = {
        "student1@example.com": {"role": "student", "name": "Student One", "id": "1", "password": "password123"},
        "teacher1@example.com": {"role": "teacher", "name": "Teacher One", "id": "2", "password": "password123"},
        "parent1@example.com": {"role": "parent", "name": "Parent One", "id": "3", "password": "password123"},
        "admin@example.com": {"role": "admin", "name": "Admin User", "id": "4", "password": "password123"}
    }
    
    # Check registered users first
    if email in registered_users:
        user_data = registered_users[email]
        if user_data["password"] == password:
            # Store the current user email for the /users/me endpoint
            get_current_user_endpoint.current_email = email
            
            return {
                "access_token": f"mock_token_{email}",
                "token_type": "bearer",
                "user": {
                    "id": user_data["id"],
                    "email": email,
                    "name": user_data["name"],
                    "full_name": user_data["name"],
                    "role": user_data["role"],
                    "is_active": True
                }
            }
    
    # Check mock users
    elif email in mock_users and mock_users[email]["password"] == password:
        user_data = mock_users[email]
        
        # Store the current user email for the /users/me endpoint
        get_current_user_endpoint.current_email = email
        
        return {
            "access_token": f"mock_token_{email}",
            "token_type": "bearer",
            "user": {
                "id": user_data["id"],
                "email": email,
                "name": user_data["name"],
                "full_name": user_data["name"],
                "role": user_data["role"],
                "is_active": True
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/v1/auth/register")
async def register(user_data: dict):
    """Mock registration for development"""
    email = user_data.get("email", "")
    password = user_data.get("password", "")
    full_name = user_data.get("full_name", "")
    role = user_data.get("role", "student")
    
    # Validate required fields
    if not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Check if user already exists (mock check)
    existing_users = ["student1@example.com", "teacher1@example.com", "parent1@example.com", "admin@example.com"]
    if email in existing_users or email in registered_users:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Generate new user ID
    new_user_id = str(random.randint(100, 999))
    
    # Store user in registered_users
    registered_users[email] = {
        "id": new_user_id,
        "name": full_name,
        "role": role,
        "password": password,  # Store password for login verification
        "is_active": True
    }
    
    # Create new user response
    new_user = {
        "id": new_user_id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "is_active": True
    }
    
    # Store the current user email for the /users/me endpoint
    get_current_user_endpoint.current_email = email
    
    # Return success with token
    return {
        "access_token": f"mock_token_{email}",
        "token_type": "bearer",
        "user": new_user,
        "message": "Registration successful"
    }

@app.get("/api/v1/users/me")
async def get_current_user_endpoint():
    """Get current user information"""
    # Mock users database
    mock_users = {
        "student1@example.com": {
            "id": "1",
            "email": "student1@example.com",
            "full_name": "Student One",
            "first_name": "Student",
            "last_name": "One",
            "role": "student"
        },
        "teacher1@example.com": {
            "id": "2", 
            "email": "teacher1@example.com",
            "full_name": "Teacher One",
            "first_name": "Teacher",
            "last_name": "One",
            "role": "teacher"
        },
        "parent1@example.com": {
            "id": "3",
            "email": "parent1@example.com", 
            "full_name": "Parent One",
            "first_name": "Parent",
            "last_name": "One",
            "role": "parent"
        },
        "admin@example.com": {
            "id": "4",
            "email": "admin@example.com",
            "full_name": "Admin User",
            "first_name": "Admin", 
            "last_name": "User",
            "role": "admin"
        }
    }
    
    # Get current user email from stored value (set during login)
    current_user_email = getattr(get_current_user_endpoint, 'current_email', 'student1@example.com')
    
    # Check registered users first
    if current_user_email in registered_users:
        user_data = registered_users[current_user_email]
        name_parts = user_data["name"].split(" ", 1)
        first_name = name_parts[0] if name_parts else user_data["name"]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        return {
            "id": user_data["id"],
            "email": current_user_email,
            "full_name": user_data["name"],
            "first_name": first_name,
            "last_name": last_name,
            "role": user_data["role"],
            "is_active": True,
            "created_at": "2026-01-15T00:00:00Z"
        }
    
    # Check mock users
    elif current_user_email in mock_users:
        user_data = mock_users[current_user_email]
        return {
            **user_data,
            "is_active": True,
            "created_at": "2026-01-14T00:00:00Z"
        }
    
    else:
        # Default to student if email not found
        user_data = mock_users["student1@example.com"]
        return {
            **user_data,
            "is_active": True,
            "created_at": "2026-01-14T00:00:00Z"
        }

# Dashboard endpoints
@app.get("/api/v1/progress/dashboard")
async def get_progress_dashboard():
    """Get student progress dashboard data"""
    return {
        "total_xp": 1250,
        "current_streak": 5,
        "completed_quizzes": 12,
        "average_score": 85.5,
        "recent_activities": [
            {"type": "quiz_completed", "subject": "Mathematics", "score": 90, "date": "2026-01-14"},
            {"type": "achievement_unlocked", "name": "Quiz Master", "date": "2026-01-13"}
        ]
    }

@app.get("/api/v1/notifications/unread-count")
async def get_unread_notifications():
    """Get count of unread notifications"""
    return {"unread_count": 3}

@app.get("/api/v1/notifications")
async def get_notifications():
    """Get all notifications"""
    return {
        "notifications": [
            {
                "id": "1",
                "title": "নতুন কুইজ উপলব্ধ",
                "message": "গণিতের নতুন কুইজ এখন উপলব্ধ!",
                "type": "quiz",
                "read": False,
                "created_at": "2026-01-14T10:00:00Z"
            },
            {
                "id": "2", 
                "title": "অভিনন্দন!",
                "message": "আপনি ৫ দিনের স্ট্রিক সম্পূর্ণ করেছেন!",
                "type": "achievement",
                "read": False,
                "created_at": "2026-01-13T15:30:00Z"
            }
        ],
        "total": 2,
        "unread_count": 2
    }

@app.get("/api/v1/gamification/profile/{user_id}")
async def get_gamification_profile(user_id: str):
    """Get gamification profile for a user"""
    return {
        "user_id": user_id,
        "total_xp": 1250,
        "current_level": 8,
        "xp_to_next_level": 150,
        "current_streak": 5,
        "longest_streak": 12,
        "achievements": [
            {
                "id": "quiz_master",
                "name": "কুইজ মাস্টার",
                "description": "১০টি কুইজ সম্পূর্ণ করুন",
                "icon": "🏆",
                "unlocked": True,
                "unlocked_at": "2026-01-13T12:00:00Z"
            },
            {
                "id": "streak_warrior",
                "name": "স্ট্রিক যোদ্ধা", 
                "description": "৫ দিনের স্ট্রিক বজায় রাখুন",
                "icon": "🔥",
                "unlocked": True,
                "unlocked_at": "2026-01-13T15:30:00Z"
            }
        ],
        "recent_activities": [
            {
                "type": "xp_earned",
                "amount": 50,
                "source": "quiz_completion",
                "timestamp": "2026-01-14T09:00:00Z"
            },
            {
                "type": "achievement_unlocked",
                "achievement_id": "streak_warrior",
                "timestamp": "2026-01-13T15:30:00Z"
            }
        ]
    }

# Quiz endpoints
@app.get("/api/v1/quiz/subjects")
async def get_quiz_subjects():
    """Get available quiz subjects with unlimited AI-generated questions"""
    return {
        "subjects": [
            {
                "id": "mathematics",
                "subject": "mathematics",  # Frontend expects this field
                "name": "গণিত (Mathematics)",
                "name_en": "Mathematics",
                "name_bn": "গণিত",
                "icon": "📐",
                "color": "blue",
                "description": "Algebra, Geometry, Trigonometry - AI Generated from NCTB",
                "total_questions": 999,  # Unlimited - AI generates on demand
                "difficulty_levels": ["easy", "medium", "hard"],
                "available": True  # Frontend filters by this
            },
            {
                "id": "bangla",
                "subject": "bangla",
                "name": "বাংলা (Bangla)",
                "name_en": "Bangla",
                "name_bn": "বাংলা",
                "icon": "📖",
                "color": "green",
                "description": "ব্যাকরণ, সাহিত্য, রচনা - AI Generated from NCTB",
                "total_questions": 999,
                "difficulty_levels": ["easy", "medium", "hard"],
                "available": True
            },
            {
                "id": "english",
                "subject": "english",
                "name": "English",
                "name_en": "English",
                "name_bn": "ইংরেজি",
                "icon": "🔤",
                "color": "purple",
                "description": "Grammar, Vocabulary, Comprehension - AI Generated from NCTB",
                "total_questions": 999,
                "difficulty_levels": ["easy", "medium", "hard"],
                "available": True
            },
            {
                "id": "physics",
                "subject": "physics",
                "name": "পদার্থবিজ্ঞান (Physics)",
                "name_en": "Physics",
                "name_bn": "পদার্থবিজ্ঞান",
                "icon": "⚛️",
                "color": "indigo",
                "description": "Mechanics, Electricity, Optics - AI Generated from NCTB",
                "total_questions": 999,
                "difficulty_levels": ["easy", "medium", "hard"],
                "available": True
            },
            {
                "id": "chemistry",
                "subject": "chemistry",
                "name": "রসায়ন (Chemistry)",
                "name_en": "Chemistry",
                "name_bn": "রসায়ন",
                "icon": "🧪",
                "color": "pink",
                "description": "Organic, Inorganic, Physical - AI Generated from NCTB",
                "total_questions": 999,
                "difficulty_levels": ["easy", "medium", "hard"],
                "available": True
            },
            {
                "id": "biology",
                "subject": "biology",
                "name": "জীববিজ্ঞান (Biology)",
                "name_en": "Biology",
                "name_bn": "জীববিজ্ঞান",
                "icon": "🌱",
                "color": "teal",
                "description": "Botany, Zoology, Human Body - AI Generated from NCTB",
                "total_questions": 999,
                "difficulty_levels": ["easy", "medium", "hard"],
                "available": True
            },
            {
                "id": "ict",
                "subject": "ict",
                "name": "তথ্য ও যোগাযোগ প্রযুক্তি (ICT)",
                "name_en": "ICT",
                "name_bn": "তথ্য ও যোগাযোগ প্রযুক্তি",
                "icon": "💻",
                "color": "cyan",
                "description": "Computer, Internet, Programming - AI Generated from NCTB",
                "total_questions": 999,
                "difficulty_levels": ["easy", "medium", "hard"],
                "available": True
            }
        ],
        "total": 7
    }

def extract_chapters_from_textbook(subject: str) -> List[Dict[str, Any]]:
    """Extract actual chapters from NCTB textbooks"""
    import re
    from pathlib import Path
    
    # Map subject to textbook file
    subject_to_file = {
        "mathematics": "Math class 9-10 EV book full pdf.txt",
        "math": "Math class 9-10 EV book full pdf.txt",
        "ict": "ICT 9-10.txt",
        "physics": "Physics  9-10 EV book full pdf_compressed.txt",
        "english": "English Grammer pdf class 9-10 com_oc.txt",
        "bangla": "Bangla Sahitto pdf class 9-10 com_oc.txt"
    }
    
    textbook_file = subject_to_file.get(subject.lower())
    if not textbook_file:
        logger.warning(f"No textbook file found for subject: {subject}")
        return []
    
    textbook_path = Path("backend/data/nctb_txt") / textbook_file
    if not textbook_path.exists():
        logger.warning(f"Textbook file not found: {textbook_path}")
        return []
    
    try:
        # Read textbook content
        with open(textbook_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        chapters = []
        seen_chapters = set()  # Track unique chapters
        
        # First, try to extract from table of contents (most reliable)
        contents_match = re.search(r'Contents\s*\n+(.*?)(?:\n\n\n|--- Page)', content, re.DOTALL | re.IGNORECASE)
        if contents_match:
            contents_text = contents_match.group(1)
            
            # Try format 1: "1 Real Numbers 1" (Math style)
            chapter_lines = re.findall(r'^(\d+)\s+([A-Z][^\n\d]+?)\s+\d+\s*$', contents_text, re.MULTILINE)
            
            # Try format 2: "Chapter Title Pages" with titles on next lines (ICT style)
            if not chapter_lines:
                # Look for lines that look like chapter titles (start with capital, not "Chapter" or "Pages")
                lines = contents_text.split('\n')
                chapter_num = 0
                for line in lines:
                    line = line.strip()
                    # Skip header lines
                    if not line or 'Chapter' in line or 'Title' in line or 'Pages' in line or line.isdigit():
                        continue
                    # Check if line looks like a title (starts with capital, has reasonable length)
                    if line and line[0].isupper() and 5 < len(line) < 100:
                        chapter_num += 1
                        chapter_lines.append((str(chapter_num), line))
            
            for chapter_num, title in chapter_lines:
                title = title.strip()
                # Clean up title
                title = re.sub(r'\s+', ' ', title)
                # Remove page numbers at end
                title = re.sub(r'\s+\d+-?\d*\s*$', '', title)
                
                if title and len(title) > 2 and chapter_num not in seen_chapters:
                    seen_chapters.add(chapter_num)
                    chapter_id = f"chapter_{chapter_num}"
                    chapters.append({
                        "id": chapter_id,
                        "topic": chapter_id,
                        "name": f"Chapter {chapter_num}: {title}",
                        "chapter_number": int(chapter_num),
                        "question_count": 999
                    })
        
        # If no chapters found from contents, try extracting from chapter headers
        if not chapters:
            # Pattern 1: "Chapter X\nTitle"
            chapter_pattern = re.compile(r'Chapter (\d+)\s*\n+([^\n]+)', re.IGNORECASE)
            matches = chapter_pattern.findall(content)
            
            for chapter_num, title in matches:
                title = title.strip()
                # Clean up title (remove extra spaces, page markers, etc.)
                title = re.sub(r'\s+', ' ', title)
                title = re.sub(r'^[-\s.]+|[-\s.]+$', '', title)
                
                if title and len(title) > 2 and chapter_num not in seen_chapters:
                    seen_chapters.add(chapter_num)
                    chapter_id = f"chapter_{chapter_num}"
                    chapters.append({
                        "id": chapter_id,
                        "topic": chapter_id,
                        "name": f"Chapter {chapter_num}: {title}",
                        "chapter_number": int(chapter_num),
                        "question_count": 999
                    })
            
            # Pattern 2: "First Chapter", "Second Chapter" etc (ICT style)
            if not chapters:
                word_to_num = {
                    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
                    'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10
                }
                chapter_pattern2 = re.compile(r'(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth) Chapter\s*\n+([^\n]+)', re.IGNORECASE)
                matches2 = chapter_pattern2.findall(content)
                
                for word_num, title in matches2:
                    chapter_num = word_to_num.get(word_num.lower(), 0)
                    if chapter_num == 0:
                        continue
                    
                    title = title.strip()
                    title = re.sub(r'\s+', ' ', title)
                    title = re.sub(r'^[-\s.]+|[-\s.]+$', '', title)
                    
                    if title and len(title) > 2 and str(chapter_num) not in seen_chapters:
                        seen_chapters.add(str(chapter_num))
                        chapter_id = f"chapter_{chapter_num}"
                        chapters.append({
                            "id": chapter_id,
                            "topic": chapter_id,
                            "name": f"Chapter {chapter_num}: {title}",
                            "chapter_number": chapter_num,
                            "question_count": 999
                        })
        
        # Sort by chapter number
        chapters.sort(key=lambda x: x.get("chapter_number", 0))
        
        logger.info(f"Extracted {len(chapters)} chapters from {subject} textbook")
        return chapters
        
    except Exception as e:
        logger.error(f"Error extracting chapters from {textbook_file}: {e}")
        return []

@app.get("/api/v1/quiz/topics/{subject_id}")
async def get_subject_topics(subject_id: str):
    """Get topics for a specific subject - AI generates unlimited questions per topic"""
    
    # Try to extract chapters from actual textbook
    chapters = extract_chapters_from_textbook(subject_id)
    
    # If chapters found, return them
    if chapters:
        return {
            "subject_id": subject_id,
            "topics": chapters,
            "total": len(chapters),
            "source": "nctb_textbook"
        }
    
    # Fallback to hardcoded topics if textbook not available
    topics_by_subject = {
        "mathematics": [
            {"id": "algebra", "topic": "algebra", "name": "বীজগণিত (Algebra)", "question_count": 999},
            {"id": "geometry", "topic": "geometry", "name": "জ্যামিতি (Geometry)", "question_count": 999},
            {"id": "trigonometry", "topic": "trigonometry", "name": "ত্রিকোণমিতি (Trigonometry)", "question_count": 999},
            {"id": "statistics", "topic": "statistics", "name": "পরিসংখ্যান (Statistics)", "question_count": 999}
        ],
        "bangla": [
            {"id": "grammar", "topic": "grammar", "name": "ব্যাকরণ (Grammar)", "question_count": 999},
            {"id": "literature", "topic": "literature", "name": "সাহিত্য (Literature)", "question_count": 999},
            {"id": "composition", "topic": "composition", "name": "রচনা (Composition)", "question_count": 999}
        ],
        "english": [
            {"id": "grammar", "topic": "grammar", "name": "Grammar", "question_count": 999},
            {"id": "vocabulary", "topic": "vocabulary", "name": "Vocabulary", "question_count": 999},
            {"id": "reading", "topic": "reading", "name": "Reading Comprehension", "question_count": 999}
        ],
        "physics": [
            {"id": "mechanics", "topic": "mechanics", "name": "বলবিদ্যা (Mechanics)", "question_count": 999},
            {"id": "electricity", "topic": "electricity", "name": "তড়িৎ (Electricity)", "question_count": 999},
            {"id": "optics", "topic": "optics", "name": "আলোকবিজ্ঞান (Optics)", "question_count": 999}
        ],
        "chemistry": [
            {"id": "organic", "topic": "organic", "name": "জৈব রসায়ন (Organic)", "question_count": 999},
            {"id": "inorganic", "topic": "inorganic", "name": "অজৈব রসায়ন (Inorganic)", "question_count": 999},
            {"id": "physical", "topic": "physical", "name": "ভৌত রসায়ন (Physical)", "question_count": 999}
        ],
        "biology": [
            {"id": "botany", "topic": "botany", "name": "উদ্ভিদবিজ্ঞান (Botany)", "question_count": 999},
            {"id": "zoology", "topic": "zoology", "name": "প্রাণিবিজ্ঞান (Zoology)", "question_count": 999},
            {"id": "human_body", "topic": "human_body", "name": "মানবদেহ (Human Body)", "question_count": 999}
        ],
        "ict": [
            {"id": "basics", "topic": "basics", "name": "মৌলিক ধারণা (Basics)", "question_count": 999},
            {"id": "internet", "topic": "internet", "name": "ইন্টারনেট (Internet)", "question_count": 999},
            {"id": "programming", "topic": "programming", "name": "প্রোগ্রামিং (Programming)", "question_count": 999}
        ]
    }
    
    topics = topics_by_subject.get(subject_id, [])
    return {
        "subject_id": subject_id,
        "topics": topics,
        "total": len(topics),
        "source": "fallback"
    }

@app.post("/api/v1/quiz/generate")
async def generate_quiz(request: dict):
    """Generate a quiz from pre-generated question bank or AI"""
    # Accept both frontend parameter names
    subject = request.get("subject", "mathematics")
    topic = request.get("topic", "")
    grade = request.get("grade", 10)
    # Accept both 'question_count' (frontend) and 'num_questions' (legacy)
    question_count = request.get("question_count") or request.get("num_questions", 5)
    time_limit_minutes = request.get("time_limit_minutes", question_count * 2)
    language = request.get("language", "english")
    difficulty = request.get("difficulty", "medium")
    
    logger.info(f"Generating quiz: subject={subject}, topic={topic}, grade={grade}, questions={question_count}, language={language}")
    
    # Try to load from question bank first
    try:
        from app.services.quiz.question_bank_service import get_question_bank_service
        qb_service = get_question_bank_service()
        
        # Get questions from bank
        questions = qb_service.get_questions(
            subject=subject,
            topic=topic if topic else None,
            difficulty=difficulty,
            num_questions=question_count
        )
        
        if questions:
            logger.info(f"✅ Loaded {len(questions)} questions from question bank")
            
            # Generate quiz ID
            quiz_id = f"quiz_{subject}_{random.randint(1000, 9999)}"
            
            # Transform questions to frontend format
            transformed_questions = transform_questions_for_frontend(
                questions, 
                subject, 
                topic or "General", 
                difficulty
            )
            
            # Store quiz for later submission
            quiz_response = {
                "quiz_id": quiz_id,
                "subject": subject,
                "topic": topic or "General",
                "grade": grade,
                "difficulty_level": {"easy": 1, "medium": 2, "hard": 3}.get(difficulty, 2),
                "bloom_level": 2,
                "question_count": len(transformed_questions),
                "questions": transformed_questions,
                "time_limit_minutes": time_limit_minutes,
                "created_at": datetime.now().isoformat()
            }
            quiz_storage[quiz_id] = quiz_response
            
            return quiz_response
    except Exception as e:
        logger.warning(f"Question bank not available, falling back to AI generation: {e}")
    
    # Fallback to AI generation if question bank not available
    try:
        from app.services.rag.rag_service import get_rag_service
        rag_service = get_rag_service()
        
        # Search for relevant content
        search_query = f"{subject} {topic}" if topic else subject
        relevant_docs = await rag_service.search_similar(
            query=search_query,
            n_results=5,
            subject_filter=subject.title()
        )
        
        # Build context from documents with more content
        context = "\n\n".join([
            f"From {doc['metadata'].get('textbook_name', 'NCTB Textbook')} (Page {doc['metadata'].get('page', 'N/A')}):\n{doc['content'][:800]}"  # Increased from 500 to 800 chars
            for doc in relevant_docs
        ]) if relevant_docs else "General knowledge from NCTB curriculum"
        
    except Exception as e:
        logger.warning(f"RAG search failed, using general knowledge: {e}")
        context = f"General {subject} knowledge from NCTB curriculum"
    
    # Generate quiz using AI
    model_name = "llama3.2:3b"  # Use larger model for quiz generation
    temperature = 0.6  # Lower temperature for more focused questions
    
    prompt = f"""You are ShikkhaSathi's Quiz Generator - creating questions DIRECTLY from NCTB textbooks for Bangladesh SSC students (Classes 9-10).

TASK: Generate {question_count} multiple-choice questions based ONLY on the textbook content provided below.

SUBJECT: {subject.title()}
TOPIC: {topic if topic else "General"}
DIFFICULTY: {difficulty}

NCTB TEXTBOOK CONTENT:
{context}

CRITICAL INSTRUCTIONS:
1. Read the textbook content carefully
2. Create questions that test understanding of the SPECIFIC information in the textbook
3. Use exact terminology and concepts from the textbook
4. Questions should reference specific facts, definitions, or examples from the text
5. DO NOT create generic questions - base everything on the provided content

QUESTION TYPES BY DIFFICULTY:
- EASY: Direct recall (definitions, facts, lists from textbook)
  Example: "According to the textbook, what is an E-book?"
  
- MEDIUM: Understanding and application (benefits, types, comparisons)
  Example: "Which benefit of E-books is mentioned in the textbook?"
  
- HARD: Analysis and evaluation (reasoning, problem-solving)
  Example: "Based on the textbook, why are smart e-books different from regular e-books?"

REQUIREMENTS:
1. Generate exactly {question_count} questions
2. Each question MUST be based on the textbook content above
3. Include page references or textbook quotes when possible
4. Each question must have:
   - Clear question text (referencing textbook content)
   - 4 options (A, B, C, D) - only ONE correct based on textbook
   - Correct answer letter
   - Explanation citing the textbook content

OUTPUT FORMAT (JSON):
{{
  "questions": [
    {{
      "question": "According to the NCTB textbook, what is the most popular e-book reader?",
      "options": {{
        "A": "iPad",
        "B": "Kindle of Amazon.com",
        "C": "Nook",
        "D": "Kobo"
      }},
      "correct_answer": "B",
      "explanation": "The textbook states: 'Kindle of Amazon.com is the most popular of all e-book readers.'"
    }}
  ]
}}

Generate the quiz now in valid JSON format based ONLY on the textbook content:"""
    
    try:
        # Call Ollama to generate quiz
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "top_p": 0.9
                }
            },
            timeout=90
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '')
            
            # Try to parse JSON from response
            try:
                # Extract JSON from response (might have extra text)
                import re
                json_match = re.search(r'\{[\s\S]*"questions"[\s\S]*\}', ai_response)
                if json_match:
                    quiz_data = json.loads(json_match.group())
                    questions = quiz_data.get('questions', [])
                else:
                    # Fallback: create sample questions
                    questions = create_fallback_quiz(subject, topic, num_questions)
            except:
                # Fallback if JSON parsing fails
                questions = create_fallback_quiz(subject, topic, num_questions)
            
            # Generate quiz ID
            quiz_id = f"quiz_{subject}_{random.randint(1000, 9999)}"
            
            # Transform questions to frontend format
            transformed_questions = transform_questions_for_frontend(
                questions[:question_count], 
                subject, 
                topic or "General", 
                difficulty
            )
            
            # Store quiz for later submission
            quiz_response = {
                "quiz_id": quiz_id,
                "subject": subject,
                "topic": topic or "General",
                "grade": 9,  # Default grade
                "difficulty_level": {"easy": 1, "medium": 2, "hard": 3}.get(difficulty, 2),
                "bloom_level": 2,
                "question_count": len(transformed_questions),
                "questions": transformed_questions,
                "time_limit_minutes": len(transformed_questions) * 2,
                "created_at": datetime.now().isoformat()
            }
            quiz_storage[quiz_id] = quiz_response
            
            return quiz_response
        else:
            # Fallback quiz
            questions = create_fallback_quiz(subject, topic, question_count)
            quiz_id = f"quiz_{subject}_{random.randint(1000, 9999)}"
            
            # Transform questions to frontend format
            transformed_questions = transform_questions_for_frontend(
                questions, 
                subject, 
                topic or "General", 
                difficulty
            )
            
            quiz_response = {
                "quiz_id": quiz_id,
                "subject": subject,
                "topic": topic or "General",
                "grade": 9,
                "difficulty_level": {"easy": 1, "medium": 2, "hard": 3}.get(difficulty, 2),
                "bloom_level": 2,
                "question_count": len(transformed_questions),
                "questions": transformed_questions,
                "time_limit_minutes": len(transformed_questions) * 2,
                "created_at": datetime.now().isoformat()
            }
            quiz_storage[quiz_id] = quiz_response
            return quiz_response
            
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        # Return fallback quiz
        questions = create_fallback_quiz(subject, topic, question_count)
        quiz_id = f"quiz_{subject}_{random.randint(1000, 9999)}"
        
        # Transform questions to frontend format
        transformed_questions = transform_questions_for_frontend(
            questions, 
            subject, 
            topic or "General", 
            difficulty
        )
        
        quiz_response = {
            "quiz_id": quiz_id,
            "subject": subject,
            "topic": topic or "General",
            "grade": 9,
            "difficulty_level": {"easy": 1, "medium": 2, "hard": 3}.get(difficulty, 2),
            "bloom_level": 2,
            "question_count": len(transformed_questions),
            "questions": transformed_questions,
            "time_limit_minutes": len(transformed_questions) * 2,
            "created_at": datetime.now().isoformat()
        }
        quiz_storage[quiz_id] = quiz_response
        return quiz_response

def create_fallback_quiz(subject: str, topic: str, num_questions: int):
    """Create fallback quiz questions when AI generation fails - based on NCTB content"""
    fallback_questions = {
        "mathematics": [
            {
                "question": "What is the value of (a+b)² according to algebraic identities?",
                "options": {"A": "a² + b²", "B": "a² + 2ab + b²", "C": "a² - 2ab + b²", "D": "2a² + 2b²"},
                "correct_answer": "B",
                "explanation": "The algebraic identity states: (a+b)² = a² + 2ab + b²"
            },
            {
                "question": "In a right-angled triangle, what is the relationship between the sides according to Pythagoras theorem?",
                "options": {"A": "a + b = c", "B": "a² + b² = c²", "C": "a² - b² = c²", "D": "ab = c²"},
                "correct_answer": "B",
                "explanation": "Pythagoras theorem: In a right triangle, a² + b² = c² where c is the hypotenuse"
            },
            {
                "question": "What is the formula for the area of a circle?",
                "options": {"A": "2πr", "B": "πr", "C": "πr²", "D": "2πr²"},
                "correct_answer": "C",
                "explanation": "The area of a circle is πr² where r is the radius"
            }
        ],
        "bangla": [
            {
                "question": "সন্ধি কাকে বলে?",
                "options": {
                    "A": "দুটি বর্ণের মিলন",
                    "B": "দুটি শব্দের মিলন",
                    "C": "দুটি বাক্যের মিলন",
                    "D": "দুটি অক্ষরের মিলন"
                },
                "correct_answer": "A",
                "explanation": "সন্ধি হলো দুটি বর্ণের মিলন যা উচ্চারণের সুবিধার জন্য করা হয়"
            },
            {
                "question": "বাংলা বর্ণমালায় মোট কতটি স্বরবর্ণ আছে?",
                "options": {"A": "৭টি", "B": "১০টি", "C": "১১টি", "D": "১৩টি"},
                "correct_answer": "C",
                "explanation": "বাংলা বর্ণমালায় মোট ১১টি স্বরবর্ণ রয়েছে"
            }
        ],
        "ict": [
            {
                "question": "According to NCTB textbook, what is an E-book?",
                "options": {
                    "A": "A physical book",
                    "B": "Electronic format of a printed book",
                    "C": "A website",
                    "D": "A mobile app"
                },
                "correct_answer": "B",
                "explanation": "E-book or electronic book is the electronic format of the printed book"
            },
            {
                "question": "Which e-book reader is mentioned as the most popular in the NCTB textbook?",
                "options": {
                    "A": "iPad",
                    "B": "Nook",
                    "C": "Kindle of Amazon.com",
                    "D": "Kobo"
                },
                "correct_answer": "C",
                "explanation": "The textbook states: 'Kindle of Amazon.com is the most popular of all e-book readers'"
            },
            {
                "question": "What format are e-books that are exact copies of printed versions usually published in?",
                "options": {
                    "A": "HTML",
                    "B": "EPUB",
                    "C": "PDF (Portable Document Format)",
                    "D": "DOC"
                },
                "correct_answer": "C",
                "explanation": "According to the textbook, exact copies are published in PDF format"
            }
        ],
        "english": [
            {
                "question": "What is a noun?",
                "options": {
                    "A": "An action word",
                    "B": "A naming word for person, place, or thing",
                    "C": "A describing word",
                    "D": "A connecting word"
                },
                "correct_answer": "B",
                "explanation": "A noun is a word that names a person, place, thing, or idea"
            }
        ]
    }
    
    # Get questions for the subject, default to mathematics if not found
    questions = fallback_questions.get(subject.lower(), fallback_questions["mathematics"])
    return questions[:num_questions]

def transform_questions_for_frontend(questions: list, subject: str, topic: str, difficulty: str) -> list:
    """Transform AI-generated questions to match frontend expected format"""
    difficulty_map = {"easy": 1, "medium": 2, "hard": 3}
    difficulty_level = difficulty_map.get(difficulty, 2)
    
    transformed = []
    for idx, q in enumerate(questions):
        # Handle both 'question' and 'question_text' fields
        question_text = q.get('question_text') or q.get('question', '')
        
        transformed.append({
            "id": str(idx),  # Frontend uses index as ID
            "question_text": question_text,
            "options": {
                "A": q.get('options', {}).get('A', ''),
                "B": q.get('options', {}).get('B', ''),
                "C": q.get('options', {}).get('C', ''),
                "D": q.get('options', {}).get('D', '')
            },
            "subject": subject,
            "topic": topic or "General",
            "difficulty_level": difficulty_level,
            "bloom_level": 2,  # Default to "Understand" level
            "correct_answer": q.get('correct_answer', 'A'),
            "explanation": q.get('explanation', '')
        })
    
    return transformed

# Store generated quizzes temporarily (in production, use database)
quiz_storage = {}

@app.post("/api/v1/quiz/submit")
async def submit_quiz(submission: dict):
    """Submit quiz answers and get results with scoring"""
    quiz_id = submission.get("quiz_id")
    answers = submission.get("answers", {})  # {question_id: answer}
    time_taken = submission.get("time_taken_seconds", 0)
    
    logger.info(f"Quiz submission: quiz_id={quiz_id}, answers={len(answers)}, time={time_taken}s")
    
    # Get quiz from storage (in production, fetch from database)
    quiz_data = quiz_storage.get(quiz_id)
    
    if not quiz_data:
        # If quiz not in storage, create mock results
        # This happens when server restarts or quiz was generated in previous session
        logger.warning(f"Quiz {quiz_id} not found in storage, creating mock results")
        
        # Calculate basic results from submitted answers
        total_questions = len(answers)
        # Assume 70% correct for mock (in production, this would be actual comparison)
        correct_count = int(total_questions * 0.7)
        incorrect_count = total_questions - correct_count
        
        results = []
        for idx, (q_id, user_answer) in enumerate(answers.items()):
            is_correct = idx < correct_count  # First 70% are "correct"
            correct_answer = user_answer if is_correct else ("B" if user_answer != "B" else "C")
            
            results.append({
                "question_id": q_id,
                "question_text": f"Question {idx + 1}",
                "student_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": "Explanation not available (quiz data expired)",
                "options": {
                    "A": "Option A",
                    "B": "Option B", 
                    "C": "Option C",
                    "D": "Option D"
                }
            })
        
        percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
        xp_earned = correct_count * 10
        
        return {
            "attempt_id": f"attempt_{random.randint(10000, 99999)}",
            "quiz_id": quiz_id,
            "score": correct_count,
            "max_score": total_questions,
            "percentage": round(percentage, 1),
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "time_taken_seconds": time_taken,
            "xp_earned": xp_earned,
            "total_xp": xp_earned,
            "level": 1,
            "level_up": False,
            "results": results,
            "performance_summary": {
                "level": "Good" if percentage >= 70 else "Needs Improvement",
                "message": f"You scored {percentage:.0f}%! {'Great job!' if percentage >= 70 else 'Keep practicing!'}",
                "recommendations": [
                    "Review the explanations for incorrect answers",
                    "Practice more questions on this topic",
                    "Try the next difficulty level" if percentage >= 80 else "Focus on understanding the basics"
                ]
            }
        }
    
    # Process quiz with actual data
    questions = quiz_data.get("questions", [])
    total_questions = len(questions)
    correct_count = 0
    incorrect_count = 0
    results = []
    
    # Create question lookup by index (since frontend uses indices as IDs)
    for idx, question in enumerate(questions):
        question_id = str(idx)  # Frontend uses index as ID
        user_answer = answers.get(question_id, "")
        correct_answer = question.get("correct_answer", "A")
        is_correct = user_answer.upper() == correct_answer.upper()
        
        if is_correct:
            correct_count += 1
        else:
            incorrect_count += 1
        
        results.append({
            "question_id": question_id,
            "question_text": question.get("question_text", ""),  # FIXED: use question_text
            "student_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "explanation": question.get("explanation", ""),
            "options": question.get("options", {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C", 
                "D": "Option D"
            })
        })
    
    # Calculate score and percentage
    percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
    
    # Calculate XP earned (10 XP per correct answer)
    xp_earned = correct_count * 10
    
    # Determine performance level
    if percentage >= 90:
        level = "Excellent"
        message = "🎉 Outstanding performance! You've mastered this topic!"
        recommendations = [
            "Try harder difficulty level",
            "Help others learn this topic",
            "Explore advanced concepts"
        ]
    elif percentage >= 70:
        level = "Good"
        message = "👍 Good job! You have a solid understanding."
        recommendations = [
            "Review incorrect answers",
            "Practice similar questions",
            "Try medium difficulty next"
        ]
    elif percentage >= 50:
        level = "Fair"
        message = "📚 You're making progress! Keep practicing."
        recommendations = [
            "Review the topic thoroughly",
            "Focus on understanding concepts",
            "Practice more basic questions"
        ]
    else:
        level = "Needs Improvement"
        message = "💪 Don't give up! Learning takes time and practice."
        recommendations = [
            "Review the lesson materials",
            "Ask your teacher for help",
            "Start with easier questions",
            "Practice regularly"
        ]
    
    # Generate attempt ID
    attempt_id = f"attempt_{quiz_id}_{random.randint(10000, 99999)}"
    
    return {
        "attempt_id": attempt_id,
        "quiz_id": quiz_id,
        "score": correct_count,
        "max_score": total_questions,
        "percentage": round(percentage, 1),
        "correct_count": correct_count,
        "incorrect_count": incorrect_count,
        "time_taken_seconds": time_taken,
        "xp_earned": xp_earned,
        "total_xp": xp_earned,  # In production, add to user's existing XP
        "level": 1,  # In production, calculate from total XP
        "level_up": False,  # In production, check if level increased
        "results": results,
        "performance_summary": {
            "level": level,
            "message": message,
            "recommendations": recommendations
        }
    }

# Student classes endpoints
@app.get("/api/v1/connect/my-classes")
async def get_my_classes(student_id: str = "1"):
    """Get student's enrolled classes"""
    # Default mock classes
    default_classes = [
        {
            "id": "class_1",
            "name": "গণিত - নবম শ্রেণী",
            "subject": "Mathematics",
            "teacher": "রহিম স্যার",
            "schedule": "রবি, মঙ্গল, বৃহস্পতি - ১০:০০ AM",
            "students_count": 25,
            "next_class": "2026-01-15T10:00:00Z"
        },
        {
            "id": "class_2",
            "name": "বাংলা - নবম শ্রেণী",
            "subject": "Bangla",
            "teacher": "করিম স্যার",
            "schedule": "সোম, বুধ, শুক্র - ১১:০০ AM",
            "students_count": 30,
            "next_class": "2026-01-15T11:00:00Z"
        }
    ]
    
    # Add joined classes for this student
    student_joined = joined_classes.get(student_id, [])
    all_classes = default_classes + student_joined
    
    return {
        "classes": all_classes,
        "total": len(all_classes)
    }

@app.post("/api/v1/connect/student/join-class")
async def student_join_class(request: dict):
    """Student joins a class using class code"""
    class_code = request.get("class_code", "")
    student_id = request.get("student_id", "1")  # Default to student 1 if not provided
    
    # Debug logging
    logger.info(f"Join class request - Code: '{class_code}', Student: '{student_id}'")
    logger.info(f"Request payload: {request}")
    
    if not class_code:
        raise HTTPException(status_code=400, detail="Class code is required")
    
    # Normalize class code to uppercase for comparison
    class_code_upper = class_code.upper().strip()
    
    # Check if class code exists in created classes
    for created_class in created_classes:
        if created_class["class_code"].upper() == class_code_upper:
            # Add to student's joined classes
            if student_id not in joined_classes:
                joined_classes[student_id] = []
            
            # Check if already joined
            if not any(c["id"] == created_class["id"] for c in joined_classes[student_id]):
                joined_classes[student_id].append({
                    "id": created_class["id"],
                    "name": created_class["name"],
                    "subject": created_class["subject"],
                    "teacher": created_class["teacher_name"],
                    "schedule": "To be announced",
                    "students_count": created_class["students_count"],
                    "next_class": None,
                    "class_code": created_class["class_code"]
                })
                logger.info(f"Student {student_id} joined class {created_class['id']}")
            
            return {
                "success": True,
                "message": f"Successfully joined {created_class['name']}",
                "class": {
                    "id": created_class["id"],
                    "name": created_class["name"],
                    "subject": created_class["subject"],
                    "teacher_name": created_class["teacher_name"],
                    "class_code": created_class["class_code"]
                }
            }
    
    # Check default classes (mock data)
    default_classes = {
        "MAT9A": {"id": "class_9a", "name": "Mathematics Grade 9A", "subject": "Mathematics", "teacher": "Teacher One"},
        "MAT9B": {"id": "class_9b", "name": "Mathematics Grade 9B", "subject": "Mathematics", "teacher": "Teacher One"},
        "PHY10B": {"id": "class_10b", "name": "Physics Grade 10B", "subject": "Physics", "teacher": "Teacher One"}
    }
    
    if class_code_upper in default_classes:
        class_info = default_classes[class_code_upper]
        
        # Add to student's joined classes
        if student_id not in joined_classes:
            joined_classes[student_id] = []
        
        # Check if already joined
        if not any(c["id"] == class_info["id"] for c in joined_classes[student_id]):
            joined_classes[student_id].append({
                "id": class_info["id"],
                "name": class_info["name"],
                "subject": class_info["subject"],
                "teacher": class_info["teacher"],
                "schedule": "Mon, Wed, Fri - 10:00 AM",
                "students_count": 25,
                "next_class": "2026-01-16T10:00:00Z",
                "class_code": class_code_upper
            })
            logger.info(f"Student {student_id} joined default class {class_info['id']}")
        
        return {
            "success": True,
            "message": f"Successfully joined {class_info['name']}",
            "class": {
                "id": class_info["id"],
                "name": class_info["name"],
                "subject": class_info["subject"],
                "teacher_name": class_info["teacher"],
                "class_code": class_code_upper
            }
        }
    
    # Class code not found
    logger.warning(f"Invalid class code attempted: '{class_code}' (normalized: '{class_code_upper}')")
    raise HTTPException(status_code=404, detail="Invalid class code. Please check and try again.")

@app.get("/api/v1/scheduled-classes/student/{student_id}")
async def get_scheduled_classes(student_id: str):
    """Get scheduled classes for a student"""
    # Default mock scheduled classes
    default_scheduled = [
        {
            "id": "sched_1",
            "class_id": "class_1",
            "class_name": "গণিত - নবম শ্রেণী",
            "subject": "Mathematics",
            "teacher": "রহিম স্যার",
            "scheduled_time": "2026-01-15T10:00:00Z",
            "duration_minutes": 60,
            "status": "scheduled",
            "meeting_link": None
        },
        {
            "id": "sched_2",
            "class_id": "class_2",
            "class_name": "বাংলা - নবম শ্রেণী",
            "subject": "Bangla",
            "teacher": "করিম স্যার",
            "scheduled_time": "2026-01-15T11:00:00Z",
            "duration_minutes": 60,
            "status": "scheduled",
            "meeting_link": None
        }
    ]
    
    # Get student's joined classes
    student_classes = joined_classes.get(student_id, [])
    student_class_ids = [c["id"] for c in student_classes]
    
    # Filter scheduled classes that match student's joined classes
    student_scheduled = []
    for sc in scheduled_classes:
        if sc.get("class_id") in student_class_ids:
            student_scheduled.append({
                "id": sc["id"],
                "class_id": sc["class_id"],
                "class_name": sc["class_name"],
                "subject": sc["subject"],
                "teacher": sc.get("teacher_id", "Teacher"),
                "scheduled_time": sc["scheduled_time"],
                "duration_minutes": sc["duration_minutes"],
                "status": sc["status"],
                "meeting_link": sc.get("meeting_link"),
                "topic": sc.get("topic"),
                "description": sc.get("description")
            })
    
    # Combine default and student's scheduled classes
    all_scheduled = default_scheduled + student_scheduled
    
    return {
        "scheduled_classes": all_scheduled,
        "total": len(all_scheduled)
    }

@app.get("/api/v1/scheduled-classes/teacher/{teacher_id}")
async def get_teacher_scheduled_classes(teacher_id: str):
    """Get scheduled classes for a teacher"""
    # Default mock classes
    default_scheduled = [
        {
            "id": "sched_teacher_1",
            "class_id": "class_math_9a",
            "class_name": "Mathematics - Class 9A",
            "subject": "Mathematics",
            "grade": 9,
            "section": "A",
            "scheduled_time": "2026-01-16T10:00:00Z",
            "duration_minutes": 60,
            "status": "scheduled",
            "students_enrolled": 25,
            "topic": "Quadratic Equations",
            "description": "Introduction to quadratic equations and their solutions",
            "meeting_link": None,
            "created_at": "2026-01-15T08:00:00Z"
        },
        {
            "id": "sched_teacher_2",
            "class_id": "class_physics_10b",
            "class_name": "Physics - Class 10B",
            "subject": "Physics",
            "grade": 10,
            "section": "B",
            "scheduled_time": "2026-01-16T14:00:00Z",
            "duration_minutes": 45,
            "status": "scheduled",
            "students_enrolled": 28,
            "topic": "Motion and Forces",
            "description": "Understanding Newton's laws of motion",
            "meeting_link": None,
            "created_at": "2026-01-15T09:00:00Z"
        },
        {
            "id": "sched_teacher_3",
            "class_id": "class_chemistry_9b",
            "class_name": "Chemistry - Class 9B",
            "subject": "Chemistry",
            "grade": 9,
            "section": "B",
            "scheduled_time": "2026-01-17T11:00:00Z",
            "duration_minutes": 60,
            "status": "scheduled",
            "students_enrolled": 30,
            "topic": "Periodic Table",
            "description": "Elements and their properties",
            "meeting_link": None,
            "created_at": "2026-01-15T10:00:00Z"
        }
    ]
    
    # Filter created scheduled classes for this teacher
    teacher_scheduled = [sc for sc in scheduled_classes if sc.get("teacher_id") == teacher_id]
    
    # Combine default and created scheduled classes
    all_scheduled = default_scheduled + teacher_scheduled
    
    return {
        "scheduled_classes": all_scheduled,
        "total": len(all_scheduled),
        "upcoming_count": len(all_scheduled),
        "today_count": 0,
        "this_week_count": len(all_scheduled)
    }

@app.post("/api/v1/scheduled-classes/create")
async def create_scheduled_class(request: dict):
    """Create a new scheduled class"""
    try:
        class_id = request.get("class_id")
        class_name = request.get("class_name", "")
        subject = request.get("subject", "")
        grade = request.get("grade", 9)
        section = request.get("section", "A")
        scheduled_time = request.get("scheduled_time", "")
        duration_minutes = request.get("duration_minutes", 60)
        topic = request.get("topic", "")
        description = request.get("description", "")
        teacher_id = request.get("teacher_id", "teacher_001")
        
        # Generate scheduled class ID
        scheduled_id = f"sched_{random.randint(1000, 9999)}"
        
        # Create scheduled class object
        new_scheduled_class = {
            "id": scheduled_id,
            "class_id": class_id,
            "class_name": class_name,
            "subject": subject,
            "grade": grade,
            "section": section,
            "scheduled_time": scheduled_time,
            "duration_minutes": duration_minutes,
            "status": "scheduled",
            "students_enrolled": 0,
            "topic": topic,
            "description": description,
            "meeting_link": None,
            "teacher_id": teacher_id,
            "created_at": datetime.now().isoformat()
        }
        
        # Store in memory
        scheduled_classes.append(new_scheduled_class)
        
        logger.info(f"Created scheduled class: {scheduled_id} for {class_name}")
        
        return {
            "success": True,
            "message": "Class scheduled successfully",
            "scheduled_class": new_scheduled_class
        }
        
    except Exception as e:
        logger.error(f"Error creating scheduled class: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule class: {str(e)}")

@app.get("/api/v1/scheduled-classes/{schedule_id}")
async def get_scheduled_class(schedule_id: str):
    """Get a single scheduled class by ID"""
    try:
        # Search in created scheduled classes
        for sc in scheduled_classes:
            if sc["id"] == schedule_id:
                logger.info(f"Found scheduled class: {schedule_id}")
                return {
                    "success": True,
                    "scheduled_class": sc
                }
        
        # If not found, check if it's a mock class ID and return mock data
        logger.info(f"Returning mock data for scheduled class: {schedule_id}")
        
        # Generate mock scheduled class data
        mock_class = {
            "id": schedule_id,
            "class_id": "class_001",
            "title": "Live Mathematics Class",
            "description": "Interactive math session covering algebra and geometry",
            "teacher_id": "2",
            "teacher_name": "Teacher One",
            "scheduled_date": "2026-01-15",
            "scheduled_time": "14:00:00",
            "duration": 60,
            "status": "live",
            "notify_before": 15,
            "max_participants": 50,
            "participants": [],
            "meeting_url": f"http://localhost:5174/live/{schedule_id}",
            "meeting_id": schedule_id,
            "meeting_link": f"ws://localhost:8001/class/{schedule_id}",
            "is_recurring": False,
            "created_at": "2026-01-15T10:00:00"
        }
        
        return {
            "success": True,
            "scheduled_class": mock_class
        }
        
    except Exception as e:
        logger.error(f"Error fetching scheduled class: {e}")
        raise HTTPException(status_code=404, detail=f"Scheduled class not found: {schedule_id}")

@app.post("/api/v1/scheduled-classes/{schedule_id}/start")
async def start_scheduled_class(schedule_id: str):
    """Start a scheduled class (change status to 'live')"""
    try:
        # Find the scheduled class
        for sc in scheduled_classes:
            if sc["id"] == schedule_id:
                sc["status"] = "live"
                sc["meeting_link"] = f"ws://localhost:8001/class/{schedule_id}"
                logger.info(f"Started scheduled class: {schedule_id}")
                return {
                    "success": True,
                    "message": "Class started successfully",
                    "meeting_link": sc["meeting_link"],
                    "scheduled_class": sc
                }
        
        # If not found in created classes, return success for mock classes
        logger.info(f"Starting mock scheduled class: {schedule_id}")
        return {
            "success": True,
            "message": "Class started successfully",
            "meeting_link": f"ws://localhost:8001/class/{schedule_id}",
            "scheduled_class": {
                "id": schedule_id,
                "status": "live",
                "meeting_link": f"ws://localhost:8001/class/{schedule_id}"
            }
        }
        
    except Exception as e:
        logger.error(f"Error starting scheduled class: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start class: {str(e)}")

@app.post("/api/v1/scheduled-classes/{schedule_id}/join")
async def join_scheduled_class(schedule_id: str, request: dict):
    """Join a scheduled class (add participant)"""
    try:
        student_id = request.get("student_id")
        student_name = request.get("student_name", "Student")
        
        # Find the scheduled class and add participant
        for sc in scheduled_classes:
            if sc["id"] == schedule_id:
                if "participants" not in sc:
                    sc["participants"] = []
                
                # Check if student already joined
                if not any(p.get("student_id") == student_id for p in sc["participants"]):
                    sc["participants"].append({
                        "student_id": student_id,
                        "student_name": student_name,
                        "joined_at": datetime.now().isoformat()
                    })
                
                logger.info(f"Student {student_id} joined scheduled class: {schedule_id}")
                return {
                    "success": True,
                    "message": "Joined class successfully",
                    "meeting_url": f"http://localhost:5174/live/{schedule_id}",
                    "scheduled_class": sc
                }
        
        # If not found, return success for mock classes
        logger.info(f"Student {student_id} joining mock scheduled class: {schedule_id}")
        return {
            "success": True,
            "message": "Joined class successfully",
            "meeting_url": f"http://localhost:5174/live/{schedule_id}"
        }
        
    except Exception as e:
        logger.error(f"Error joining scheduled class: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to join class: {str(e)}")


# Voice service endpoints
@app.post("/api/v1/voice/test-synthesize")
async def test_voice_synthesize(request: dict):
    """Test voice synthesis endpoint (mock)"""
    return {
        "status": "unavailable",
        "message": "Voice synthesis is not available in development mode",
        "text": request.get("text", ""),
        "audio_url": None
    }

@app.post("/api/v1/voice/synthesize")
async def voice_synthesize(request: dict):
    """Voice synthesis endpoint (mock)"""
    return {
        "status": "unavailable",
        "message": "Voice synthesis requires ElevenLabs API key",
        "text": request.get("text", ""),
        "audio_url": None
    }

# Additional endpoints for testing
@app.get("/api/v1/models")
async def list_models():
    """List available Ollama models"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = [{"name": m['name'], "size": m.get('size', 0)} for m in data.get('models', [])]
            return {"models": models, "status": "available"}
        else:
            return {"models": [], "status": "error", "message": "Ollama not responding"}
    except Exception as e:
        return {"models": [], "status": "error", "message": str(e)}

@app.post("/api/v1/test-model")
async def test_model(request: dict):
    """Test a specific model"""
    model_name = request.get("model", "llama3.2:1b")
    test_message = request.get("message", "Hello, please respond with 'OK' if you can understand this.")
    
    response_text = await call_ollama_model(model_name, test_message)
    
    return {
        "model": model_name,
        "test_message": test_message,
        "response": response_text,
        "status": "success" if response_text and "sorry" not in response_text.lower() else "error"
    }

# Teacher Dashboard Endpoints
@app.get("/api/v1/dashboard/teacher")
async def get_teacher_dashboard():
    """Get teacher dashboard data (mock)"""
    return {
        "teacher_id": "teacher_001",
        "name": "Teacher Name",
        "total_students": 45,
        "total_classes": 8,
        "upcoming_classes": 3,
        "pending_assessments": 5,
        "recent_activities": [
            {
                "id": 1,
                "type": "quiz_created",
                "title": "Mathematics Quiz - Chapter 5",
                "timestamp": "2026-01-15T08:00:00",
                "students_completed": 12,
                "total_students": 45
            },
            {
                "id": 2,
                "type": "class_scheduled",
                "title": "Physics Class - Motion",
                "timestamp": "2026-01-15T10:00:00",
                "duration": 60
            }
        ],
        "class_performance": {
            "average_score": 78.5,
            "completion_rate": 85.2,
            "improvement": 5.3
        }
    }

@app.get("/api/v1/connect/teacher/dashboard")
async def get_teacher_dashboard_connect():
    """Get teacher dashboard data - frontend compatible endpoint"""
    
    # Combine default classes with created classes
    default_classes = [
        {
            "id": "class_9a",
            "name": "Class 9A - Mathematics",
            "subject": "Mathematics",
            "grade": 9,
            "students_count": 25,
            "average_score": 82.3,
            "last_activity": "2026-01-15T09:00:00Z",
            "status": "active"
        },
        {
            "id": "class_9b",
            "name": "Class 9B - Chemistry",
            "subject": "Chemistry", 
            "grade": 9,
            "students_count": 30,
            "average_score": 76.8,
            "last_activity": "2026-01-14T16:30:00Z",
            "status": "active"
        },
        {
            "id": "class_10b",
            "name": "Class 10B - Physics",
            "subject": "Physics",
            "grade": 10,
            "students_count": 28,
            "average_score": 79.1,
            "last_activity": "2026-01-15T10:00:00Z",
            "status": "active"
        }
    ]
    
    # Convert created classes to dashboard format
    dashboard_created_classes = []
    for created_class in created_classes:
        dashboard_created_classes.append({
            "id": created_class["id"],
            "name": f"{created_class['name']} - {created_class['subject']}",
            "subject": created_class["subject"],
            "grade": created_class["grade_level"],
            "students_count": created_class["students_count"],
            "average_score": 0.0,  # New class, no scores yet
            "last_activity": created_class["created_at"],
            "status": created_class["status"],
            "class_code": created_class["class_code"],
            "description": created_class.get("description", "")
        })
    
    # Combine all classes
    all_classes = default_classes + dashboard_created_classes
    
    return {
        "teacher_id": "teacher_001",
        "name": "Teacher Name",
        "email": "teacher1@example.com",
        "total_students": 45 + sum(c["students_count"] for c in dashboard_created_classes),
        "total_classes": len(all_classes),
        "upcoming_classes": 3,
        "pending_assessments": 5,
        "recent_activities": [
            {
                "id": 1,
                "type": "quiz_created",
                "title": "Mathematics Quiz - Chapter 5",
                "timestamp": "2026-01-15T08:00:00Z",
                "students_completed": 12,
                "total_students": 45,
                "subject": "Mathematics",
                "class_name": "Class 9A"
            },
            {
                "id": 2,
                "type": "class_scheduled",
                "title": "Physics Class - Motion",
                "timestamp": "2026-01-15T10:00:00Z",
                "duration": 60,
                "subject": "Physics",
                "class_name": "Class 10B"
            },
            {
                "id": 3,
                "type": "assignment_submitted",
                "title": "Chemistry Assignment - Periodic Table",
                "timestamp": "2026-01-14T16:30:00Z",
                "submissions": 28,
                "total_students": 30,
                "subject": "Chemistry",
                "class_name": "Class 9B"
            }
        ] + [
            # Add recent activities for newly created classes
            {
                "id": f"created_{i}",
                "type": "class_created",
                "title": f"New Class: {created_class['name']}",
                "timestamp": created_class["created_at"],
                "subject": created_class["subject"],
                "class_name": created_class["name"],
                "class_code": created_class["class_code"]
            } for i, created_class in enumerate(created_classes[-3:])  # Show last 3 created classes
        ],
        "class_performance": {
            "average_score": 78.5,
            "completion_rate": 85.2,
            "improvement": 5.3,
            "top_performing_class": "Class 9A",
            "needs_attention_class": "Class 10C"
        },
        "classes": all_classes,
        "quick_stats": {
            "total_quizzes_created": 15,
            "total_assignments": 8,
            "pending_grading": 12,
            "active_students": 83 + sum(c["students_count"] for c in dashboard_created_classes),
            "this_week_activities": 24 + len(created_classes)
        },
        "notifications": [
            {
                "id": "notif_1",
                "type": "assignment_due",
                "message": "Chemistry assignment due in 2 days",
                "class_name": "Class 9B",
                "priority": "medium",
                "timestamp": "2026-01-15T08:00:00Z"
            },
            {
                "id": "notif_2", 
                "type": "low_performance",
                "message": "Class 10C showing declining performance",
                "class_name": "Class 10C",
                "priority": "high",
                "timestamp": "2026-01-14T15:00:00Z"
            }
        ] + [
            # Add notifications for newly created classes
            {
                "id": f"new_class_{i}",
                "type": "class_created",
                "message": f"New class '{created_class['name']}' created successfully",
                "class_name": created_class["name"],
                "priority": "low",
                "timestamp": created_class["created_at"],
                "class_code": created_class["class_code"]
            } for i, created_class in enumerate(created_classes[-2:])  # Show last 2 created classes
        ]
    }

@app.get("/api/v1/teacher/students")
async def get_teacher_students():
    """Get list of students for teacher (mock)"""
    return {
        "students": [
            {
                "id": "student_001",
                "name": "Student One",
                "email": "student1@example.com",
                "class": "Class 9",
                "average_score": 85.5,
                "quizzes_completed": 12,
                "last_active": "2026-01-15T08:30:00",
                "status": "active"
            },
            {
                "id": "student_002",
                "name": "Student Two",
                "email": "student2@example.com",
                "class": "Class 9",
                "average_score": 72.3,
                "quizzes_completed": 10,
                "last_active": "2026-01-14T15:20:00",
                "status": "active"
            },
            {
                "id": "student_003",
                "name": "Student Three",
                "email": "student3@example.com",
                "class": "Class 10",
                "average_score": 91.2,
                "quizzes_completed": 15,
                "last_active": "2026-01-15T09:00:00",
                "status": "active"
            }
        ],
        "total": 3,
        "class_average": 83.0
    }

@app.post("/api/v1/connect/teacher/create-class")
async def create_teacher_class(class_data: dict):
    """Create a new class for teacher"""
    class_name = class_data.get("class_name", "New Class")
    subject = class_data.get("subject", "General")
    grade_level = class_data.get("grade_level", 9)
    section = class_data.get("section", "A")
    description = class_data.get("description", "")
    
    # Generate class ID and code
    class_id = f"class_{subject.lower()}_{grade_level}{section.lower()}_{random.randint(1000, 9999)}"
    # Generate 6-character code: 3 letters + 2 digits + 1 letter (e.g., MAT9A1)
    class_code = f"{subject[:3].upper()}{grade_level}{section}{random.randint(1, 9)}"
    
    # Create class response
    new_class = {
        "id": class_id,
        "class_code": class_code,
        "name": class_name,
        "subject": subject,
        "grade_level": grade_level,
        "section": section,
        "description": description,
        "teacher_id": "teacher_001",
        "teacher_name": "Teacher Name",
        "students_count": 0,
        "max_students": 40,
        "status": "active",
        "created_at": datetime.now().isoformat(),
        "join_url": f"http://localhost:5174/join-class/{class_code}",
        "settings": {
            "allow_late_submissions": True,
            "auto_grade": True,
            "show_correct_answers": True,
            "time_limit_enabled": False
        }
    }
    
    # Store the created class in memory
    created_classes.append(new_class)
    
    return {
        "success": True,
        "message": "Class created successfully",
        "class": new_class,
        "class_code": class_code,
        "join_instructions": f"Students can join this class using code: {class_code}"
    }

@app.delete("/api/v1/connect/teacher/delete-class/{class_id}")
async def delete_teacher_class(class_id: str):
    """Delete a class for teacher"""
    global created_classes
    
    # Find and remove the class from created_classes
    class_found = False
    class_name = ""
    
    for i, created_class in enumerate(created_classes):
        if created_class["id"] == class_id:
            class_name = created_class["name"]
            created_classes.pop(i)
            class_found = True
            break
    
    if class_found:
        return {
            "success": True,
            "message": f"Class '{class_name}' deleted successfully",
            "deleted_class_id": class_id
        }
    else:
        # Check if it's a default class (these can't be deleted in this implementation)
        default_class_ids = ["class_9a", "class_9b", "class_10b"]
        if class_id in default_class_ids:
            return {
                "success": False,
                "message": "Cannot delete default demo classes",
                "error": "Default classes are read-only"
            }
        else:
            return {
                "success": False,
                "message": "Class not found",
                "error": "Class does not exist or has already been deleted"
            }

# Live Class Endpoints
@app.post("/api/v1/classes/schedule")
async def schedule_class(request: dict):
    """Schedule a new class (mock)"""
    class_id = f"class_{random.randint(1000, 9999)}"
    return {
        "class_id": class_id,
        "title": request.get("title", "New Class"),
        "subject": request.get("subject", "General"),
        "scheduled_time": request.get("scheduled_time"),
        "duration_minutes": request.get("duration_minutes", 60),
        "teacher_id": "teacher_001",
        "status": "scheduled",
        "join_url": f"https://localhost:5174/live-class/{class_id}",
        "created_at": datetime.now().isoformat()
    }

@app.get("/api/v1/classes/scheduled")
async def get_all_scheduled_classes():
    """Get all scheduled classes (mock)"""
    return {
        "classes": [
            {
                "class_id": "class_1001",
                "title": "Mathematics - Algebra",
                "subject": "Mathematics",
                "teacher_name": "Teacher Name",
                "scheduled_time": "2026-01-16T10:00:00",
                "duration_minutes": 60,
                "status": "scheduled",
                "enrolled_students": 25
            },
            {
                "class_id": "class_1002",
                "title": "Physics - Motion",
                "subject": "Physics",
                "teacher_name": "Teacher Name",
                "scheduled_time": "2026-01-16T14:00:00",
                "duration_minutes": 45,
                "status": "scheduled",
                "enrolled_students": 30
            }
        ],
        "total": 2
    }

# RAG Status Endpoint
@app.get("/api/v1/rag/status")
async def get_rag_status():
    """Get RAG system status"""
    try:
        from app.services.rag.rag_service import get_rag_service
        rag_service = get_rag_service()
        
        # Get collection stats
        collection = rag_service.collection
        doc_count = collection.count()
        
        return {
            "status": "operational",
            "document_count": doc_count,
            "collection_name": "nctb_curriculum",
            "vector_db": "ChromaDB",
            "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
            "subjects_loaded": [
                "Mathematics",
                "Bangla",
                "English",
                "Physics",
                "Chemistry",
                "ICT"
            ],
            "last_updated": "2026-01-15T08:00:00"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "document_count": 0
        }

# Learning Arena Endpoints
@app.get("/api/v1/learning/arenas")
async def get_learning_arenas():
    """Get available learning arenas"""
    return {
        "arenas": [
            {
                "id": "math_kingdom",
                "name": "Mathematics Kingdom",
                "description": "Explore the magical world of numbers and equations",
                "subject": "Mathematics",
                "difficulty": "beginner",
                "total_adventures": 15,
                "completed_adventures": 0,
                "xp_reward": 100,
                "estimated_time": "2-3 hours",
                "icon": "🏰",
                "color": "blue",
                "status": "available",
                "prerequisites": [],
                "skills": ["Arithmetic", "Algebra", "Geometry"],
                "achievements": ["Number Master", "Equation Solver", "Geometry Explorer"]
            },
            {
                "id": "science_lab",
                "name": "Science Laboratory",
                "description": "Conduct virtual experiments and discover scientific principles",
                "subject": "Physics",
                "difficulty": "intermediate",
                "total_adventures": 12,
                "completed_adventures": 0,
                "xp_reward": 150,
                "estimated_time": "3-4 hours",
                "icon": "🧪",
                "color": "green",
                "status": "available",
                "prerequisites": [],
                "skills": ["Experiments", "Observations", "Analysis"],
                "achievements": ["Lab Assistant", "Hypothesis Hero", "Discovery Master"]
            },
            {
                "id": "language_library",
                "name": "Language Library",
                "description": "Master Bangla literature and language skills",
                "subject": "Bangla",
                "difficulty": "beginner",
                "total_adventures": 10,
                "completed_adventures": 0,
                "xp_reward": 120,
                "estimated_time": "2-3 hours",
                "icon": "📚",
                "color": "purple",
                "status": "available",
                "prerequisites": [],
                "skills": ["Reading", "Writing", "Grammar"],
                "achievements": ["Word Wizard", "Grammar Guardian", "Story Teller"]
            },
            {
                "id": "history_museum",
                "name": "History Museum",
                "description": "Travel through time and explore Bangladesh's rich history",
                "subject": "History",
                "difficulty": "intermediate",
                "total_adventures": 8,
                "completed_adventures": 0,
                "xp_reward": 130,
                "estimated_time": "2-3 hours",
                "icon": "🏛️",
                "color": "orange",
                "status": "coming_soon",
                "prerequisites": [],
                "skills": ["Timeline", "Events", "Culture"],
                "achievements": ["Time Traveler", "Culture Keeper", "History Hero"]
            }
        ],
        "total_arenas": 4,
        "available_arenas": 3,
        "user_progress": {
            "total_xp": 0,
            "completed_arenas": 0,
            "current_streak": 0,
            "favorite_subject": "Mathematics"
        }
    }

@app.get("/api/v1/learning/arenas/{arena_id}")
async def get_arena_details(arena_id: str):
    """Get detailed information about a specific arena"""
    arena_details = {
        "math_kingdom": {
            "id": "math_kingdom",
            "name": "Mathematics Kingdom",
            "description": "Welcome to the Mathematics Kingdom! Here you'll embark on exciting adventures through the world of numbers, equations, and geometric shapes.",
            "subject": "Mathematics",
            "difficulty": "beginner",
            "total_adventures": 15,
            "completed_adventures": 0,
            "xp_reward": 100,
            "estimated_time": "2-3 hours",
            "icon": "🏰",
            "color": "blue",
            "status": "available",
            "long_description": "The Mathematics Kingdom is a magical realm where numbers come alive and equations tell stories. Students will journey through different lands, each focusing on a specific mathematical concept. From the Arithmetic Village to the Algebra Castle, every location offers unique challenges and rewards.",
            "learning_objectives": [
                "Master basic arithmetic operations",
                "Understand algebraic concepts",
                "Explore geometric shapes and properties",
                "Develop problem-solving skills",
                "Build mathematical confidence"
            ],
            "adventures": [
                {
                    "id": "arithmetic_village",
                    "name": "Arithmetic Village",
                    "description": "Learn the fundamentals of addition, subtraction, multiplication, and division",
                    "difficulty": "easy",
                    "xp_reward": 20,
                    "estimated_time": "15 minutes",
                    "status": "available",
                    "type": "interactive_lesson"
                },
                {
                    "id": "fraction_forest",
                    "name": "Fraction Forest",
                    "description": "Navigate through the forest of fractions and decimals",
                    "difficulty": "medium",
                    "xp_reward": 25,
                    "estimated_time": "20 minutes",
                    "status": "locked",
                    "type": "puzzle_game"
                },
                {
                    "id": "algebra_castle",
                    "name": "Algebra Castle",
                    "description": "Solve algebraic equations to unlock the castle's secrets",
                    "difficulty": "hard",
                    "xp_reward": 30,
                    "estimated_time": "25 minutes",
                    "status": "locked",
                    "type": "challenge"
                }
            ],
            "achievements": [
                {
                    "id": "number_master",
                    "name": "Number Master",
                    "description": "Complete all arithmetic challenges",
                    "icon": "🔢",
                    "xp_reward": 50,
                    "unlocked": False
                },
                {
                    "id": "equation_solver",
                    "name": "Equation Solver",
                    "description": "Solve 10 algebraic equations correctly",
                    "icon": "⚖️",
                    "xp_reward": 75,
                    "unlocked": False
                }
            ],
            "prerequisites": [],
            "skills": ["Arithmetic", "Algebra", "Geometry"],
            "difficulty_progression": "Starts with basic arithmetic and gradually introduces more complex concepts"
        },
        "science_lab": {
            "id": "science_lab",
            "name": "Science Laboratory",
            "description": "Welcome to the Science Laboratory! Conduct virtual experiments and discover the wonders of physics and chemistry.",
            "subject": "Physics",
            "difficulty": "intermediate",
            "total_adventures": 12,
            "completed_adventures": 0,
            "xp_reward": 150,
            "estimated_time": "3-4 hours",
            "icon": "🧪",
            "color": "green",
            "status": "available",
            "long_description": "The Science Laboratory is your gateway to understanding the natural world through hands-on experiments and observations.",
            "learning_objectives": [
                "Understand scientific method",
                "Conduct virtual experiments",
                "Analyze data and draw conclusions",
                "Learn physics and chemistry concepts"
            ],
            "adventures": [
                {
                    "id": "motion_lab",
                    "name": "Motion Laboratory",
                    "description": "Explore the laws of motion through interactive experiments",
                    "difficulty": "medium",
                    "xp_reward": 25,
                    "estimated_time": "20 minutes",
                    "status": "available",
                    "type": "experiment"
                }
            ],
            "achievements": [
                {
                    "id": "lab_assistant",
                    "name": "Lab Assistant",
                    "description": "Complete your first experiment",
                    "icon": "🥽",
                    "xp_reward": 30,
                    "unlocked": False
                }
            ],
            "prerequisites": [],
            "skills": ["Experiments", "Observations", "Analysis"]
        }
    }
    
    if arena_id not in arena_details:
        raise HTTPException(status_code=404, detail="Arena not found")
    
    return arena_details[arena_id]

@app.get("/api/v1/learning/adventures/{adventure_id}")
async def get_adventure_details(adventure_id: str):
    """Get detailed information about a specific adventure"""
    adventure_details = {
        "arithmetic_village": {
            "id": "arithmetic_village",
            "name": "Arithmetic Village",
            "description": "Welcome to Arithmetic Village, where numbers live in harmony! Learn the basic operations that form the foundation of all mathematics.",
            "arena_id": "math_kingdom",
            "difficulty": "easy",
            "xp_reward": 20,
            "estimated_time": "15 minutes",
            "status": "available",
            "type": "interactive_lesson",
            "content": {
                "introduction": "In Arithmetic Village, you'll meet friendly numbers who love to play together through addition, subtraction, multiplication, and division.",
                "learning_objectives": [
                    "Understand the four basic operations",
                    "Practice mental math skills",
                    "Apply arithmetic in real-world scenarios"
                ],
                "activities": [
                    {
                        "type": "tutorial",
                        "title": "Meet the Numbers",
                        "description": "Interactive introduction to basic operations"
                    },
                    {
                        "type": "practice",
                        "title": "Village Market Math",
                        "description": "Solve arithmetic problems in a market setting"
                    },
                    {
                        "type": "quiz",
                        "title": "Village Champion Challenge",
                        "description": "Test your arithmetic skills"
                    }
                ]
            },
            "rewards": {
                "xp": 20,
                "badges": ["Arithmetic Apprentice"],
                "unlocks": ["fraction_forest"]
            }
        },
        "motion_lab": {
            "id": "motion_lab",
            "name": "Motion Laboratory",
            "description": "Explore the fascinating world of motion and forces through interactive experiments.",
            "arena_id": "science_lab",
            "difficulty": "medium",
            "xp_reward": 25,
            "estimated_time": "20 minutes",
            "status": "available",
            "type": "experiment",
            "content": {
                "introduction": "Welcome to the Motion Laboratory! Here you'll discover how objects move and what forces affect their motion.",
                "learning_objectives": [
                    "Understand Newton's laws of motion",
                    "Explore concepts of velocity and acceleration",
                    "Analyze force and motion relationships"
                ],
                "activities": [
                    {
                        "type": "simulation",
                        "title": "Pendulum Experiment",
                        "description": "Observe how pendulum length affects swing time"
                    },
                    {
                        "type": "calculation",
                        "title": "Speed and Velocity",
                        "description": "Calculate speed and velocity in different scenarios"
                    },
                    {
                        "type": "quiz",
                        "title": "Motion Master Quiz",
                        "description": "Test your understanding of motion concepts"
                    }
                ]
            },
            "rewards": {
                "xp": 25,
                "badges": ["Motion Explorer"],
                "unlocks": ["force_lab"]
            }
        }
    }
    
    if adventure_id not in adventure_details:
        raise HTTPException(status_code=404, detail="Adventure not found")
    
    return adventure_details[adventure_id]

@app.post("/api/v1/learning/adventures/{adventure_id}/start")
async def start_adventure(adventure_id: str):
    """Start a learning adventure"""
    return {
        "adventure_id": adventure_id,
        "session_id": f"session_{adventure_id}_{random.randint(1000, 9999)}",
        "status": "started",
        "start_time": datetime.now().isoformat(),
        "message": "Adventure started successfully!",
        "next_step": "tutorial"
    }

@app.post("/api/v1/learning/adventures/{adventure_id}/complete")
async def complete_adventure(adventure_id: str, completion_data: dict):
    """Complete a learning adventure and award XP"""
    score = completion_data.get("score", 0)
    time_spent = completion_data.get("time_spent", 0)
    
    # Calculate XP based on performance
    base_xp = 20
    bonus_xp = min(score // 10, 10)  # Bonus XP for high scores
    total_xp = base_xp + bonus_xp
    
    return {
        "adventure_id": adventure_id,
        "status": "completed",
        "completion_time": datetime.now().isoformat(),
        "score": score,
        "time_spent": time_spent,
        "xp_earned": total_xp,
        "achievements_unlocked": [],
        "next_adventure": "fraction_forest" if adventure_id == "arithmetic_village" else None,
        "message": f"Congratulations! You earned {total_xp} XP!"
    }

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎓 ShikkhaSathi - Development Server with Ollama")
    print("="*60)
    print("Features:")
    print("• Multi-Model AI (llama3.2:1b, llama3.2:3b, phi3:mini)")
    print("• RAG System (NCTB curriculum)")
    print("• Subject-specific optimization")
    print("• GPU acceleration")
    print("="*60 + "\n")
    
    uvicorn.run(
        "run_dev_with_ollama:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )