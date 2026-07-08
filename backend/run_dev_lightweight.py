#!/usr/bin/env python3
"""
Lightweight development server for ShikkhaSathi
Fast startup with minimal dependencies
"""

import sys
import os
import uvicorn
import logging
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
    title="ShikkhaSathi Lightweight API",
    description="Fast-loading development server for ShikkhaSathi",
    version="1.0.0-lightweight",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
if CONFIG_AVAILABLE:
    cors_origins = dev_settings.BACKEND_CORS_ORIGINS
else:
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5173",
        "https://localhost:5174",
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
    print("🚀 Starting ShikkhaSathi Lightweight Server...")
    if CONFIG_AVAILABLE:
        try:
            create_tables()
            print("✅ Database initialized")
        except Exception as e:
            print(f"⚠️  Database initialization warning: {e}")
    print("🌐 Lightweight server ready!")

# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "ShikkhaSathi Lightweight API",
        "version": "1.0.0-lightweight",
        "status": "running",
        "mode": "lightweight",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mode": "lightweight"
    }

@app.get("/api/v1/health")
async def health_check_v1():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mode": "lightweight"
    }

@app.head("/api/v1/health")
async def health_check_head():
    """Health check HEAD endpoint for monitoring"""
    return Response(status_code=200)

# Mock authentication
@app.post("/api/v1/auth/login")
async def login(credentials: dict):
    email = credentials.get("email", "")
    password = credentials.get("password", "")
    
    # Simple mock authentication
    if email and password:
        return {
            "access_token": f"mock_token_{hash(email) % 10000}",
            "token_type": "bearer",
            "user": {
                "id": hash(email) % 1000,
                "email": email,
                "name": "Test User",
                "role": "student",
                "is_active": True
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/v1/auth/register")
async def register(user_data: dict):
    """Mock user registration endpoint"""
    required_fields = ["email", "password", "full_name"]
    
    # Validate required fields
    for field in required_fields:
        if not user_data.get(field):
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    email = user_data.get("email", "")
    password = user_data.get("password", "")
    full_name = user_data.get("full_name", "")
    role = user_data.get("role", "student")
    phone = user_data.get("phone", "")
    grade = user_data.get("grade")
    medium = user_data.get("medium", "bangla")
    school = user_data.get("school", "")
    district = user_data.get("district", "")
    
    # Basic email validation
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Basic password validation
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    # Mock successful registration
    user_id = hash(email) % 1000
    
    return {
        "message": "User registered successfully",
        "user": {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "phone": phone,
            "grade": grade,
            "medium": medium,
            "school": school,
            "district": district,
            "is_active": True,
            "created_at": datetime.now().isoformat()
        }
    }

# Mock AI chat (lightweight)
@app.post("/api/v1/chat/chat")
async def ai_chat(request: dict):
    message = request.get("message", "").lower()
    model_category = request.get("model_category", "general")
    ai_mode = request.get("ai_mode", "tutor")
    conversation_history = request.get("conversation_history", [])
    
    # 🔍 RAG Integration: Search for relevant content from NCTB curriculum
    try:
        from app.services.rag.rag_service import get_rag_service
        rag_service = get_rag_service()
        
        logger.info(f"RAG service initialized: {rag_service is not None}")
        
        if rag_service:
            # Map model category to subject filter
            subject_filter = None
            if model_category == "math":
                subject_filter = "Mathematics"
            elif model_category == "bangla":
                subject_filter = "Bangla"
            # general model searches all subjects
            
            logger.info(f"Searching RAG for: '{request.get('message', '')}' with subject filter: {subject_filter}")
            
            # Search for relevant content
            relevant_docs = await rag_service.search_similar(
                query=request.get("message", ""),
                n_results=3,
                subject_filter=subject_filter
            )
            
            logger.info(f"RAG search returned {len(relevant_docs)} documents")
            
            # If relevant content found, use it to enhance response
            if relevant_docs:
                context = "\n\n".join([
                    f"📚 From {doc['metadata'].get('textbook_name', 'NCTB Textbook')}:\n{doc['content'][:300]}..."
                    for doc in relevant_docs
                ])
                
                # Add context to the response (we'll use it in the response generation)
                request['rag_context'] = context
                request['has_rag_context'] = True
                logger.info("RAG context added to request")
            else:
                request['has_rag_context'] = False
                logger.warning("No relevant documents found")
        else:
            request['has_rag_context'] = False
            logger.warning("RAG service not available")
    except Exception as e:
        logger.error(f"RAG search failed: {e}", exc_info=True)
        request['has_rag_context'] = False
    
    # Enhanced educational responses with strict model specialization
    def get_educational_response(msg: str, category: str, history: list) -> str:
        # STRICT MODEL ENFORCEMENT
        # Bangla model: ONLY Bengali language and literature
        if category == "bangla":
            return get_bangla_response(msg, history)
        
        # Math model: ONLY mathematics
        elif category == "math":
            return get_math_response(msg, history)
        
        # General model: All other subjects (Science, English, History, etc.)
        elif category == "general":
            return get_general_response(msg, history)
        
        else:
            return "Please select a valid AI model to continue."
    
    def get_bangla_response(msg: str, history: list) -> str:
        """Bangla model - ONLY Bengali language and literature"""
        # Bengali language responses
        if "সন্ধি" in msg or "sandhi" in msg:
            return """বাংলা ব্যাকরণে সন্ধি হলো দুটি বর্ণের মিলন। যখন দুটি শব্দ বা ধাতু একসাথে যুক্ত হয়, তখন তাদের সংযোগস্থলে যে ধ্বনি পরিবর্তন ঘটে, তাকে সন্ধি বলে।

**সন্ধির প্রকারভেদ:**
1. **স্বরসন্ধি**: দুটি স্বরবর্ণের মিলন (যেমন: বিদ্যা + আলয় = বিদ্যালয়)
2. **ব্যঞ্জনসন্ধি**: স্বরবর্ণ ও ব্যঞ্জনবর্ণের মিলন (যেমন: উৎ + হার = উদ্ধার)
3. **বিসর্গসন্ধি**: বিসর্গের সাথে অন্য বর্ণের মিলন (যেমন: নিঃ + চয় = নিশ্চয়)

আরও কোনো প্রশ্ন থাকলে জিজ্ঞাসা করুন!"""
        
        elif "ব্যাকরণ" in msg or "grammar" in msg:
            return """বাংলা ব্যাকরণ হলো বাংলা ভাষার নিয়ম-কানুন। এটি ভাষাকে শুদ্ধভাবে বলতে, লিখতে ও বুঝতে সাহায্য করে।

**বাংলা ব্যাকরণের প্রধান অংশ:**
1. **ধ্বনিতত্ত্ব**: বর্ণ ও ধ্বনির আলোচনা
2. **শব্দতত্ত্ব**: শব্দের গঠন ও প্রকারভেদ
3. **বাক্যতত্ত্ব**: বাক্যের গঠন ও প্রকারভেদ
4. **অর্থতত্ত্ব**: শব্দ ও বাক্যের অর্থ

কোন বিষয়ে বিস্তারিত জানতে চান?"""
        
        elif "সমাস" in msg or "samas" in msg:
            return """**সমাস:**

সমাস হলো দুই বা ততোধিক পদের একসাথে মিলিত হয়ে একটি নতুন পদ তৈরি করা।

**সমাসের প্রকারভেদ:**
1. **দ্বন্দ্ব সমাস**: দুটি পদের সমান গুরুত্ব (যেমন: মা-বাবা)
2. **কর্মধারয় সমাস**: বিশেষণ + বিশেষ্য (যেমন: নীলাকাশ = নীল যে আকাশ)
3. **তৎপুরুষ সমাস**: পূর্বপদ বিভক্তি লোপ (যেমন: রাজপুত্র = রাজার পুত্র)
4. **বহুব্রীহি সমাস**: অন্য অর্থ প্রকাশ (যেমন: দশানন = দশ আনন যার = রাবণ)
5. **দ্বিগু সমাস**: সংখ্যা + বিশেষ্য (যেমন: ত্রিফলা = তিন ফলের সমাহার)
6. **অব্যয়ীভাব সমাস**: অব্যয় পূর্বপদ (যেমন: উপকূল = কূলের সমীপ)

উদাহরণ সহ আরও জানতে চান?"""
        
        elif "প্রত্যয়" in msg or "suffix" in msg:
            return """**প্রত্যয়:**

প্রত্যয় হলো শব্দ বা ধাতুর পরে যুক্ত হয়ে নতুন শব্দ তৈরি করে।

**প্রত্যয়ের প্রকারভেদ:**
1. **কৃৎ প্রত্যয়**: ধাতুর সাথে যুক্ত (যেমন: √পড় + অক = পাঠক)
2. **তদ্ধিত প্রত্যয়**: শব্দের সাথে যুক্ত (যেমন: মানব + তা = মানবতা)

**উদাহরণ:**
- √লিখ্ + অন = লেখন
- √দেখ্ + আ = দেখা
- বাংলা + দেশ + ঈ = বাংলাদেশী

আরও উদাহরণ চান?"""
        
        elif "সাহিত্য" in msg or "literature" in msg:
            return """**বাংলা সাহিত্য:**

বাংলা সাহিত্যের সমৃদ্ধ ইতিহাস রয়েছে।

**প্রধান যুগ:**
1. **প্রাচীন যুগ** (৯৫০-১২০০): চর্যাপদ
2. **মধ্যযুগ** (১২০০-১৮০০): মঙ্গলকাব্য, বৈষ্ণব পদাবলী
3. **আধুনিক যুগ** (১৮০০-বর্তমান): রবীন্দ্রনাথ, নজরুল, জীবনানন্দ

**বিখ্যাত লেখক:**
- রবীন্দ্রনাথ ঠাকুর (গীতাঞ্জলি)
- কাজী নজরুল ইসলাম (বিদ্রোহী)
- জীবনানন্দ দাশ (বনলতা সেন)
- শরৎচন্দ্র চট্টোপাধ্যায় (দেবদাস)

কোন লেখক বা রচনা সম্পর্কে জানতে চান?"""
        
        else:
            # Check conversation history to avoid repetition
            recent_responses = [msg.get('content', '') for msg in history[-3:] if msg.get('role') == 'assistant']
            
            # Provide intelligent fallback based on question analysis
            question = request.get('message', '')
            
            # Try to identify the topic from the question
            if any(word in msg for word in ['কবিতা', 'poem', 'poetry', 'কবি']):
                return """**বাংলা কবিতা:**

বাংলা কবিতার জগত অত্যন্ত সমৃদ্ধ। আপনি কোন বিষয়ে জানতে চান?

**প্রধান কবি:**
- রবীন্দ্রনাথ ঠাকুর - গীতাঞ্জলি, সোনার তরী
- কাজী নজরুল ইসলাম - বিদ্রোহী, অগ্নিবীণা
- জীবনানন্দ দাশ - বনলতা সেন, রূপসী বাংলা
- সুকান্ত ভট্টাচার্য - ছাড়পত্র, পূর্বাভাস

**কবিতার ধরন:**
- গীতিকবিতা, মহাকাব্য, পদাবলী, আধুনিক কবিতা

কোন কবি বা কবিতা সম্পর্কে বিস্তারিত জানতে চান?"""
            
            elif any(word in msg for word in ['গল্প', 'story', 'উপন্যাস', 'novel']):
                return """**বাংলা গল্প ও উপন্যাস:**

বাংলা সাহিত্যে গল্প ও উপন্যাসের ঐতিহ্য অনেক পুরনো।

**বিখ্যাত গল্পকার:**
- রবীন্দ্রনাথ ঠাকুর - কাবুলিওয়ালা, পোস্টমাস্টার
- শরৎচন্দ্র চট্টোপাধ্যায় - দেবদাস, শ্রীকান্ত
- বঙ্কিমচন্দ্র চট্টোপাধ্যায় - আনন্দমঠ, কপালকুণ্ডলা
- তারাশঙ্কর বন্দ্যোপাধ্যায় - গণদেবতা, পঞ্চগ্রাম

**গল্পের উপাদান:**
- চরিত্র, কাহিনী, পরিবেশ, সংলাপ, দ্বন্দ্ব

কোন গল্প বা উপন্যাস সম্পর্কে জানতে চান?"""
            
            elif any(word in msg for word in ['রচনা', 'essay', 'লেখা', 'write']):
                return """**রচনা লেখার কৌশল:**

একটি ভালো রচনা লিখতে এই ধাপগুলো অনুসরণ করুন:

**রচনার গঠন:**
1. **ভূমিকা** - বিষয়ের পরিচয় ও গুরুত্ব
2. **মূল অংশ** - বিস্তারিত আলোচনা, উদাহরণ
3. **উপসংহার** - সারসংক্ষেপ ও মতামত

**লেখার টিপস:**
- সহজ ও প্রাঞ্জল ভাষা ব্যবহার করুন
- যুক্তিসঙ্গত ক্রমানুসারে লিখুন
- উদাহরণ ও উদ্ধৃতি ব্যবহার করুন
- বানান ও ব্যাকরণ সঠিক রাখুন

কোন বিষয়ে রচনা লিখতে চান?"""
            
            elif any(word in msg for word in ['বর্ণ', 'letter', 'স্বর', 'ব্যঞ্জন', 'vowel', 'consonant']):
                return """**বাংলা বর্ণমালা:**

বাংলা বর্ণমালায় মোট ৫০টি বর্ণ রয়েছে।

**স্বরবর্ণ (১১টি):**
অ, আ, ই, ঈ, উ, ঊ, ঋ, এ, ঐ, ও, ঔ

**ব্যঞ্জনবর্ণ (৩৯টি):**
- কবর্গ: ক, খ, গ, ঘ, ঙ
- চবর্গ: চ, ছ, জ, ঝ, ঞ
- টবর্গ: ট, ঠ, ড, ঢ, ণ
- তবর্গ: ত, থ, দ, ধ, ন
- পবর্গ: প, ফ, ব, ভ, ম
- অন্তঃস্থ: য, র, ল, ব
- উষ্ম: শ, ষ, স, হ
- যুক্তবর্ণ: ড়, ঢ়, য়, ৎ, ং, ঃ, ঁ

কোন বর্ণ সম্পর্কে বিস্তারিত জানতে চান?"""
            
            else:
                # Provide a varied, context-aware response
                responses = [
                    f"""আপনার প্রশ্ন "{question}" সম্পর্কে আমি সাহায্য করতে পারি।

বাংলা ভাষা ও সাহিত্য সম্পর্কে আরও নির্দিষ্ট প্রশ্ন করুন। যেমন:
- কোন ব্যাকরণ বিষয় (সন্ধি, সমাস, প্রত্যয়)?
- কোন লেখক বা কবি?
- কোন সাহিত্যকর্ম?
- রচনা লেখার কৌশল?

আমি আপনাকে বিস্তারিত ব্যাখ্যা দিতে পারব।""",
                    
                    f""""{question}" - এই বিষয়ে আপনাকে সাহায্য করতে চাই।

আপনি কি জানতে চান:
📚 ব্যাকরণের নিয়ম (সন্ধি, সমাস, কারক)?
📖 সাহিত্যের ইতিহাস বা লেখক পরিচিতি?
✍️ রচনা বা প্রবন্ধ লেখার টিপস?
🗣️ বাংলা ভাষার বিশেষ কোনো দিক?

আরও নির্দিষ্ট করে প্রশ্ন করলে আমি ভালো উত্তর দিতে পারব।""",
                    
                    f"""আপনার প্রশ্ন "{question}" বুঝতে পেরেছি।

বাংলা ভাষা ও সাহিত্যে আমি এই বিষয়গুলোতে বিশেষজ্ঞ:

**ব্যাকরণ:** সন্ধি, সমাস, প্রত্যয়, কারক, বিভক্তি, সমার্থক শব্দ
**সাহিত্য:** কবিতা, গল্প, উপন্যাস, নাটক, প্রবন্ধ
**লেখক:** রবীন্দ্রনাথ, নজরুল, জীবনানন্দ, শরৎচন্দ্র
**লেখার কৌশল:** রচনা, প্রবন্ধ, চিঠি, আবেদন

কোন বিষয়ে গভীরভাবে জানতে চান?"""
                ]
                
                # Avoid repeating the same response
                for response in responses:
                    if not any(response[:50] in recent for recent in recent_responses):
                        return response
                
                # If all responses were used, return a fresh one
                return f"""আমি বাংলা ভাষা ও সাহিত্যের শিক্ষক। "{question}" সম্পর্কে আপনাকে সাহায্য করতে চাই।

দয়া করে আরও নির্দিষ্ট প্রশ্ন করুন, যেমন:
- "সন্ধি কি?" বা "সমাস ব্যাখ্যা করুন"
- "রবীন্দ্রনাথ ঠাকুর সম্পর্কে বলুন"
- "গীতাঞ্জলি কাব্যগ্রন্থ সম্পর্কে জানতে চাই"
- "রচনা লেখার নিয়ম কি?"

আমি বিস্তারিত ব্যাখ্যা সহ উত্তর দেব।"""
    
    def get_math_response(msg: str, history: list) -> str:
        """Math model - ONLY mathematics"""
        if "quadratic" in msg or "দ্বিঘাত" in msg:
            return """**Quadratic Formula (দ্বিঘাত সূত্র):**

For a quadratic equation: **ax² + bx + c = 0**

The solution is: **x = (-b ± √(b² - 4ac)) / 2a**

**Example:**
Solve: x² - 5x + 6 = 0

Here: a = 1, b = -5, c = 6

x = (5 ± √(25 - 24)) / 2
x = (5 ± 1) / 2

**Solutions:** x = 3 or x = 2

**Key Points:**
- If b² - 4ac > 0: Two real solutions
- If b² - 4ac = 0: One real solution
- If b² - 4ac < 0: No real solutions

Would you like to practice with more examples?"""
        
        elif "pythagoras" in msg or "পিথাগোরাস" in msg:
            return """**Pythagorean Theorem (পিথাগোরাসের উপপাদ্য):**

In a right-angled triangle:
**a² + b² = c²**

Where:
- a and b are the two shorter sides (legs)
- c is the hypotenuse (longest side)

**Example:**
If a = 3 and b = 4, find c:
c² = 3² + 4² = 9 + 16 = 25
c = √25 = 5

**Applications:**
- Finding distances
- Construction and architecture
- Navigation and surveying

Try solving: If one side is 5 and hypotenuse is 13, what's the other side?"""
        
        elif "algebra" in msg or "বীজগণিত" in msg:
            return """**Algebra Basics (বীজগণিত):**

Algebra uses letters (variables) to represent numbers.

**Key Concepts:**
1. **Variables**: x, y, z represent unknown values
2. **Expressions**: 2x + 3, 5y - 7
3. **Equations**: 2x + 3 = 11
4. **Solving**: Find the value of x

**Example:**
Solve: 2x + 5 = 15
Step 1: Subtract 5 from both sides → 2x = 10
Step 2: Divide by 2 → x = 5

**Practice:** Try solving 3x - 7 = 14

What specific algebra topic would you like to explore?"""
        
        elif "geometry" in msg or "জ্যামিতি" in msg:
            return """**Geometry (জ্যামিতি):**

Geometry is the study of shapes, sizes, and positions.

**Basic Shapes:**
1. **Triangle**: 3 sides, angles sum = 180°
2. **Square**: 4 equal sides, all angles = 90°
3. **Rectangle**: Opposite sides equal, all angles = 90°
4. **Circle**: All points equidistant from center

**Formulas:**
- Triangle Area = ½ × base × height
- Square Area = side²
- Rectangle Area = length × width
- Circle Area = πr²

**Example:**
Find area of triangle with base = 10 cm, height = 6 cm
Area = ½ × 10 × 6 = 30 cm²

Which geometry topic interests you?"""
        
        elif "calculus" in msg or "ক্যালকুলাস" in msg:
            return """**Calculus Basics (ক্যালকুলাস):**

Calculus studies continuous change.

**Two Main Branches:**
1. **Differential Calculus**: Rate of change (derivatives)
2. **Integral Calculus**: Accumulation (integrals)

**Derivative Basics:**
- d/dx (x²) = 2x
- d/dx (x³) = 3x²
- d/dx (sin x) = cos x

**Example:**
Find derivative of f(x) = x² + 3x
f'(x) = 2x + 3

**Applications:**
- Finding maximum/minimum values
- Velocity and acceleration
- Optimization problems

What calculus concept would you like to learn?"""
        
        elif "trigonometry" in msg or "ত্রিকোণমিতি" in msg:
            return """**Trigonometry (ত্রিকোণমিতি):**

Study of relationships between angles and sides of triangles.

**Basic Ratios:**
- sin θ = opposite / hypotenuse
- cos θ = adjacent / hypotenuse
- tan θ = opposite / adjacent

**Special Angles:**
- sin 30° = 1/2
- sin 45° = √2/2
- sin 60° = √3/2

**Pythagorean Identity:**
sin²θ + cos²θ = 1

**Example:**
In a right triangle, if sin θ = 3/5, find cos θ
Using sin²θ + cos²θ = 1
(3/5)² + cos²θ = 1
cos²θ = 1 - 9/25 = 16/25
cos θ = 4/5

Need help with trigonometric problems?"""
        
        else:
            # Check conversation history to avoid repetition
            recent_responses = [msg.get('content', '') for msg in history[-3:] if msg.get('role') == 'assistant']
            question = request.get('message', '')
            
            # Provide varied, intelligent responses
            responses = [
                f"""I'm your Mathematics tutor, ready to help with "{question}".

Let me know which math topic you need help with:
📐 **Algebra** - Equations, expressions, factoring, polynomials
📏 **Geometry** - Shapes, angles, area, volume, theorems
📊 **Trigonometry** - Sin, cos, tan, angles, identities
📈 **Calculus** - Derivatives, integrals, limits
🔢 **Arithmetic** - Numbers, fractions, decimals, percentages
📉 **Statistics** - Mean, median, mode, probability

Ask me a specific math question and I'll explain it step by step!""",
                
                f"""Ready to help with your math question: "{question}"

**What I can teach you:**
- Solving equations and inequalities
- Working with fractions and decimals
- Understanding geometric shapes and formulas
- Trigonometric ratios and identities
- Basic calculus concepts
- Statistical analysis

Please ask a specific math problem or concept you want to learn!""",
                
                f"""Mathematics tutor here! About "{question}" - let me help you.

**Popular topics I cover:**
- Quadratic equations and formulas
- Pythagorean theorem and triangles
- Algebraic expressions and simplification
- Area, perimeter, and volume calculations
- Trigonometric functions
- Derivatives and integrals

What specific math concept would you like me to explain?"""
            ]
            
            # Avoid repeating responses
            for response in responses:
                if not any(response[:40] in recent for recent in recent_responses):
                    return response
            
            return f"""I'm your Math Model tutor. I can help with "{question}".

Ask me about:
- Algebra (solving equations, factoring)
- Geometry (shapes, area, volume)
- Trigonometry (sin, cos, tan)
- Calculus (derivatives, integrals)
- Statistics (mean, median, probability)

**Note:** For Bengali language questions, select the Bangla Model. For Science/English, select the General Model.

What math problem can I help you solve?"""
    
    def get_general_response(msg: str, history: list) -> str:
        """General model - Science, English, History, and all other subjects"""
        # Science responses
        if "photosynthesis" in msg or "সালোকসংশ্লেষণ" in msg:
            return """**Photosynthesis (সালোকসংশ্লেষণ):**

The process by which plants make their own food using sunlight.

**Chemical Equation:**
6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂

**Process:**
1. **Light Reaction** (in chloroplasts):
   - Absorbs sunlight
   - Splits water molecules
   - Produces oxygen

2. **Dark Reaction** (Calvin Cycle):
   - Uses CO₂ from air
   - Produces glucose (sugar)

**Requirements:**
- Sunlight ☀️
- Water 💧
- Carbon dioxide 🌫️
- Chlorophyll (green pigment) 🌿

**Importance:**
- Produces oxygen for breathing
- Creates food for plants and animals
- Maintains atmospheric balance

Would you like to know more about plant biology?"""
        
        elif "newton" in msg or "force" in msg or "physics" in msg:
            return """**Newton's Laws of Motion:**

**First Law (Law of Inertia):**
An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.

**Second Law:**
F = ma (Force = mass × acceleration)

**Third Law:**
For every action, there is an equal and opposite reaction.

**Examples:**
- Pushing a car (F = ma)
- Rocket propulsion (action-reaction)
- Seatbelts in cars (inertia)

**Practice Question:**
If a 10 kg object accelerates at 5 m/s², what force is applied?
Answer: F = 10 × 5 = 50 N (Newtons)

What physics concept would you like to explore next?"""
        
        elif "atom" in msg or "পরমাণু" in msg or "chemistry" in msg:
            return """**Atomic Structure (পরমাণুর গঠন):**

An atom is the smallest unit of matter.

**Components:**
1. **Protons** (+): Positive charge, in nucleus
2. **Neutrons** (0): No charge, in nucleus
3. **Electrons** (-): Negative charge, orbit nucleus

**Key Facts:**
- Protons + Neutrons = Atomic Mass
- Number of Protons = Atomic Number
- Electrons = Protons (in neutral atom)

**Example - Carbon Atom:**
- Atomic Number: 6 (6 protons)
- Atomic Mass: 12 (6 protons + 6 neutrons)
- Electrons: 6

**Electron Configuration:**
- First shell: max 2 electrons
- Second shell: max 8 electrons
- Third shell: max 18 electrons

Would you like to learn about chemical bonding?"""
        
        elif "cell" in msg or "কোষ" in msg or "biology" in msg:
            return """**Cell Structure (কোষের গঠন):**

The cell is the basic unit of life.

**Types of Cells:**
1. **Prokaryotic**: No nucleus (bacteria)
2. **Eukaryotic**: Has nucleus (plants, animals)

**Cell Organelles:**
- **Nucleus**: Control center, contains DNA
- **Mitochondria**: Powerhouse, produces energy
- **Chloroplast**: (Plants only) Photosynthesis
- **Cell Membrane**: Controls what enters/exits
- **Cytoplasm**: Jelly-like substance

**Plant vs Animal Cells:**
- Plant: Cell wall, chloroplasts, large vacuole
- Animal: No cell wall, no chloroplasts, small vacuoles

**Functions:**
- Growth and reproduction
- Energy production
- Protein synthesis

Want to learn about cell division?"""
        
        # English language responses
        elif "tense" in msg and ("english" in msg or "grammar" in msg):
            return """**English Tenses:**

**Present Tense:**
- Simple: I eat (daily habit)
- Continuous: I am eating (now)
- Perfect: I have eaten (completed)

**Past Tense:**
- Simple: I ate (yesterday)
- Continuous: I was eating (at that time)
- Perfect: I had eaten (before another past action)

**Future Tense:**
- Simple: I will eat (tomorrow)
- Continuous: I will be eating (at that future time)
- Perfect: I will have eaten (before future time)

**Example:**
- Present: I study English every day.
- Past: I studied English yesterday.
- Future: I will study English tomorrow.

Which tense would you like to practice?"""
        
        elif "parts of speech" in msg or ("english" in msg and "grammar" in msg):
            return """**Parts of Speech:**

1. **Noun**: Person, place, thing (cat, school, happiness)
2. **Pronoun**: Replaces noun (he, she, it, they)
3. **Verb**: Action or state (run, is, think)
4. **Adjective**: Describes noun (beautiful, big, red)
5. **Adverb**: Describes verb (quickly, very, well)
6. **Preposition**: Shows relationship (in, on, at, by)
7. **Conjunction**: Connects words (and, but, or)
8. **Interjection**: Expresses emotion (wow!, oh!, hey!)

**Example Sentence:**
"The quick brown fox jumps over the lazy dog."
- The: Article
- quick, brown, lazy: Adjectives
- fox, dog: Nouns
- jumps: Verb
- over: Preposition

Would you like examples for each part?"""
        
        # General educational response
        else:
            # Check conversation history to avoid repetition
            recent_responses = [msg.get('content', '') for msg in history[-3:] if msg.get('role') == 'assistant']
            question = request.get('message', '')
            
            # Provide varied, intelligent responses
            responses = [
                f"""I'm your General Subject tutor. Let me help with "{question}".

**Subjects I cover:**
🔬 **Science** - Physics (motion, energy), Chemistry (atoms, reactions), Biology (cells, life)
📚 **English** - Grammar, writing, literature, comprehension
🌍 **Geography** - Maps, countries, climate, natural resources
📜 **History** - World events, civilizations, important figures
💻 **Computer Science** - Programming basics, technology concepts

What specific topic would you like to learn about?""",
                
                f"""Ready to help with your question: "{question}"

**I can teach you about:**
- Physics concepts (forces, energy, motion)
- Chemistry fundamentals (elements, compounds, reactions)
- Biology topics (cells, plants, animals, ecosystems)
- English language and literature
- World history and geography
- Basic computer science

Please ask a more specific question and I'll provide a detailed explanation!""",
                
                f"""General Subject tutor here! About "{question}" - let me assist you.

**Popular topics:**
- Photosynthesis and plant biology
- Newton's laws and physics
- Atomic structure and chemistry
- English grammar and writing
- Historical events and civilizations
- Geographic features and climate

What would you like to explore in detail?"""
            ]
            
            # Avoid repeating responses
            for response in responses:
                if not any(response[:40] in recent for recent in recent_responses):
                    return response
            
            return f"""I'm your General Model tutor. I can help with "{question}".

**Subjects I specialize in:**
🔬 Science (Physics, Chemistry, Biology)
📚 English (Grammar, Literature, Writing)
🌍 Geography (Maps, Climate, Countries)
📜 History (Events, Civilizations)
💻 Computer Science (Programming, Technology)

**Note:** For Math questions → Math Model | For Bengali → Bangla Model

What subject topic can I explain for you?"""
    
    response_text = get_educational_response(message, model_category, conversation_history)
    
    return {
        "response": response_text,
        "session_id": request.get("session_id", "lightweight_session"),
        "message_id": f"msg_{random.randint(1000, 9999)}",
        "sources": ["NCTB Curriculum", "Educational Database"],
        "confidence": 0.95,
        "model": f"{model_category}-specialized",
        "mode": ai_mode
    }

# Alternative AI chat endpoint (for frontend compatibility)
@app.post("/api/v1/ai/chat")
async def ai_chat_alternative(request: dict):
    """Alternative AI chat endpoint for frontend compatibility"""
    response = await ai_chat(request)
    # Add cache-busting headers
    return JSONResponse(
        content=response,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

# Voice service endpoints
@app.post("/api/v1/voice/test-synthesize")
async def test_voice_synthesis(request: dict):
    """Test voice synthesis endpoint"""
    return {
        "success": True,
        "message": "Voice synthesis test successful",
        "audio_url": None,
        "service": "mock",
        "text": request.get("text", ""),
        "voice": request.get("voice", "default")
    }

@app.post("/api/v1/voice/synthesize")
async def voice_synthesis(request: dict):
    """Voice synthesis endpoint"""
    return {
        "success": True,
        "audio_url": None,
        "message": "Voice synthesis not available in lightweight mode",
        "service": "mock"
    }

# Scheduled classes endpoints
@app.get("/api/v1/scheduled-classes/student/{student_id}")
async def get_student_scheduled_classes(student_id: str):
    """Get scheduled classes for a student"""
    return {
        "scheduled_classes": [
            {
                "id": "class_sch_1",
                "title": "Mathematics - Algebra",
                "teacher_name": "প্রফেসর রহমান",
                "subject": "Mathematics",
                "scheduled_time": "2026-01-15T10:00:00Z",
                "duration_minutes": 60,
                "meeting_link": "/live/class_sch_1",
                "status": "scheduled"
            },
            {
                "id": "class_sch_2",
                "title": "Physics - Mechanics",
                "teacher_name": "প্রফেসর আলী",
                "subject": "Physics",
                "scheduled_time": "2026-01-16T14:00:00Z",
                "duration_minutes": 45,
                "meeting_link": "/live/class_sch_2",
                "status": "scheduled"
            }
        ],
        "total": 2
    }

@app.get("/api/v1/connect/my-classes")
async def get_my_classes():
    """Get user's classes"""
    return {
        "classes": [
            {
                "id": "class_1",
                "name": "Class 10A - Mathematics",
                "subject": "Mathematics",
                "teacher": "প্রফেসর রহমান",
                "schedule": "Mon, Wed, Fri 10:00 AM",
                "students_count": 25,
                "next_class": "2026-01-15T10:00:00Z"
            },
            {
                "id": "class_2",
                "name": "Class 10A - Physics",
                "subject": "Physics",
                "teacher": "প্রফেসর আলী",
                "schedule": "Tue, Thu 2:00 PM",
                "students_count": 25,
                "next_class": "2026-01-16T14:00:00Z"
            }
        ],
        "total": 2
    }

# Mock dashboard endpoints
@app.get("/api/v1/users/me")
async def get_current_user():
    """Get current user info"""
    # Mock user data - in a real app, this would come from the JWT token
    return {
        "id": "1",
        "email": "test@example.com",
        "full_name": "Test User",
        "first_name": "Test",
        "last_name": "User",
        "role": "student",
        "grade": 9,
        "medium": "english",
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z"
    }

@app.get("/api/v1/progress/dashboard")
async def get_dashboard_data():
    """Get dashboard progress data"""
    return {
        "user": {
            "id": 1,
            "name": "Test User",
            "email": "test@example.com",
            "role": "student"
        },
        "progress": {
            "total_xp": 1250,
            "current_level": 8,
            "current_streak": 5,
            "longest_streak": 12,
            "completed_quizzes": 24,
            "average_score": 85.5,
            "time_spent_minutes": 1440,
            "achievements_unlocked": 8
        },
        "recent_activities": [
            {
                "id": 1,
                "type": "quiz_completed",
                "subject": "Mathematics",
                "topic": "Algebra",
                "score": 90,
                "xp_earned": 50,
                "date": "2025-01-08T10:30:00Z"
            },
            {
                "id": 2,
                "type": "ai_chat_session",
                "subject": "Science",
                "topic": "Photosynthesis",
                "duration_minutes": 15,
                "date": "2025-01-08T09:15:00Z"
            }
        ],
        "subject_progress": [
            {"subject": "Mathematics", "progress": 75, "total_topics": 20, "completed_topics": 15},
            {"subject": "English", "progress": 60, "total_topics": 18, "completed_topics": 11},
            {"subject": "Science", "progress": 80, "total_topics": 22, "completed_topics": 18},
            {"subject": "History", "progress": 45, "total_topics": 16, "completed_topics": 7}
        ],
        "upcoming_activities": [
            {"type": "quiz", "subject": "Mathematics", "topic": "Geometry", "scheduled": "2025-01-09T14:00:00Z"},
            {"type": "assignment", "subject": "English", "topic": "Essay Writing", "due": "2025-01-10T23:59:00Z"}
        ]
    }

@app.get("/api/v1/notifications")
async def get_notifications(
    limit: int = 10,
    offset: int = 0,
    unread_only: bool = False
):
    """Get user notifications"""
    notifications = [
        {
            "id": "notif_1",
            "title": "নতুন কুইজ উপলব্ধ",
            "message": "গণিত বিষয়ে একটি নতুন কুইজ যোগ করা হয়েছে।",
            "type": "quiz_available",
            "is_read": False,
            "created_at": "2025-01-13T10:30:00Z",
            "action_url": "/quiz"
        },
        {
            "id": "notif_2", 
            "title": "অভিনন্দন!",
            "message": "আপনি ইংরেজি কুইজে ৯০% স্কোর করেছেন!",
            "type": "achievement",
            "is_read": False,
            "created_at": "2025-01-13T08:15:00Z",
            "action_url": "/dashboard"
        },
        {
            "id": "notif_3",
            "title": "স্ট্রিক বজায় রাখুন",
            "message": "আজ একটি কুইজ সম্পন্ন করে আপনার ৫ দিনের স্ট্রিক বজায় রাখুন।",
            "type": "streak_reminder",
            "is_read": True,
            "created_at": "2025-01-12T18:00:00Z",
            "action_url": "/quiz"
        }
    ]
    
    if unread_only:
        notifications = [n for n in notifications if not n["is_read"]]
        
    # Apply pagination
    total = len(notifications)
    notifications = notifications[offset:offset + limit]
    
    return {
        "notifications": notifications,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/api/v1/notifications/unread-count")
async def get_unread_notifications_count():
    """Get count of unread notifications"""
    return {"unread_count": 2}

@app.get("/api/v1/gamification/profile/{user_id}")
async def get_gamification_profile(user_id: str):
    """Get gamification data for a user"""
    return {
        "user_id": user_id,
        "level": 8,
        "total_xp": 1250,
        "current_level_xp": 250,
        "next_level_xp": 500,
        "current_streak": 5,
        "longest_streak": 12,
        "streak_freeze_count": 2,
        "achievements": [
            {
                "id": 1,
                "name": "First Steps",
                "description": "Complete your first quiz",
                "icon": "🎯",
                "unlocked": True,
                "unlocked_date": "2025-01-01T10:00:00Z"
            },
            {
                "id": 2,
                "name": "Quiz Master",
                "description": "Complete 20 quizzes",
                "icon": "🏆",
                "unlocked": True,
                "unlocked_date": "2025-01-07T16:45:00Z"
            },
            {
                "id": 3,
                "name": "Streak Champion",
                "description": "Maintain a 10-day streak",
                "icon": "🔥",
                "unlocked": False,
                "progress": 5,
                "target": 10
            }
        ],
        "badges": [
            {"name": "Mathematics Expert", "level": "Bronze", "earned_date": "2025-01-05"},
            {"name": "Science Explorer", "level": "Silver", "earned_date": "2025-01-06"}
        ]
    }

@app.get("/api/v1/connect/student/dashboard")
async def student_dashboard():
    return {
        "user": {"id": 1, "name": "Student", "role": "student"},
        "stats": {"total_xp": 500, "current_streak": 3, "completed_quizzes": 5},
        "recent_activities": [],
        "available_quizzes": [
            {"id": 1, "title": "Basic Math", "subject": "Mathematics"},
            {"id": 2, "title": "English Grammar", "subject": "English"}
        ]
    }

# Quiz System Endpoints
@app.get("/api/v1/quiz/subjects")
async def get_quiz_subjects():
    """Get available quiz subjects"""
    return {
        "subjects": [
            {
                "subject": "Mathematics",
                "total_questions": 150,
                "available": True,
                "grades": {6: 20, 7: 25, 8: 30, 9: 35, 10: 40}
            },
            {
                "subject": "English",
                "total_questions": 120,
                "available": True,
                "grades": {6: 15, 7: 20, 8: 25, 9: 30, 10: 30}
            },
            {
                "subject": "Science",
                "total_questions": 180,
                "available": True,
                "grades": {6: 25, 7: 30, 8: 35, 9: 45, 10: 45}
            },
            {
                "subject": "History",
                "total_questions": 90,
                "available": True,
                "grades": {6: 10, 7: 15, 8: 20, 9: 22, 10: 23}
            }
        ]
    }

@app.get("/api/v1/quiz/topics/{subject}")
async def get_quiz_topics(subject: str):
    """Get available topics for a subject"""
    topics_map = {
        "Mathematics": [
            {"topic": "Algebra", "question_count": 45},
            {"topic": "Geometry", "question_count": 40},
            {"topic": "Arithmetic", "question_count": 35},
            {"topic": "Statistics", "question_count": 30}
        ],
        "English": [
            {"topic": "Grammar", "question_count": 40},
            {"topic": "Vocabulary", "question_count": 35},
            {"topic": "Reading Comprehension", "question_count": 25},
            {"topic": "Writing", "question_count": 20}
        ],
        "Science": [
            {"topic": "Physics", "question_count": 60},
            {"topic": "Chemistry", "question_count": 55},
            {"topic": "Biology", "question_count": 65}
        ],
        "History": [
            {"topic": "Ancient History", "question_count": 30},
            {"topic": "Medieval History", "question_count": 35},
            {"topic": "Modern History", "question_count": 25}
        ]
    }
    
    return {
        "topics": topics_map.get(subject, [])
    }

@app.post("/api/v1/quiz/generate")
async def generate_quiz(quiz_request: dict):
    """Generate a new quiz based on parameters"""
    subject = quiz_request.get("subject", "Mathematics")
    topic = quiz_request.get("topic")
    grade = quiz_request.get("grade", 10)
    question_count = quiz_request.get("question_count", 10)
    time_limit = quiz_request.get("time_limit_minutes", 20)
    
    # Generate mock questions based on subject
    questions = []
    for i in range(question_count):
        if subject == "Mathematics":
            questions.append({
                "id": f"math_q_{i+1}",
                "question_text": f"What is {(i+1)*2} + {(i+1)*3}?",
                "options": {
                    "A": str((i+1)*2 + (i+1)*3),
                    "B": str((i+1)*2 + (i+1)*3 + 1),
                    "C": str((i+1)*2 + (i+1)*3 - 1),
                    "D": str((i+1)*2 + (i+1)*3 + 2)
                },
                "correct_answer": "A",
                "explanation": f"Adding {(i+1)*2} and {(i+1)*3} gives {(i+1)*2 + (i+1)*3}",
                "subject": subject,
                "topic": topic or "Arithmetic",
                "difficulty_level": min(i % 3 + 1, 3),
                "bloom_level": min(i % 6 + 1, 6)
            })
        elif subject == "English":
            questions.append({
                "id": f"eng_q_{i+1}",
                "question_text": f"Which of the following is a noun?",
                "options": {
                    "A": "Run",
                    "B": "Beautiful",
                    "C": "Book",
                    "D": "Quickly"
                },
                "correct_answer": "C",
                "explanation": "A noun is a word that names a person, place, thing, or idea. 'Book' is a thing.",
                "subject": subject,
                "topic": topic or "Grammar",
                "difficulty_level": min(i % 3 + 1, 3),
                "bloom_level": min(i % 6 + 1, 6)
            })
        elif subject == "Science":
            questions.append({
                "id": f"sci_q_{i+1}",
                "question_text": f"What is the chemical symbol for water?",
                "options": {
                    "A": "H2O",
                    "B": "CO2",
                    "C": "NaCl",
                    "D": "O2"
                },
                "correct_answer": "A",
                "explanation": "Water is composed of two hydrogen atoms and one oxygen atom, hence H2O.",
                "subject": subject,
                "topic": topic or "Chemistry",
                "difficulty_level": min(i % 3 + 1, 3),
                "bloom_level": min(i % 6 + 1, 6)
            })
        else:  # History
            questions.append({
                "id": f"hist_q_{i+1}",
                "question_text": f"When did Bangladesh gain independence?",
                "options": {
                    "A": "1971",
                    "B": "1947",
                    "C": "1952",
                    "D": "1975"
                },
                "correct_answer": "A",
                "explanation": "Bangladesh gained independence from Pakistan on December 16, 1971.",
                "subject": subject,
                "topic": topic or "Modern History",
                "difficulty_level": min(i % 3 + 1, 3),
                "bloom_level": min(i % 6 + 1, 6)
            })
    
    quiz_id = f"quiz_{hash(f'{subject}_{topic}_{question_count}') % 10000}"
    
    return {
        "quiz_id": quiz_id,
        "subject": subject,
        "topic": topic,
        "grade": grade,
        "difficulty_level": 2,
        "bloom_level": 3,
        "question_count": question_count,
        "time_limit_minutes": time_limit,
        "questions": questions,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now().replace(hour=23, minute=59, second=59)).isoformat()
    }

@app.post("/api/v1/quiz/submit")
async def submit_quiz(submission: dict):
    """Submit quiz answers and get results"""
    quiz_id = submission.get("quiz_id")
    answers = submission.get("answers", {})
    time_taken = submission.get("time_taken_seconds", 0)
    
    # Mock scoring logic
    total_questions = len(answers)
    correct_count = 0
    results = []
    
    for question_id, student_answer in answers.items():
        # Mock correct answers (in real implementation, fetch from database)
        is_correct = student_answer == "A"  # Simplified for demo
        if is_correct:
            correct_count += 1
            
        results.append({
            "question_id": question_id,
            "question_text": f"Sample question for {question_id}",
            "student_answer": student_answer,
            "correct_answer": "A",
            "is_correct": is_correct,
            "explanation": "This is a sample explanation for the correct answer.",
            "options": {
                "A": "Correct option",
                "B": "Incorrect option 1",
                "C": "Incorrect option 2", 
                "D": "Incorrect option 3"
            }
        })
    
    percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
    xp_earned = correct_count * 10 + (5 if percentage >= 80 else 0)
    
    # Performance level
    if percentage >= 90:
        level = "Excellent"
        message = "Outstanding performance! You've mastered this topic."
        recommendations = ["Try advanced topics", "Help other students"]
    elif percentage >= 70:
        level = "Good"
        message = "Good job! You have a solid understanding."
        recommendations = ["Review incorrect answers", "Practice similar questions"]
    elif percentage >= 50:
        level = "Average"
        message = "You're on the right track. Keep practicing!"
        recommendations = ["Focus on weak areas", "Review fundamentals"]
    else:
        level = "Needs Improvement"
        message = "Don't worry! Practice makes perfect."
        recommendations = ["Review basic concepts", "Ask for help", "Take easier quizzes first"]
    
    attempt_id = f"attempt_{hash(f'{quiz_id}_{time_taken}') % 10000}"
    
    return {
        "attempt_id": attempt_id,
        "quiz_id": quiz_id,
        "score": correct_count,
        "max_score": total_questions,
        "percentage": round(percentage, 1),
        "correct_count": correct_count,
        "incorrect_count": total_questions - correct_count,
        "time_taken_seconds": time_taken,
        "xp_earned": xp_earned,
        "total_xp": 1250 + xp_earned,  # Mock total XP
        "level": 8,  # Mock level
        "level_up": xp_earned >= 50,  # Mock level up condition
        "results": results,
        "performance_summary": {
            "level": level,
            "message": message,
            "recommendations": recommendations
        }
    }

@app.get("/api/v1/quiz/history")
async def get_quiz_history(limit: int = 10, offset: int = 0):
    """Get user's quiz history"""
    # Mock quiz history
    history = []
    for i in range(min(limit, 5)):  # Return up to 5 mock entries
        history.append({
            "attempt_id": f"attempt_{1000 + i}",
            "quiz_id": f"quiz_{2000 + i}",
            "subject": ["Mathematics", "English", "Science", "History"][i % 4],
            "topic": ["Algebra", "Grammar", "Physics", "Modern History"][i % 4],
            "score": 7 + i,
            "max_score": 10,
            "percentage": (7 + i) * 10,
            "xp_earned": (7 + i) * 10,
            "time_taken_seconds": 300 + i * 60,
            "completed_at": (datetime.now() - timedelta(days=i)).isoformat()
        })
    
    return {
        "history": history,
        "total": 15,  # Mock total count
        "limit": limit,
        "offset": offset
    }

# Teacher Dashboard Endpoints
@app.get("/api/v1/connect/teacher/dashboard")
async def teacher_dashboard():
    """Get teacher dashboard data"""
    return {
        "teacher": {
            "id": "2",
            "name": "প্রফেসর রহমান",
            "email": "teacher@example.com",
            "subjects": ["Mathematics", "Physics"],
            "classes": [
                {"id": "class_1", "name": "Class 10A", "subject": "Mathematics", "students": 25},
                {"id": "class_2", "name": "Class 9B", "subject": "Physics", "students": 22}
            ]
        },
        "classes": [
            {
                "id": "class_1",
                "name": "Class 10A",
                "subject": "Mathematics",
                "grade": 10,
                "students": 25,
                "active_students": 23,
                "created_at": "2025-01-01T10:00:00Z"
            },
            {
                "id": "class_2", 
                "name": "Class 9B",
                "subject": "Physics",
                "grade": 9,
                "students": 22,
                "active_students": 20,
                "created_at": "2025-01-02T11:00:00Z"
            }
        ],
        "students": [
            {
                "id": "student_1",
                "name": "আহমেদ হাসান",
                "email": "ahmed@example.com",
                "class": "Class 10A",
                "average_score": 85.5,
                "last_active": "2025-01-13T16:30:00Z"
            },
            {
                "id": "student_2",
                "name": "ফাতিমা খান",
                "email": "fatima@example.com", 
                "class": "Class 9B",
                "average_score": 92.0,
                "last_active": "2025-01-13T15:45:00Z"
            }
        ],
        "analytics": {
            "totalStudents": 47,
            "activeStudents": 43,
            "averageScore": 88.7,
            "completionRate": 91.5
        },
        "notifications": [
            {
                "id": "notif_t1",
                "title": "নতুন অ্যাসাইনমেন্ট জমা",
                "message": "আহমেদ হাসান গণিত অ্যাসাইনমেন্ট জমা দিয়েছে",
                "type": "assignment_submission",
                "created_at": "2025-01-13T16:00:00Z"
            }
        ]
    }

@app.get("/api/v1/assignments/class/{class_id}")
async def get_class_assignments(class_id: str):
    """Get assignments for a specific class"""
    assignments = [
        {
            "id": f"assign_{class_id}_1",
            "title": "Algebra Practice",
            "description": "Complete the algebra worksheet",
            "class_id": class_id,
            "subject": "Mathematics",
            "due_date": "2025-01-20T23:59:00Z",
            "max_points": 100,
            "instructions": "Solve all problems showing your work",
            "allowed_file_types": ["pdf", "doc", "docx"],
            "max_file_size": "10MB",
            "created_at": "2025-01-10T10:00:00Z",
            "status": "active",
            "submission_count": 18,
            "total_students": 25
        },
        {
            "id": f"assign_{class_id}_2",
            "title": "Geometry Quiz",
            "description": "Online geometry assessment",
            "class_id": class_id,
            "subject": "Mathematics",
            "due_date": "2025-01-25T23:59:00Z",
            "max_points": 50,
            "instructions": "Complete within time limit",
            "allowed_file_types": [],
            "max_file_size": "0MB",
            "created_at": "2025-01-12T14:00:00Z",
            "status": "active",
            "submission_count": 5,
            "total_students": 25
        }
    ]
    
    return {"assignments": assignments}

@app.post("/api/v1/assignments/create")
async def create_assignment(assignment_data: dict):
    """Create a new assignment"""
    assignment_id = f"assign_{hash(str(assignment_data)) % 10000}"
    
    return {
        "success": True,
        "assignment": {
            "id": assignment_id,
            "title": assignment_data.get("title"),
            "description": assignment_data.get("description"),
            "class_id": assignment_data.get("class_id"),
            "subject": assignment_data.get("subject"),
            "due_date": assignment_data.get("due_date"),
            "max_points": assignment_data.get("max_points", 100),
            "instructions": assignment_data.get("instructions"),
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
    }

@app.get("/api/v1/assignments/{assignment_id}/submissions")
async def get_assignment_submissions(assignment_id: str):
    """Get submissions for an assignment"""
    submissions = [
        {
            "id": f"sub_{assignment_id}_1",
            "assignment_id": assignment_id,
            "student_id": "student_1",
            "student_name": "আহমেদ হাসান",
            "submitted_at": "2025-01-13T14:30:00Z",
            "file_name": "ahmed_algebra.pdf",
            "file_size": "2.5MB",
            "status": "submitted",
            "grade": None,
            "feedback": None
        },
        {
            "id": f"sub_{assignment_id}_2",
            "assignment_id": assignment_id,
            "student_id": "student_2",
            "student_name": "ফাতিমা খান",
            "submitted_at": "2025-01-13T16:15:00Z",
            "file_name": "fatima_algebra.pdf",
            "file_size": "1.8MB",
            "status": "graded",
            "grade": 95,
            "feedback": "Excellent work! Clear explanations."
        }
    ]
    
    return {"submissions": submissions}

@app.post("/api/v1/assignments/grade")
async def grade_assignment(grading_data: dict):
    """Grade a student's assignment submission"""
    return {
        "success": True,
        "message": "Assignment graded successfully",
        "submission": {
            "id": grading_data.get("submission_id"),
            "grade": grading_data.get("grade"),
            "feedback": grading_data.get("feedback"),
            "graded_at": datetime.now().isoformat()
        }
    }

@app.put("/api/v1/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, assignment_data: dict):
    """Update an existing assignment"""
    return {
        "success": True,
        "assignment": {
            "id": assignment_id,
            "title": assignment_data.get("title"),
            "description": assignment_data.get("description"),
            "due_date": assignment_data.get("due_date"),
            "max_points": assignment_data.get("max_points"),
            "instructions": assignment_data.get("instructions"),
            "updated_at": datetime.now().isoformat()
        }
    }

@app.delete("/api/v1/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str):
    """Delete an assignment"""
    return {
        "success": True,
        "message": "Assignment deleted successfully"
    }

# Scheduled Classes Endpoints
@app.get("/api/v1/scheduled-classes/teacher/{teacher_id}")
async def get_teacher_scheduled_classes(teacher_id: str):
    """Get scheduled classes for a teacher"""
    classes = [
        {
            "id": "sched_1",
            "title": "Mathematics Review Session",
            "subject": "Mathematics",
            "class_name": "Class 10A",
            "scheduled_time": "2025-01-14T10:00:00Z",
            "duration_minutes": 60,
            "status": "scheduled",
            "student_count": 25,
            "description": "Review of algebra concepts"
        },
        {
            "id": "sched_2",
            "title": "Physics Lab Discussion",
            "subject": "Physics",
            "class_name": "Class 9B", 
            "scheduled_time": "2025-01-15T14:00:00Z",
            "duration_minutes": 45,
            "status": "scheduled",
            "student_count": 22,
            "description": "Discussion of recent lab experiments"
        }
    ]
    
    return {"scheduled_classes": classes}

@app.post("/api/v1/scheduled-classes/create")
async def create_scheduled_class(class_data: dict):
    """Create a new scheduled class"""
    class_id = f"sched_{hash(str(class_data)) % 10000}"
    
    return {
        "success": True,
        "scheduled_class": {
            "id": class_id,
            "title": class_data.get("title"),
            "subject": class_data.get("subject"),
            "class_name": class_data.get("class_name"),
            "scheduled_time": class_data.get("scheduled_time"),
            "duration_minutes": class_data.get("duration_minutes", 60),
            "description": class_data.get("description"),
            "status": "scheduled",
            "created_at": datetime.now().isoformat()
        }
    }

@app.post("/api/v1/scheduled-classes/{class_id}/start")
async def start_scheduled_class(class_id: str):
    """Start a scheduled class session"""
    return {
        "success": True,
        "message": "Class session started",
        "live_class_url": f"/live/{class_id}",
        "class_id": class_id,
        "status": "live"
    }

# Learning Modules Endpoints
@app.get("/api/v1/learning/arenas")
async def get_learning_arenas():
    """Get all learning arenas with progress"""
    return {
        "arenas": [
            {
                "id": "arena-math",
                "name": "Mathematics Arena",
                "subject": "Mathematics",
                "description": "Master mathematical concepts from NCTB Grade 9-10 curriculum",
                "icon": "🔢",
                "color": "blue",
                "bgGradient": "bg-gradient-to-br from-blue-500/20 to-purple-500/20",
                "totalAdventures": 4,
                "completedAdventures": 2,
                "totalXP": 2000,
                "earnedXP": 800,
                "isUnlocked": True,
                "adventures": [
                    {
                        "id": "math-algebra",
                        "name": "Algebra Quest",
                        "description": "Master algebraic expressions and equations",
                        "xp": 500,
                        "isCompleted": True
                    },
                    {
                        "id": "math-geometry",
                        "name": "Geometry Adventure",
                        "description": "Explore shapes, angles, and spatial relationships",
                        "xp": 600,
                        "isCompleted": True
                    },
                    {
                        "id": "math-trigonometry",
                        "name": "Trigonometry Challenge",
                        "description": "Conquer sine, cosine, and tangent",
                        "xp": 700,
                        "isCompleted": False
                    },
                    {
                        "id": "math-calculus",
                        "name": "Calculus Mastery",
                        "description": "Advanced mathematical analysis",
                        "xp": 200,
                        "isCompleted": False
                    }
                ]
            },
            {
                "id": "arena-english",
                "name": "English Arena",
                "subject": "English",
                "description": "Enhance your English language skills and literature knowledge",
                "icon": "📚",
                "color": "green",
                "bgGradient": "bg-gradient-to-br from-green-500/20 to-teal-500/20",
                "totalAdventures": 3,
                "completedAdventures": 1,
                "totalXP": 1500,
                "earnedXP": 400,
                "isUnlocked": True,
                "adventures": [
                    {
                        "id": "eng-grammar",
                        "name": "Grammar Guardian",
                        "description": "Master English grammar rules and usage",
                        "xp": 400,
                        "isCompleted": True
                    },
                    {
                        "id": "eng-literature",
                        "name": "Literature Explorer",
                        "description": "Discover classic and modern literature",
                        "xp": 550,
                        "isCompleted": False
                    },
                    {
                        "id": "eng-writing",
                        "name": "Writing Wizard",
                        "description": "Develop creative and academic writing skills",
                        "xp": 550,
                        "isCompleted": False
                    }
                ]
            },
            {
                "id": "arena-science",
                "name": "Science Arena",
                "subject": "Science",
                "description": "Explore the wonders of physics, chemistry, and biology",
                "icon": "🔬",
                "color": "purple",
                "bgGradient": "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
                "totalAdventures": 5,
                "completedAdventures": 0,
                "totalXP": 2500,
                "earnedXP": 0,
                "isUnlocked": False,
                "adventures": []
            },
            {
                "id": "arena-bangla",
                "name": "বাংলা Arena",
                "subject": "Bangla",
                "description": "বাংলা ভাষা ও সাহিত্যে দক্ষতা অর্জন করুন",
                "icon": "🇧🇩",
                "color": "red",
                "bgGradient": "bg-gradient-to-br from-red-500/20 to-orange-500/20",
                "totalAdventures": 4,
                "completedAdventures": 1,
                "totalXP": 1800,
                "earnedXP": 450,
                "isUnlocked": True,
                "adventures": [
                    {
                        "id": "bangla-grammar",
                        "name": "ব্যাকরণ বিজয়",
                        "description": "বাংলা ব্যাকরণের নিয়ম-কানুন আয়ত্ত করুন",
                        "xp": 450,
                        "isCompleted": True
                    }
                ]
            }
        ],
        "progress": [
            {
                "arenaId": "arena-math",
                "completedAdventures": 2,
                "totalAdventures": 4,
                "earnedXP": 800,
                "totalXP": 2000,
                "lastActivity": "2025-01-13T15:30:00Z"
            },
            {
                "arenaId": "arena-english", 
                "completedAdventures": 1,
                "totalAdventures": 3,
                "earnedXP": 400,
                "totalXP": 1500,
                "lastActivity": "2025-01-12T14:20:00Z"
            }
        ],
        "stats": {
            "totalXP": 1650,
            "currentLevel": 8,
            "arenasUnlocked": 3,
            "adventuresCompleted": 4,
            "topicsCompleted": 15,
            "averageBloomLevel": 3.2,
            "streak": 7,
            "achievements": [
                {
                    "id": "first-adventure",
                    "name": "First Adventure",
                    "description": "Complete your first adventure",
                    "icon": "🎯",
                    "type": "adventure",
                    "requirement": 1,
                    "progress": 1,
                    "isUnlocked": True,
                    "unlockedAt": "2025-01-10T10:00:00Z"
                },
                {
                    "id": "math-master",
                    "name": "Math Master",
                    "description": "Complete 2 math adventures",
                    "icon": "🔢",
                    "type": "subject",
                    "requirement": 2,
                    "progress": 2,
                    "isUnlocked": True,
                    "unlockedAt": "2025-01-13T15:30:00Z"
                }
            ]
        }
    }

@app.get("/api/v1/learning/arena/{arena_id}")
async def get_arena_detail(arena_id: str):
    """Get detailed information about a specific arena"""
    arena_details = {
        "arena-math": {
            "id": "arena-math",
            "name": "Mathematics Arena",
            "subject": "Mathematics",
            "description": "Master mathematical concepts from NCTB Grade 9-10 curriculum",
            "icon": "🔢",
            "color": "blue",
            "bgGradient": "bg-gradient-to-br from-blue-500/20 to-purple-500/20",
            "totalAdventures": 4,
            "completedAdventures": 2,
            "totalXP": 2000,
            "earnedXP": 800,
            "isUnlocked": True,
            "adventures": [
                {
                    "id": "math-algebra",
                    "name": "Algebra Quest",
                    "description": "Master algebraic expressions and equations",
                    "topics": ["Linear Equations", "Quadratic Equations", "Polynomials"],
                    "xp": 500,
                    "estimatedTime": "2-3 hours",
                    "difficulty": "Intermediate",
                    "isCompleted": True,
                    "isUnlocked": True,
                    "completedAt": "2025-01-12T16:45:00Z"
                },
                {
                    "id": "math-geometry",
                    "name": "Geometry Adventure", 
                    "description": "Explore shapes, angles, and spatial relationships",
                    "topics": ["Triangles", "Circles", "Area & Perimeter"],
                    "xp": 600,
                    "estimatedTime": "3-4 hours",
                    "difficulty": "Intermediate",
                    "isCompleted": True,
                    "isUnlocked": True,
                    "completedAt": "2025-01-13T15:30:00Z"
                },
                {
                    "id": "math-trigonometry",
                    "name": "Trigonometry Challenge",
                    "description": "Conquer sine, cosine, and tangent",
                    "topics": ["Basic Ratios", "Identities", "Applications"],
                    "xp": 700,
                    "estimatedTime": "4-5 hours",
                    "difficulty": "Advanced",
                    "isCompleted": False,
                    "isUnlocked": True
                },
                {
                    "id": "math-calculus",
                    "name": "Calculus Mastery",
                    "description": "Advanced mathematical analysis",
                    "topics": ["Limits", "Derivatives", "Integration"],
                    "xp": 200,
                    "estimatedTime": "5-6 hours",
                    "difficulty": "Expert",
                    "isCompleted": False,
                    "isUnlocked": False
                }
            ],
            "leaderboard": [
                {"rank": 1, "name": "আহমেদ হাসান", "xp": 1200, "completedAdventures": 3},
                {"rank": 2, "name": "ফাতিমা খান", "xp": 800, "completedAdventures": 2},
                {"rank": 3, "name": "রহিম উদ্দিন", "xp": 600, "completedAdventures": 2}
            ]
        }
    }
    
    arena = arena_details.get(arena_id)
    if not arena:
        raise HTTPException(status_code=404, detail="Arena not found")
    
    return arena

@app.get("/api/v1/learning/adventure/{adventure_id}")
async def get_adventure_detail(adventure_id: str):
    """Get detailed information about a specific adventure"""
    adventure_details = {
        "math-algebra": {
            "id": "math-algebra",
            "name": "Algebra Quest",
            "description": "Master algebraic expressions and equations",
            "arenaId": "arena-math",
            "arenaName": "Mathematics Arena",
            "xp": 500,
            "estimatedTime": "2-3 hours",
            "difficulty": "Intermediate",
            "isCompleted": True,
            "isUnlocked": True,
            "topics": [
                {
                    "id": "linear-equations",
                    "name": "Linear Equations",
                    "description": "Solve equations with one variable",
                    "xp": 150,
                    "isCompleted": True,
                    "bloomLevel": 3
                },
                {
                    "id": "quadratic-equations",
                    "name": "Quadratic Equations",
                    "description": "Master quadratic formulas and factoring",
                    "xp": 200,
                    "isCompleted": True,
                    "bloomLevel": 4
                },
                {
                    "id": "polynomials",
                    "name": "Polynomials",
                    "description": "Work with polynomial expressions",
                    "xp": 150,
                    "isCompleted": False,
                    "bloomLevel": 4
                }
            ],
            "prerequisites": [],
            "nextAdventures": ["math-geometry"],
            "completedAt": "2025-01-12T16:45:00Z"
        }
    }
    
    adventure = adventure_details.get(adventure_id)
    if not adventure:
        raise HTTPException(status_code=404, detail="Adventure not found")
    
    return adventure

@app.get("/api/v1/learning/topic/{topic_id}")
async def get_topic_detail(topic_id: str):
    """Get detailed information about a specific topic"""
    topic_details = {
        "linear-equations": {
            "id": "linear-equations",
            "name": "Linear Equations",
            "description": "Learn to solve equations with one variable",
            "adventureId": "math-algebra",
            "adventureName": "Algebra Quest",
            "xp": 150,
            "bloomLevel": 3,
            "isCompleted": True,
            "content": {
                "theory": "Linear equations are equations of the first degree...",
                "examples": [
                    {"problem": "2x + 5 = 11", "solution": "x = 3"},
                    {"problem": "3x - 7 = 14", "solution": "x = 7"}
                ],
                "videoUrl": "https://example.com/linear-equations-video",
                "resources": [
                    {"title": "Linear Equations Worksheet", "url": "/resources/linear-eq.pdf"},
                    {"title": "Practice Problems", "url": "/resources/linear-practice.pdf"}
                ]
            },
            "quiz": {
                "id": "linear-eq-quiz",
                "questions": [
                    {
                        "id": "q1",
                        "question": "Solve: 2x + 3 = 9",
                        "options": {"A": "x = 3", "B": "x = 6", "C": "x = 2", "D": "x = 4"},
                        "correct": "A"
                    },
                    {
                        "id": "q2", 
                        "question": "What is x in: 5x - 10 = 15?",
                        "options": {"A": "x = 3", "B": "x = 5", "C": "x = 7", "D": "x = 1"},
                        "correct": "B"
                    }
                ]
            },
            "completedAt": "2025-01-12T15:20:00Z",
            "score": 85
        }
    }
    
    topic = topic_details.get(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    return topic

@app.post("/api/v1/learning/topic/{topic_id}/submit-quiz")
async def submit_topic_quiz(topic_id: str, quiz_data: dict):
    """Submit quiz answers for a topic"""
    answers = quiz_data.get("answers", {})
    time_taken = quiz_data.get("time_taken_seconds", 0)
    
    # Mock scoring
    correct_count = len([a for a in answers.values() if a == "A"])  # Simplified
    total_questions = len(answers)
    score = (correct_count / total_questions * 100) if total_questions > 0 else 0
    xp_earned = int(score * 1.5)  # XP based on score
    
    return {
        "success": True,
        "score": score,
        "correct_count": correct_count,
        "total_questions": total_questions,
        "xp_earned": xp_earned,
        "time_taken_seconds": time_taken,
        "topic_completed": score >= 70,
        "next_topic": "quadratic-equations" if score >= 70 else None,
        "feedback": "Great job!" if score >= 80 else "Keep practicing!" if score >= 60 else "Review the material and try again."
    }

# Parent Portal Endpoints
@app.get("/api/v1/parent/dashboard")
async def get_parent_dashboard():
    """Get parent dashboard data"""
    return {
        "success": True,
        "parent": {
            "id": "parent_1",
            "name": "মিসেস রহমান",
            "email": "parent@example.com",
            "children_count": 2
        },
        "children": [
            {
                "id": "child_1",
                "name": "আহমেদ হাসান",
                "grade": 10,
                "school": "ঢাকা কলেজিয়েট স্কুল",
                "medium": "bangla",
                "profile_picture": None,
                "current_level": 8,
                "total_xp": 1250,
                "current_streak": 5,
                "last_active": "2025-01-13T16:30:00Z"
            },
            {
                "id": "child_2",
                "name": "ফাতিমা খান",
                "grade": 9,
                "school": "ঢাকা কলেজিয়েট স্কুল", 
                "medium": "english",
                "profile_picture": None,
                "current_level": 6,
                "total_xp": 850,
                "current_streak": 3,
                "last_active": "2025-01-13T15:45:00Z"
            }
        ],
        "summary": {
            "total_children": 2,
            "active_children": 2,
            "average_performance": 87.5,
            "total_study_time_minutes": 2880,
            "achievements_this_week": 3,
            "upcoming_assignments": 2
        },
        "recent_activities": [
            {
                "child_id": "child_1",
                "child_name": "আহমেদ হাসান",
                "activity_type": "quiz_completed",
                "subject": "Mathematics",
                "topic": "Algebra",
                "score": 90,
                "xp_earned": 50,
                "timestamp": "2025-01-13T16:30:00Z"
            },
            {
                "child_id": "child_2",
                "child_name": "ফাতিমা খান",
                "activity_type": "achievement_unlocked",
                "achievement": "Grammar Master",
                "subject": "English",
                "xp_earned": 100,
                "timestamp": "2025-01-13T15:45:00Z"
            }
        ],
        "notifications": [
            {
                "id": "notif_p1",
                "title": "সাপ্তাহিক রিপোর্ট প্রস্তুত",
                "message": "আহমেদ হাসানের এই সপ্তাহের অগ্রগতি রিপোর্ট দেখুন",
                "type": "weekly_report",
                "child_id": "child_1",
                "is_read": False,
                "created_at": "2025-01-13T10:00:00Z"
            }
        ]
    }

@app.get("/api/v1/parent/children")
async def get_parent_children():
    """Get list of parent's children"""
    return {
        "children": [
            {
                "id": "child_1",
                "name": "আহমেদ হাসান",
                "grade": 10,
                "school": "ঢাকা কলেজিয়েট স্কুল",
                "medium": "bangla",
                "subjects": ["Mathematics", "Physics", "Chemistry", "Biology", "Bangla"],
                "current_level": 8,
                "total_xp": 1250,
                "current_streak": 5,
                "enrollment_date": "2024-09-01T00:00:00Z",
                "last_active": "2025-01-13T16:30:00Z"
            },
            {
                "id": "child_2",
                "name": "ফাতিমা খান",
                "grade": 9,
                "school": "ঢাকা কলেজিয়েট স্কুল",
                "medium": "english",
                "subjects": ["Mathematics", "English", "Science", "History", "Geography"],
                "current_level": 6,
                "total_xp": 850,
                "current_streak": 3,
                "enrollment_date": "2024-09-01T00:00:00Z",
                "last_active": "2025-01-13T15:45:00Z"
            }
        ]
    }

@app.get("/api/v1/parent/child/{child_id}/progress")
async def get_child_progress(child_id: str):
    """Get detailed progress for a specific child"""
    child_progress = {
        "child_1": {
            "child": {
                "id": "child_1",
                "name": "আহমেদ হাসান",
                "grade": 10,
                "medium": "bangla"
            },
            "overall_progress": {
                "current_level": 8,
                "total_xp": 1250,
                "current_streak": 5,
                "longest_streak": 12,
                "study_time_minutes": 1440,
                "quizzes_completed": 24,
                "average_score": 85.5,
                "achievements_unlocked": 8
            },
            "subject_progress": [
                {
                    "subject": "Mathematics",
                    "progress_percentage": 75,
                    "total_topics": 20,
                    "completed_topics": 15,
                    "average_score": 88.2,
                    "time_spent_minutes": 480,
                    "last_activity": "2025-01-13T16:30:00Z"
                },
                {
                    "subject": "Physics",
                    "progress_percentage": 60,
                    "total_topics": 18,
                    "completed_topics": 11,
                    "average_score": 82.5,
                    "time_spent_minutes": 360,
                    "last_activity": "2025-01-12T14:20:00Z"
                }
            ],
            "recent_activities": [
                {
                    "activity_type": "quiz_completed",
                    "subject": "Mathematics",
                    "topic": "Algebra",
                    "score": 90,
                    "xp_earned": 50,
                    "timestamp": "2025-01-13T16:30:00Z"
                }
            ],
            "achievements": [
                {
                    "id": "math_master",
                    "name": "Math Master",
                    "description": "Complete 15 math topics",
                    "icon": "🔢",
                    "unlocked_at": "2025-01-13T16:30:00Z"
                }
            ]
        }
    }
    
    progress = child_progress.get(child_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Child not found")
    
    return progress

@app.get("/api/v1/parent/child/{child_id}/analytics")
async def get_child_analytics(child_id: str, time_range_days: int = 30):
    """Get analytics data for a specific child"""
    return {
        "child_id": child_id,
        "time_range_days": time_range_days,
        "analytics": {
            "study_time": {
                "total_minutes": 1440,
                "daily_average": 48,
                "trend": "increasing",
                "weekly_data": [
                    {"week": "2025-W01", "minutes": 320},
                    {"week": "2025-W02", "minutes": 380},
                    {"week": "2025-W03", "minutes": 420}
                ]
            },
            "performance": {
                "average_score": 85.5,
                "improvement": 5.2,
                "trend": "improving",
                "subject_scores": {
                    "Mathematics": 88.2,
                    "Physics": 82.5,
                    "Chemistry": 86.0,
                    "Biology": 84.8
                }
            },
            "engagement": {
                "login_frequency": 0.85,
                "quiz_completion_rate": 0.92,
                "streak_consistency": 0.78,
                "active_days": 26
            },
            "learning_patterns": {
                "preferred_study_time": "afternoon",
                "most_active_subject": "Mathematics",
                "learning_style": "visual",
                "difficulty_preference": "challenging"
            }
        }
    }

@app.get("/api/v1/parent/child/{child_id}/report")
async def get_child_weekly_report(child_id: str, week_start: str):
    """Get weekly report for a specific child"""
    return {
        "child_id": child_id,
        "week_start": week_start,
        "report": {
            "summary": {
                "total_study_time": 420,
                "quizzes_completed": 8,
                "average_score": 87.5,
                "xp_earned": 350,
                "achievements_unlocked": 2,
                "streak_maintained": True
            },
            "subject_breakdown": [
                {
                    "subject": "Mathematics",
                    "time_spent": 180,
                    "quizzes_completed": 4,
                    "average_score": 90.0,
                    "topics_covered": ["Algebra", "Geometry"],
                    "strengths": ["Problem solving", "Formula application"],
                    "areas_for_improvement": ["Word problems"]
                },
                {
                    "subject": "Physics",
                    "time_spent": 120,
                    "quizzes_completed": 2,
                    "average_score": 85.0,
                    "topics_covered": ["Mechanics", "Waves"],
                    "strengths": ["Conceptual understanding"],
                    "areas_for_improvement": ["Mathematical calculations"]
                }
            ],
            "achievements": [
                {
                    "name": "Quiz Master",
                    "description": "Complete 5 quizzes in a week",
                    "unlocked_at": "2025-01-12T18:00:00Z"
                }
            ],
            "recommendations": [
                "Continue focusing on mathematics - showing excellent progress",
                "Spend more time on physics calculations",
                "Maintain the current study schedule"
            ]
        }
    }

@app.get("/api/v1/parent/notifications")
async def get_parent_notifications(limit: int = 10, offset: int = 0, unread_only: bool = False):
    """Get parent notifications"""
    notifications = [
        {
            "id": "notif_p1",
            "title": "সাপ্তাহিক রিপোর্ট প্রস্তুত",
            "message": "আহমেদ হাসানের এই সপ্তাহের অগ্রগতি রিপোর্ট দেখুন",
            "type": "weekly_report",
            "child_id": "child_1",
            "child_name": "আহমেদ হাসান",
            "is_read": False,
            "created_at": "2025-01-13T10:00:00Z",
            "action_url": "/parent/child/child_1/report"
        },
        {
            "id": "notif_p2",
            "title": "নতুন অর্জন আনলক!",
            "message": "ফাতিমা খান 'Grammar Master' অর্জন আনলক করেছে",
            "type": "achievement",
            "child_id": "child_2",
            "child_name": "ফাতিমা খান",
            "is_read": False,
            "created_at": "2025-01-13T15:45:00Z",
            "action_url": "/parent/child/child_2/achievements"
        },
        {
            "id": "notif_p3",
            "title": "পারফরমেন্স সতর্কতা",
            "message": "আহমেদ হাসানের গণিতে স্কোর কমে গেছে",
            "type": "performance_alert",
            "child_id": "child_1",
            "child_name": "আহমেদ হাসান",
            "is_read": True,
            "created_at": "2025-01-12T09:30:00Z",
            "action_url": "/parent/child/child_1/analytics"
        }
    ]
    
    if unread_only:
        notifications = [n for n in notifications if not n["is_read"]]
    
    # Apply pagination
    total = len(notifications)
    notifications = notifications[offset:offset + limit]
    
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": 2,
        "limit": limit,
        "offset": offset
    }

@app.post("/api/v1/parent/notifications/{notification_id}/mark-read")
async def mark_parent_notification_read(notification_id: str):
    """Mark a parent notification as read"""
    return {
        "success": True,
        "message": "Notification marked as read",
        "notification_id": notification_id
    }

@app.get("/api/v1/parent/notification-preferences")
async def get_notification_preferences():
    """Get parent notification preferences"""
    return {
        "preferences": {
            "email_notifications": True,
            "sms_notifications": False,
            "push_notifications": True,
            "weekly_reports": True,
            "achievement_alerts": True,
            "performance_alerts": True,
            "streak_reminders": True,
            "assignment_reminders": True,
            "quiet_hours": {
                "enabled": True,
                "start_time": "22:00",
                "end_time": "08:00"
            },
            "frequency": {
                "immediate": ["achievement_alerts"],
                "daily": ["performance_alerts"],
                "weekly": ["weekly_reports"]
            }
        }
    }

@app.put("/api/v1/parent/notification-preferences")
async def update_notification_preferences(preferences: dict):
    """Update parent notification preferences"""
    return {
        "success": True,
        "message": "Notification preferences updated successfully",
        "preferences": preferences
    }

if __name__ == "__main__":
    print("🎓 ShikkhaSathi - Lightweight Development Server")
    uvicorn.run(
        "run_dev_lightweight:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
