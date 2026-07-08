#!/usr/bin/env python3
"""
Development server for ShikkhaSathi with Docker databases
Uses PostgreSQL, MongoDB, and Redis running in Docker containers
"""

import sys
import os
import json
import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import random
import string

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import Docker configuration
from app.core.config_docker import docker_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test database connections
def test_database_connections():
    """Test connections to Docker databases"""
    try:
        # Test PostgreSQL
        import psycopg2
        pg_conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="shikkhasathi",
            user="shikkhasathi_user",
            password="shikkhasathi_pass"
        )
        pg_conn.close()
        logger.info("✅ PostgreSQL connection successful")
        
        # Test MongoDB
        from pymongo import MongoClient
        mongo_client = MongoClient("mongodb://shikkhasathi_user:shikkhasathi_pass@localhost:27017/shikkhasathi")
        mongo_client.admin.command('ping')
        mongo_client.close()
        logger.info("✅ MongoDB connection successful")
        
        # Test Redis
        import redis
        redis_client = redis.Redis(host='localhost', port=6379, password='shikkhasathi_pass', db=0)
        redis_client.ping()
        redis_client.close()
        logger.info("✅ Redis connection successful")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        logger.info("💡 Make sure Docker databases are running:")
        logger.info("   sudo docker ps | grep shikkhasathi")
        return False

# In-memory storage for development (will be replaced with real databases)
class PersistentStorage:
    def __init__(self):
        self.data_file = os.path.join(os.path.dirname(__file__), "persistent_data.json")
        self.data = self._load_data()
    
    def _load_data(self):
        """Load data from persistent storage file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                print(f"Warning: Could not load data from {self.data_file}, starting fresh")
        
        # Default data structure
        return {
            "classes": {},
            "students_in_classes": {},
            "student_classes": {},
            "assignments": {},
            "submissions": {},
            "scheduled_classes": {}
        }
    
    def _save_data(self):
        """Save data to persistent storage file"""
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False, default=str)
        except IOError as e:
            print(f"Warning: Could not save data to {self.data_file}: {e}")
    
    def add_class(self, teacher_id: str, class_data: dict):
        if teacher_id not in self.data["classes"]:
            self.data["classes"][teacher_id] = []
        self.data["classes"][teacher_id].append(class_data)
        self._save_data()
        return class_data
    
    def get_teacher_classes(self, teacher_id: str):
        return self.data["classes"].get(teacher_id, [])
    
    def get_class_by_code(self, class_code: str):
        for teacher_id, classes in self.data["classes"].items():
            for class_info in classes:
                if class_info["class_code"] == class_code:
                    return class_info
        return None
    
    def join_student_to_class(self, student_id: str, class_id: str):
        if class_id not in self.data["students_in_classes"]:
            self.data["students_in_classes"][class_id] = []
        
        if student_id not in self.data["students_in_classes"][class_id]:
            self.data["students_in_classes"][class_id].append(student_id)
            
            if student_id not in self.data["student_classes"]:
                self.data["student_classes"][student_id] = []
            if class_id not in self.data["student_classes"][student_id]:
                self.data["student_classes"][student_id].append(class_id)
            
            # Update student count in class
            for teacher_id, classes in self.data["classes"].items():
                for class_info in classes:
                    if class_info["id"] == class_id:
                        class_info["student_count"] = len(self.data["students_in_classes"][class_id])
                        break
            
            self._save_data()
    
    def get_student_classes(self, student_id: str):
        student_class_ids = self.data["student_classes"].get(student_id, [])
        student_classes = []
        
        for teacher_id, classes in self.data["classes"].items():
            for class_info in classes:
                if class_info["id"] in student_class_ids:
                    student_classes.append(class_info)
        
        return student_classes
    
    def add_assignment(self, class_id: str, assignment_data: dict):
        if class_id not in self.data["assignments"]:
            self.data["assignments"][class_id] = []
        self.data["assignments"][class_id].append(assignment_data)
        self._save_data()
        return assignment_data
    
    def get_class_assignments(self, class_id: str):
        return self.data["assignments"].get(class_id, [])
    
    def get_assignment_by_id(self, assignment_id: str):
        for class_id, assignments in self.data["assignments"].items():
            for assignment in assignments:
                if assignment["id"] == assignment_id:
                    return assignment
        return None
    
    def add_submission(self, assignment_id: str, submission_data: dict):
        if assignment_id not in self.data["submissions"]:
            self.data["submissions"][assignment_id] = []
        
        student_id = submission_data["student_id"]
        existing_submissions = self.data["submissions"][assignment_id]
        
        # Update existing submission or add new one
        for i, submission in enumerate(existing_submissions):
            if submission["student_id"] == student_id:
                existing_submissions[i] = submission_data
                self._save_data()
                return submission_data
        
        self.data["submissions"][assignment_id].append(submission_data)
        self._save_data()
        return submission_data
    
    def get_assignment_submissions(self, assignment_id: str):
        return self.data["submissions"].get(assignment_id, [])
    
    def get_student_assignments(self, student_id: str):
        student_assignments = []
        student_class_ids = self.data["student_classes"].get(student_id, [])
        
        for class_id in student_class_ids:
            class_assignments = self.get_class_assignments(class_id)
            for assignment in class_assignments:
                submissions = self.get_assignment_submissions(assignment["id"])
                student_submission = next(
                    (sub for sub in submissions if sub["student_id"] == student_id), 
                    None
                )
                
                assignment_copy = assignment.copy()
                assignment_copy["submission_status"] = "submitted" if student_submission else "pending"
                assignment_copy["submission"] = student_submission
                student_assignments.append(assignment_copy)
        
        return student_assignments

# Global storage instance
storage = PersistentStorage()

# Create FastAPI app
app = FastAPI(
    title="ShikkhaSathi API",
    description="AI-Powered Learning Platform for Bangladesh - Docker Development",
    version="1.0.0-docker-dev",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=docker_settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "ShikkhaSathi API - Docker Development Mode",
        "version": "1.0.0-docker-dev",
        "status": "running",
        "databases": {
            "postgresql": "localhost:5432",
            "mongodb": "localhost:27017", 
            "redis": "localhost:6379"
        },
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check including database connections"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat() + "Z",
        "mode": "docker-development",
        "databases": {}
    }
    
    # Test database connections
    try:
        import psycopg2
        pg_conn = psycopg2.connect(
            host="localhost", port=5432, database="shikkhasathi",
            user="shikkhasathi_user", password="shikkhasathi_pass"
        )
        pg_conn.close()
        health_status["databases"]["postgresql"] = "connected"
    except Exception as e:
        health_status["databases"]["postgresql"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    try:
        from pymongo import MongoClient
        mongo_client = MongoClient("mongodb://shikkhasathi_user:shikkhasathi_pass@localhost:27017/shikkhasathi")
        mongo_client.admin.command('ping')
        mongo_client.close()
        health_status["databases"]["mongodb"] = "connected"
    except Exception as e:
        health_status["databases"]["mongodb"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    try:
        import redis
        redis_client = redis.Redis(host='localhost', port=6379, password='shikkhasathi_pass', db=0)
        redis_client.ping()
        redis_client.close()
        health_status["databases"]["redis"] = "connected"
    except Exception as e:
        health_status["databases"]["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status

@app.get("/api/v1/health")
@app.head("/api/v1/health")
async def api_health_check():
    """API v1 health check endpoint"""
    return await health_check()

# Session management for mock authentication
class MockSession:
    def __init__(self):
        self.current_user_email = None
    
    def set_user(self, email: str):
        self.current_user_email = email
    
    def get_user_email(self):
        return self.current_user_email or "student1@example.com"

# Global session instance
mock_session = MockSession()

# Import all the existing endpoints from run_dev.py
# Mock authentication endpoint
@app.post("/api/v1/auth/login")
async def login(credentials: dict):
    email = credentials.get("email", "")
    password = credentials.get("password", "")
    
    mock_users = {
        "student1@example.com": {"role": "student", "name": "Student One", "id": "1"},
        "teacher1@example.com": {"role": "teacher", "name": "Teacher One", "id": "2"},
        "parent1@example.com": {"role": "parent", "name": "Parent One", "id": "3"},
        "admin@example.com": {"role": "admin", "name": "Admin User", "id": "4"}
    }
    
    if email in mock_users and password == "password123":
        user_data = mock_users[email]
        mock_session.set_user(email)  # Set current user in session
        
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
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/v1/users/me")
async def get_current_user_v2():
    mock_users = {
        "student1@example.com": {
            "id": "1", "email": "student1@example.com", "full_name": "Student One",
            "first_name": "Student", "last_name": "One", "role": "student"
        },
        "teacher1@example.com": {
            "id": "2", "email": "teacher1@example.com", "full_name": "Teacher One",
            "first_name": "Teacher", "last_name": "One", "role": "teacher"
        },
        "parent1@example.com": {
            "id": "3", "email": "parent1@example.com", "full_name": "Parent One",
            "first_name": "Parent", "last_name": "One", "role": "parent"
        },
        "admin@example.com": {
            "id": "4", "email": "admin@example.com", "full_name": "Admin User",
            "first_name": "Admin", "last_name": "User", "role": "admin"
        }
    }
    
    try:
        current_user_email = mock_session.get_user_email()
        
        if current_user_email in mock_users:
            user_data = mock_users[current_user_email]
            return {**user_data, "is_active": True, "created_at": "2025-01-01T00:00:00Z"}
        else:
            user_data = mock_users["student1@example.com"]
            return {**user_data, "is_active": True, "created_at": "2025-01-01T00:00:00Z"}
    except Exception as e:
        print(f"Error in get_current_user_v2: {e}")
        user_data = mock_users["student1@example.com"]
        return {**user_data, "is_active": True, "created_at": "2025-01-01T00:00:00Z"}

# AI Tutor Endpoints
@app.post("/api/v1/ai/chat")
async def ai_chat(message: dict):
    """AI-powered chat endpoint with enhanced integration"""
    try:
        user_message = message.get("message", "")
        subject = message.get("subject", "general")
        grade = message.get("grade", 8)
        
        # Enhanced mock responses for Docker development
        mock_responses = {
            "physics": {
                "force": "Force is a push or pull that can change the motion of an object. In physics, we measure force in Newtons (N). For example, when you push a book across a table, you're applying a force to it.",
                "motion": "Motion is the change in position of an object over time. There are different types of motion: linear (straight line), circular, and rotational.",
                "energy": "Energy is the ability to do work. There are many forms of energy like kinetic energy (energy of motion) and potential energy (stored energy).",
                "gravity": "Gravity is a fundamental force that attracts objects with mass toward each other. On Earth, gravity gives objects weight and causes them to fall toward the ground."
            },
            "mathematics": {
                "algebra": "Algebra is a branch of mathematics that uses letters and symbols to represent numbers and quantities in formulas and equations.",
                "geometry": "Geometry is the study of shapes, sizes, and properties of figures and spaces. It includes concepts like area, perimeter, and volume.",
                "calculus": "Calculus is advanced mathematics that deals with rates of change and accumulation of quantities.",
                "equation": "An equation is a mathematical statement that shows two expressions are equal, using the equals sign (=)."
            },
            "chemistry": {
                "atom": "An atom is the smallest unit of matter that retains the properties of an element. It consists of protons, neutrons, and electrons.",
                "molecule": "A molecule is formed when two or more atoms bond together. Water (H2O) is a simple example of a molecule.",
                "reaction": "A chemical reaction occurs when substances interact to form new compounds with different properties.",
                "element": "An element is a pure substance made of only one type of atom. Examples include hydrogen, oxygen, and carbon."
            },
            "biology": {
                "cell": "A cell is the basic unit of life. All living things are made up of one or more cells. Cells contain organelles that perform specific functions.",
                "photosynthesis": "Photosynthesis is the process by which plants make their own food using sunlight, carbon dioxide, and water.",
                "evolution": "Evolution is the process by which species change over time through natural selection and genetic variation.",
                "dna": "DNA (Deoxyribonucleic acid) is the molecule that carries genetic information in all living organisms."
            }
        }
        
        response_text = "I'd be happy to help you learn! Could you please be more specific about what you'd like to know?"
        
        subject_lower = subject.lower()
        message_lower = user_message.lower()
        
        if subject_lower in mock_responses:
            for keyword, response in mock_responses[subject_lower].items():
                if keyword in message_lower:
                    response_text = response
                    break
        
        if grade <= 8:
            response_text += "\n\nWould you like me to explain this in simpler terms or give you an example?"
        else:
            response_text += "\n\nWould you like me to go deeper into this topic or provide some practice problems?"
        
        return {
            "response": response_text,
            "subject": subject,
            "grade": grade,
            "sources": ["ShikkhaSathi Curriculum Database (Docker Mode)"],
            "context_used": True,
            "model": "ShikkhaSathi AI Tutor (Docker Development)",
            "database_mode": "docker"
        }
        
    except Exception as e:
        logger.error(f"Error in AI chat endpoint: {str(e)}")
        return {
            "response": "I'm sorry, I'm having trouble right now. Please try asking your question again.",
            "error": str(e),
            "model": "ShikkhaSathi AI Tutor (Docker Development)"
        }

@app.get("/api/v1/ai/subjects")
async def get_ai_subjects():
    """Get available subjects for AI tutoring"""
    return {
        "subjects": [
            {"id": "physics", "name": "Physics", "grade_range": [6, 12]},
            {"id": "chemistry", "name": "Chemistry", "grade_range": [8, 12]},
            {"id": "biology", "name": "Biology", "grade_range": [6, 12]},
            {"id": "mathematics", "name": "Mathematics", "grade_range": [6, 12]},
            {"id": "english", "name": "English", "grade_range": [6, 12]},
            {"id": "bangla", "name": "Bangla", "grade_range": [6, 12]}
        ],
        "database_mode": "docker"
    }

# Additional API endpoints for frontend compatibility
@app.get("/api/v1/auth/me")
async def get_current_user():
    """Get current user info"""
    return await get_current_user_v2()

@app.get("/api/v1/notifications/unread-count")
async def get_unread_notifications():
    return {"unread_count": 3}

@app.get("/api/v1/notifications")
async def get_notifications():
    return {
        "notifications": [
            {
                "id": "1",
                "title": "নতুন কুইজ উপলব্ধ",
                "message": "গণিতের নতুন কুইজ এখন উপলব্ধ!",
                "type": "quiz",
                "read": False,
                "created_at": "2025-01-09T10:00:00Z"
            },
            {
                "id": "2", 
                "title": "অভিনন্দন!",
                "message": "আপনি ৫ দিনের স্ট্রিক সম্পূর্ণ করেছেন!",
                "type": "achievement",
                "read": False,
                "created_at": "2025-01-08T15:30:00Z"
            }
        ],
        "total": 2,
        "unread_count": 2
    }

@app.get("/api/v1/gamification/profile/{user_id}")
async def get_gamification_profile(user_id: str):
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
                "unlocked_at": "2025-01-07T12:00:00Z"
            },
            {
                "id": "streak_warrior",
                "name": "স্ট্রিক যোদ্ধা", 
                "description": "৫ দিনের স্ট্রিক বজায় রাখুন",
                "icon": "🔥",
                "unlocked": True,
                "unlocked_at": "2025-01-08T15:30:00Z"
            }
        ],
        "recent_activities": [
            {
                "type": "xp_earned",
                "amount": 50,
                "source": "quiz_completion",
                "timestamp": "2025-01-09T09:00:00Z"
            },
            {
                "type": "achievement_unlocked",
                "achievement_id": "streak_warrior",
                "timestamp": "2025-01-08T15:30:00Z"
            }
        ]
    }

@app.get("/api/v1/progress/dashboard")
async def get_progress_dashboard():
    return {
        "total_xp": 1250,
        "current_streak": 5,
        "completed_quizzes": 12,
        "average_score": 85.5,
        "recent_activities": [
            {"type": "quiz_completed", "subject": "Mathematics", "score": 90, "date": "2025-01-08"},
            {"type": "achievement_unlocked", "name": "Quiz Master", "date": "2025-01-07"}
        ]
    }

# Dashboard endpoints
@app.get("/api/v1/connect/student/dashboard")
async def student_dashboard():
    return {
        "user": {
            "id": 1,
            "name": "Student One",
            "email": "student1@example.com",
            "role": "student"
        },
        "stats": {
            "total_xp": 1250,
            "current_streak": 5,
            "completed_quizzes": 12,
            "average_score": 85.5
        },
        "recent_activities": [
            {"type": "quiz_completed", "subject": "Mathematics", "score": 90, "date": "2025-01-08"},
            {"type": "achievement_unlocked", "name": "Quiz Master", "date": "2025-01-07"},
            {"type": "streak_milestone", "days": 5, "date": "2025-01-06"}
        ],
        "available_quizzes": [
            {"id": 1, "title": "Basic Algebra", "subject": "Mathematics", "difficulty": "easy"},
            {"id": 2, "title": "English Grammar", "subject": "English", "difficulty": "medium"},
            {"id": 3, "title": "Bangladesh History", "subject": "History", "difficulty": "medium"}
        ]
    }

@app.get("/api/v1/connect/teacher/dashboard")
async def teacher_dashboard():
    # Get current teacher ID (in real app, this would come from JWT token)
    teacher_id = "2"  # teacher1@example.com
    
    # Get teacher's classes from storage
    teacher_classes = storage.get_teacher_classes(teacher_id)
    
    # Calculate analytics
    total_students = sum(class_info["student_count"] for class_info in teacher_classes)
    active_quizzes = len(teacher_classes) * 2  # Mock: 2 quizzes per class
    
    return {
        "user": {
            "id": 2,
            "name": "Teacher One",
            "email": "teacher1@example.com",
            "role": "teacher"
        },
        "classes": [
            {
                "id": class_info["id"],
                "name": class_info["name"],
                "subject": class_info["subject"],
                "grade": class_info["grade"],
                "class_code": class_info["class_code"],
                "student_count": class_info["student_count"],
                "recent_activity": class_info.get("recent_activity", "Recently created"),
                "created_at": class_info["created_at"]
            }
            for class_info in teacher_classes
        ],
        "recent_activities": [
            # No recent activities - will be populated as teachers use the system
        ],
        "analytics": {
            "total_students": total_students,
            "active_quizzes": active_quizzes,
            "total_classes": len(teacher_classes),
            "average_class_performance": 78.5,
            "pending_reviews": 12
        },
        "database_mode": "docker"
    }

@app.post("/api/v1/connect/teacher/create-class")
async def create_class(class_data: dict):
    # Mock class creation for development
    teacher_id = "2"  # teacher1@example.com
    
    # Generate a random class ID and code
    class_id = str(random.randint(2000, 9999))
    class_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    # Create class object - using correct field names from frontend
    new_class = {
        "id": class_id,
        "name": class_data.get("class_name", "New Class"),  # Frontend sends 'class_name'
        "subject": class_data.get("subject", "General"),
        "grade": class_data.get("grade_level", 8),  # Frontend sends 'grade_level'
        "description": class_data.get("description", ""),
        "class_code": class_code,
        "teacher_id": teacher_id,
        "student_count": 0,
        "created_at": datetime.now().isoformat() + "Z",
        "recent_activity": "Class created"
    }
    
    # Store the class in persistent storage
    storage.add_class(teacher_id, new_class)
    
    return {
        "success": True,
        "class_id": class_id,
        "class_code": class_code,
        "message": "ক্লাস সফলভাবে তৈরি হয়েছে!",
        "class": new_class,
        "database_mode": "docker"
    }

@app.post("/api/v1/connect/student/join-class")
async def join_class(join_data: dict):
    # Mock class joining for development
    class_code = join_data.get("class_code", "")
    student_id = "1"  # student1@example.com
    
    # Find class by code
    class_info = storage.get_class_by_code(class_code)
    
    if class_info:
        # Add student to class
        storage.join_student_to_class(student_id, class_info["id"])
        
        return {
            "success": True,
            "message": "ক্লাসে সফলভাবে যোগ দিয়েছেন!",
            "class_info": {
                "id": class_info["id"],
                "name": class_info["name"],
                "subject": class_info["subject"],
                "grade": class_info["grade"],
                "teacher_name": "Teacher One",
                "students_count": class_info["student_count"]
            },
            "database_mode": "docker"
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid class code")

@app.post("/api/v1/connect/student/preview-class")
async def preview_class(preview_data: dict):
    # Mock class preview for development
    class_code = preview_data.get("class_code", "")
    
    # Find class by code
    class_info = storage.get_class_by_code(class_code)
    
    if class_info:
        return {
            "success": True,
            "class_info": {
                "name": class_info["name"],
                "subject": class_info["subject"], 
                "grade": class_info["grade"],
                "section": "A",
                "description": class_info.get("description", ""),
                "teacher_name": "Teacher One",
                "students_count": class_info["student_count"],
                "max_students": 40,
                "can_join": True
            },
            "database_mode": "docker"
        }
    else:
        return {
            "success": False,
            "message": "Invalid class code"
        }

@app.get("/api/v1/connect/my-classes")
async def get_my_classes():
    # Get classes for current student
    student_id = "1"  # student1@example.com
    student_classes = storage.get_student_classes(student_id)
    
    return {
        "classes": [
            {
                "id": class_info["id"],
                "name": class_info["name"],
                "subject": class_info["subject"],
                "grade": class_info["grade"],
                "section": "A",
                "teacher_name": "Teacher One",
                "class_code": class_info["class_code"],
                "code_enabled": True,
                "students_count": class_info["student_count"],
                "max_students": 40,
                "created_at": class_info["created_at"],
                "joined_at": datetime.now().isoformat() + "Z"
            }
            for class_info in student_classes
        ],
        "database_mode": "docker"
    }

@app.get("/api/v1/connect/parent/dashboard")
async def parent_dashboard():
    return {
        "user": {
            "id": 3,
            "name": "Parent One",
            "email": "parent1@example.com",
            "role": "parent"
        },
        "children": [
            {
                "id": 1,
                "name": "Child One",
                "class": "Grade 8",
                "school": "Dhaka High School",
                "performance": {
                    "overall_score": 85,
                    "recent_improvement": "+5%",
                    "subjects": {
                        "Mathematics": 90,
                        "English": 82,
                        "Science": 88,
                        "History": 80
                    }
                },
                "recent_activities": [
                    {"type": "quiz_completed", "subject": "Mathematics", "score": 95, "date": "2025-01-08"},
                    {"type": "achievement", "name": "Math Wizard", "date": "2025-01-07"}
                ]
            }
        ],
        "notifications": [
            {"type": "achievement", "message": "Your child earned a new achievement!", "date": "2025-01-08"},
            {"type": "progress", "message": "Weekly progress report available", "date": "2025-01-07"}
        ],
        "database_mode": "docker"
    }

# Initialize database connections on startup
@app.on_event("startup")
async def startup_event():
    print("🚀 Starting ShikkhaSathi Docker Development Server...")
    print("🐳 Testing Docker database connections...")
    
    if test_database_connections():
        print("✅ All Docker databases connected successfully")
        print("🌐 Server ready with Docker databases!")
    else:
        print("⚠️  Some database connections failed - using fallback mode")
        print("💡 Make sure Docker databases are running:")
        print("   sudo docker ps | grep shikkhasathi")
    
    print(f"📖 API Documentation: http://localhost:8000/docs")
    print(f"🔍 API Explorer: http://localhost:8000/redoc")

if __name__ == "__main__":
    print("🎓 ShikkhaSathi - AI-Powered Learning Platform")
    print("🐳 Docker Development Mode - Using PostgreSQL, MongoDB, Redis")
    print("=" * 60)
    
    uvicorn.run(
        "run_dev_docker:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

# Assignment Management Endpoints
@app.post("/api/v1/assignments/create")
async def create_assignment(assignment_data: dict):
    """Create a new assignment for a class"""
    try:
        # Generate assignment ID
        assignment_id = str(random.randint(10000, 99999))
        
        # Create assignment object
        new_assignment = {
            "id": assignment_id,
            "title": assignment_data.get("title", "Untitled Assignment"),
            "description": assignment_data.get("description", ""),
            "class_id": assignment_data.get("class_id"),
            "subject": assignment_data.get("subject", "General"),
            "due_date": assignment_data.get("due_date"),
            "max_points": assignment_data.get("max_points", 100),
            "instructions": assignment_data.get("instructions", ""),
            "allowed_file_types": ["png", "jpg", "jpeg", "pdf", "mp4"],
            "max_file_size": "10MB",
            "created_at": datetime.now().isoformat() + "Z",
            "created_by": "2",  # teacher1@example.com
            "status": "active"
        }
        
        # Store assignment
        storage.add_assignment(assignment_data.get("class_id"), new_assignment)
        
        return {
            "success": True,
            "assignment_id": assignment_id,
            "message": "Assignment created successfully!",
            "assignment": new_assignment,
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")

@app.get("/api/v1/assignments/class/{class_id}")
async def get_class_assignments(class_id: str):
    """Get all assignments for a specific class"""
    try:
        assignments = storage.get_class_assignments(class_id)
        
        # Add submission count for each assignment
        for assignment in assignments:
            submissions = storage.get_assignment_submissions(assignment["id"])
            assignment["submission_count"] = len(submissions)
            assignment["total_students"] = len(storage.students_in_classes.get(class_id, []))
        
        return {
            "success": True,
            "assignments": assignments,
            "total": len(assignments),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch assignments: {str(e)}")

@app.get("/api/v1/assignments/student")
async def get_student_assignments():
    """Get all assignments for the current student"""
    try:
        student_id = "1"  # student1@example.com
        assignments = storage.get_student_assignments(student_id)
        
        return {
            "success": True,
            "assignments": assignments,
            "total": len(assignments),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch student assignments: {str(e)}")

@app.post("/api/v1/assignments/submit")
async def submit_assignment(submission_data: dict):
    """Submit an assignment"""
    try:
        student_id = "1"  # student1@example.com
        assignment_id = submission_data.get("assignment_id")
        
        # Create submission object
        submission = {
            "id": str(random.randint(10000, 99999)),
            "assignment_id": assignment_id,
            "student_id": student_id,
            "student_name": "Student One",
            "submitted_at": datetime.now().isoformat() + "Z",
            "files": submission_data.get("files", []),
            "text_response": submission_data.get("text_response", ""),
            "status": "submitted",
            "grade": None,
            "feedback": None,
            "graded_at": None,
            "graded_by": None
        }
        
        # Store submission
        storage.add_submission(assignment_id, submission)
        
        return {
            "success": True,
            "submission_id": submission["id"],
            "message": "Assignment submitted successfully!",
            "submission": submission,
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit assignment: {str(e)}")

@app.get("/api/v1/assignments/{assignment_id}/submissions")
async def get_assignment_submissions(assignment_id: str):
    """Get all submissions for a specific assignment (teacher view)"""
    try:
        submissions = storage.get_assignment_submissions(assignment_id)
        assignment = storage.get_assignment_by_id(assignment_id)
        
        return {
            "success": True,
            "assignment": assignment,
            "submissions": submissions,
            "total_submissions": len(submissions),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch submissions: {str(e)}")

@app.post("/api/v1/assignments/grade")
async def grade_assignment(grading_data: dict):
    """Grade a student's assignment submission"""
    try:
        assignment_id = grading_data.get("assignment_id")
        student_id = grading_data.get("student_id")
        grade = grading_data.get("grade")
        feedback = grading_data.get("feedback", "")
        
        # Find and update submission
        submissions = storage.get_assignment_submissions(assignment_id)
        for submission in submissions:
            if submission["student_id"] == student_id:
                submission["grade"] = grade
                submission["feedback"] = feedback
                submission["graded_at"] = datetime.now().isoformat() + "Z"
                submission["graded_by"] = "2"  # teacher1@example.com
                submission["status"] = "graded"
                break
        
        return {
            "success": True,
            "message": "Assignment graded successfully!",
            "grade": grade,
            "feedback": feedback,
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade assignment: {str(e)}")

# Live Class Management Endpoints
@app.post("/api/v1/live-classes/create")
async def create_live_class(class_data: dict):
    """Create a new live class session"""
    try:
        # Generate live class ID
        live_class_id = str(random.randint(10000, 99999))
        
        # Create live class object
        new_live_class = {
            "id": live_class_id,
            "class_id": class_data.get("class_id"),
            "title": class_data.get("title", "Live Class"),
            "description": class_data.get("description", ""),
            "teacher_id": "2",  # teacher1@example.com
            "teacher_name": "Teacher One",
            "subject": class_data.get("subject", "General"),
            "scheduled_at": class_data.get("scheduled_at"),
            "duration_minutes": class_data.get("duration_minutes", 60),
            "max_participants": class_data.get("max_participants", 30),
            "meeting_url": f"https://192.168.0.109:5174/live/{live_class_id}",
            "meeting_id": live_class_id,
            "status": "scheduled",  # scheduled, live, ended
            "participants": [],
            "created_at": datetime.now().isoformat() + "Z"
        }
        
        # Store live class (in real app, this would go to database)
        if not hasattr(storage, 'live_classes'):
            storage.live_classes = {}
        storage.live_classes[live_class_id] = new_live_class
        
        return {
            "success": True,
            "live_class_id": live_class_id,
            "meeting_url": new_live_class["meeting_url"],
            "meeting_id": live_class_id,
            "message": "Live class created successfully!",
            "live_class": new_live_class,
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create live class: {str(e)}")

@app.get("/api/v1/live-classes/active")
async def get_active_live_classes():
    """Get all active and scheduled live classes"""
    try:
        # Mock data for now
        active_classes = [
            {
                "id": "12345",
                "class_id": "6947",
                "title": "Mathematics - Quadratic Equations",
                "subject": "Mathematics",
                "teacher_id": "2",
                "teacher_name": "Teacher One",
                "grade": 10,
                "status": "live",
                "participants": 15,
                "max_participants": 30,
                "started_at": datetime.now().isoformat() + "Z",
                "meeting_url": "https://192.168.0.109:5174/live/12345",
                "meeting_id": "12345"
            },
            {
                "id": "12346",
                "class_id": "6948",
                "title": "Physics - Motion and Forces",
                "subject": "Physics",
                "teacher_id": "2",
                "teacher_name": "Teacher Two",
                "grade": 10,
                "status": "scheduled",
                "participants": 0,
                "max_participants": 25,
                "scheduled_at": (datetime.now().replace(hour=16, minute=0, second=0)).isoformat() + "Z",
                "meeting_url": "https://192.168.0.109:5174/live/12346",
                "meeting_id": "12346"
            }
        ]
        
        return {
            "success": True,
            "live_classes": active_classes,
            "total": len(active_classes),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live classes: {str(e)}")

@app.post("/api/v1/live-classes/{live_class_id}/start")
async def start_live_class(live_class_id: str):
    """Start a scheduled live class"""
    try:
        # In real implementation, this would update the database
        return {
            "success": True,
            "message": "Live class started successfully!",
            "meeting_url": f"https://192.168.0.109:5174/live/{live_class_id}",
            "status": "live",
            "started_at": datetime.now().isoformat() + "Z",
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start live class: {str(e)}")

@app.post("/api/v1/live-classes/{live_class_id}/end")
async def end_live_class(live_class_id: str):
    """End an active live class"""
    try:
        # In real implementation, this would update the database
        return {
            "success": True,
            "message": "Live class ended successfully!",
            "status": "ended",
            "ended_at": datetime.now().isoformat() + "Z",
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end live class: {str(e)}")

@app.post("/api/v1/live-classes/{live_class_id}/join")
async def join_live_class(live_class_id: str, participant_data: dict):
    """Join a live class as a participant"""
    try:
        student_id = participant_data.get("student_id", "1")
        student_name = participant_data.get("student_name", "Student One")
        
        # In real implementation, this would add participant to database
        return {
            "success": True,
            "message": "Successfully joined live class!",
            "meeting_url": f"https://192.168.0.109:5174/live/{live_class_id}",
            "participant_id": student_id,
            "joined_at": datetime.now().isoformat() + "Z",
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to join live class: {str(e)}")

@app.get("/api/v1/live-classes/{live_class_id}/participants")
async def get_live_class_participants(live_class_id: str):
    """Get participants of a live class"""
    try:
        # Mock participants data
        participants = [
            {
                "id": "2",
                "name": "Teacher One",
                "role": "teacher",
                "joined_at": datetime.now().isoformat() + "Z",
                "is_host": True,
                "video_enabled": True,
                "audio_enabled": True
            },
            {
                "id": "1",
                "name": "আহমেদ রহমান",
                "role": "student",
                "joined_at": datetime.now().isoformat() + "Z",
                "is_host": False,
                "video_enabled": True,
                "audio_enabled": False
            },
            {
                "id": "3",
                "name": "ফাতিমা খাতুন",
                "role": "student",
                "joined_at": datetime.now().isoformat() + "Z",
                "is_host": False,
                "video_enabled": False,
                "audio_enabled": True
            }
        ]
        
        return {
            "success": True,
            "participants": participants,
            "total_participants": len(participants),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch participants: {str(e)}")

# Scheduled Class Management Endpoints
@app.post("/api/v1/scheduled-classes/create")
async def create_scheduled_class(schedule_data: dict):
    """Create a new scheduled class"""
    try:
        # Generate scheduled class ID
        scheduled_class_id = str(random.randint(10000, 99999))
        
        # Create scheduled class object
        new_scheduled_class = {
            "id": scheduled_class_id,
            "class_id": schedule_data.get("classId"),
            "title": schedule_data.get("title", "Scheduled Online Class"),
            "description": schedule_data.get("description", ""),
            "teacher_id": schedule_data.get("teacher_id", "2"),
            "teacher_name": "Teacher One",
            "scheduled_date": schedule_data.get("scheduledDate"),
            "scheduled_time": schedule_data.get("scheduledTime"),
            "duration": schedule_data.get("duration", 60),
            "notify_before": schedule_data.get("notifyBefore", 15),
            "is_recurring": schedule_data.get("isRecurring", False),
            "recurring_pattern": schedule_data.get("recurringPattern"),
            "max_participants": schedule_data.get("maxParticipants"),
            "status": "scheduled",  # scheduled, live, completed, cancelled
            "participants": [],
            "meeting_url": f"https://192.168.0.109:5174/scheduled/{scheduled_class_id}",
            "meeting_id": scheduled_class_id,
            "created_at": datetime.now().isoformat() + "Z",
            "notifications_sent": False
        }
        
        # Store scheduled class
        if not hasattr(storage.data, 'scheduled_classes'):
            storage.data['scheduled_classes'] = {}
        storage.data['scheduled_classes'][scheduled_class_id] = new_scheduled_class
        storage._save_data()
        
        return {
            "success": True,
            "scheduled_class_id": scheduled_class_id,
            "meeting_url": new_scheduled_class["meeting_url"],
            "meeting_id": scheduled_class_id,
            "message": "Class scheduled successfully!",
            "scheduled_class": new_scheduled_class,
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule class: {str(e)}")

@app.get("/api/v1/scheduled-classes/teacher/{teacher_id}")
async def get_teacher_scheduled_classes(teacher_id: str):
    """Get all scheduled classes for a teacher"""
    try:
        if not hasattr(storage.data, 'scheduled_classes'):
            storage.data['scheduled_classes'] = {}
        
        teacher_scheduled_classes = []
        for scheduled_class in storage.data['scheduled_classes'].values():
            if scheduled_class.get("teacher_id") == teacher_id:
                teacher_scheduled_classes.append(scheduled_class)
        
        # Sort by scheduled date/time
        teacher_scheduled_classes.sort(key=lambda x: f"{x['scheduled_date']} {x['scheduled_time']}")
        
        return {
            "success": True,
            "scheduled_classes": teacher_scheduled_classes,
            "total": len(teacher_scheduled_classes),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scheduled classes: {str(e)}")

@app.get("/api/v1/scheduled-classes/student/{student_id}")
async def get_student_scheduled_classes(student_id: str):
    """Get all scheduled classes for a student"""
    try:
        if not hasattr(storage.data, 'scheduled_classes'):
            storage.data['scheduled_classes'] = {}
        
        # Get student's classes
        student_class_ids = storage.data["student_classes"].get(student_id, [])
        
        student_scheduled_classes = []
        for scheduled_class in storage.data['scheduled_classes'].values():
            if scheduled_class.get("class_id") in student_class_ids:
                student_scheduled_classes.append(scheduled_class)
        
        # Sort by scheduled date/time
        student_scheduled_classes.sort(key=lambda x: f"{x['scheduled_date']} {x['scheduled_time']}")
        
        return {
            "success": True,
            "scheduled_classes": student_scheduled_classes,
            "total": len(student_scheduled_classes),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch student scheduled classes: {str(e)}")

@app.post("/api/v1/scheduled-classes/{scheduled_class_id}/start")
async def start_scheduled_class(scheduled_class_id: str):
    """Start a scheduled class (convert to live class)"""
    try:
        if not hasattr(storage.data, 'scheduled_classes'):
            return {"success": False, "message": "Scheduled class not found"}
        
        scheduled_class = storage.data['scheduled_classes'].get(scheduled_class_id)
        if not scheduled_class:
            raise HTTPException(status_code=404, detail="Scheduled class not found")
        
        # Update status to live
        scheduled_class["status"] = "live"
        scheduled_class["started_at"] = datetime.now().isoformat() + "Z"
        storage._save_data()
        
        return {
            "success": True,
            "message": "Scheduled class started successfully!",
            "meeting_url": scheduled_class["meeting_url"],
            "meeting_id": scheduled_class["meeting_id"],
            "status": "live",
            "started_at": scheduled_class["started_at"],
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start scheduled class: {str(e)}")

@app.post("/api/v1/scheduled-classes/{scheduled_class_id}/join")
async def join_scheduled_class(scheduled_class_id: str, participant_data: dict):
    """Join a scheduled class"""
    try:
        if not hasattr(storage.data, 'scheduled_classes'):
            return {"success": False, "message": "Scheduled class not found"}
        
        scheduled_class = storage.data['scheduled_classes'].get(scheduled_class_id)
        if not scheduled_class:
            raise HTTPException(status_code=404, detail="Scheduled class not found")
        
        student_id = participant_data.get("student_id", "1")
        student_name = participant_data.get("student_name", "Student One")
        
        # Add participant if not already joined
        participant = {
            "id": student_id,
            "name": student_name,
            "role": "student",
            "joined_at": datetime.now().isoformat() + "Z"
        }
        
        if not any(p["id"] == student_id for p in scheduled_class["participants"]):
            scheduled_class["participants"].append(participant)
            storage._save_data()
        
        return {
            "success": True,
            "message": "Successfully joined scheduled class!",
            "meeting_url": scheduled_class["meeting_url"],
            "meeting_id": scheduled_class["meeting_id"],
            "participant_id": student_id,
            "joined_at": participant["joined_at"],
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to join scheduled class: {str(e)}")

@app.get("/api/v1/scheduled-classes/upcoming")
async def get_upcoming_scheduled_classes():
    """Get upcoming scheduled classes for notifications"""
    try:
        if not hasattr(storage.data, 'scheduled_classes'):
            storage.data['scheduled_classes'] = {}
        
        current_time = datetime.now()
        upcoming_classes = []
        
        for scheduled_class in storage.data['scheduled_classes'].values():
            if scheduled_class["status"] == "scheduled":
                # Parse scheduled date and time
                scheduled_datetime_str = f"{scheduled_class['scheduled_date']} {scheduled_class['scheduled_time']}"
                try:
                    scheduled_datetime = datetime.fromisoformat(scheduled_datetime_str.replace('Z', ''))
                    
                    # Check if class is within notification window
                    time_diff = (scheduled_datetime - current_time).total_seconds() / 60  # minutes
                    notify_before = scheduled_class.get("notify_before", 15)
                    
                    if 0 <= time_diff <= notify_before and not scheduled_class.get("notifications_sent", False):
                        upcoming_classes.append({
                            **scheduled_class,
                            "minutes_until_start": int(time_diff)
                        })
                except ValueError:
                    continue  # Skip invalid datetime formats
        
        return {
            "success": True,
            "upcoming_classes": upcoming_classes,
            "total": len(upcoming_classes),
            "database_mode": "docker"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch upcoming classes: {str(e)}")

# File upload endpoint for assignments
@app.post("/api/v1/assignments/upload")
async def upload_assignment_file():
    """Handle file uploads for assignments"""
    # In a real implementation, this would handle actual file uploads
    # For development, we'll simulate file upload
    
    import uuid
    file_id = str(uuid.uuid4())
    
    return {
        "success": True,
        "file_id": file_id,
        "file_url": f"/uploads/assignments/{file_id}",
        "message": "File uploaded successfully!",
        "database_mode": "docker"
    }

# Serve uploaded files (for development)
@app.get("/uploads/assignments/{file_path}")
async def serve_uploaded_file(file_path: str):
    """Serve uploaded assignment files"""
    # In development, we'll return sample file responses
    if file_path.endswith('.pdf'):
        # Return a simple PDF response
        from fastapi.responses import Response
        
        # Simple PDF content (minimal PDF structure)
        pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [0 0 612 792]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 16 Tf
72 720 Td
(Student Assignment Submission - Docker Mode) Tj
0 -30 Td
(Name: Student One) Tj
0 -30 Td
(Subject: Mathematics) Tj
0 -30 Td
(Assignment: Quadratic Equations) Tj
0 -50 Td
(Problem 1: x^2 + 5x + 6 = 0) Tj
0 -20 Td
(Solution: x = -2, x = -3) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000525 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
622
%%EOF"""
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={file_path}"}
        )
    
    elif file_path.endswith(('.jpg', '.jpeg', '.png')):
        # Return a simple 1x1 pixel image for demo
        from fastapi.responses import Response
        import base64
        
        # Simple 1x1 red pixel PNG (base64 encoded)
        red_pixel_png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )
        
        return Response(
            content=red_pixel_png,
            media_type="image/png",
            headers={"Content-Disposition": f"inline; filename={file_path}"}
        )
    
    # For other file types, return a 404
    raise HTTPException(status_code=404, detail="File not found")