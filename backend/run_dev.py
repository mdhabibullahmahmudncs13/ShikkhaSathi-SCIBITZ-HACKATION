#!/usr/bin/env python3
"""
Development server for ShikkhaSathi
Runs with minimal dependencies using SQLite and mock services
"""

import sys
import os
import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import random
import string

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import development configuration
from app.core.config_dev import dev_settings
from app.db.session_dev import create_tables

# In-memory storage for development
class InMemoryStorage:
    def __init__(self):
        self.classes = {}  # teacher_id -> list of classes
        self.students_in_classes = {}  # class_id -> list of student_ids
        self.student_classes = {}  # student_id -> list of class_ids
        self.assignments = {}  # class_id -> list of assignments
        self.submissions = {}  # assignment_id -> list of submissions
        self.scheduled_classes = {}  # scheduled_class_id -> scheduled_class_data
        
        # Initialize with empty data - teachers will start with no classes and can create their own
    
    def add_class(self, teacher_id: str, class_data: dict):
        if teacher_id not in self.classes:
            self.classes[teacher_id] = []
        
        self.classes[teacher_id].append(class_data)
        return class_data
    
    def get_teacher_classes(self, teacher_id: str):
        return self.classes.get(teacher_id, [])
    
    def get_class_by_code(self, class_code: str):
        for teacher_id, classes in self.classes.items():
            for class_info in classes:
                if class_info["class_code"] == class_code:
                    return class_info
        return None
    
    def join_student_to_class(self, student_id: str, class_id: str):
        if class_id not in self.students_in_classes:
            self.students_in_classes[class_id] = []
        
        if student_id not in self.students_in_classes[class_id]:
            self.students_in_classes[class_id].append(student_id)
            
            # Update student's class list
            if student_id not in self.student_classes:
                self.student_classes[student_id] = []
            if class_id not in self.student_classes[student_id]:
                self.student_classes[student_id].append(class_id)
            
            # Update student count in class
            for teacher_id, classes in self.classes.items():
                for class_info in classes:
                    if class_info["id"] == class_id:
                        class_info["student_count"] = len(self.students_in_classes[class_id])
                        break
    
    def get_student_classes(self, student_id: str):
        student_class_ids = self.student_classes.get(student_id, [])
        student_classes = []
        
        for teacher_id, classes in self.classes.items():
            for class_info in classes:
                if class_info["id"] in student_class_ids:
                    student_classes.append(class_info)
        
        return student_classes
    
    # Assignment management methods
    def add_assignment(self, class_id: str, assignment_data: dict):
        if class_id not in self.assignments:
            self.assignments[class_id] = []
        
        self.assignments[class_id].append(assignment_data)
        return assignment_data
    
    def get_class_assignments(self, class_id: str):
        return self.assignments.get(class_id, [])
    
    def get_assignment_by_id(self, assignment_id: str):
        for class_id, assignments in self.assignments.items():
            for assignment in assignments:
                if assignment["id"] == assignment_id:
                    return assignment
        return None
    
    def add_submission(self, assignment_id: str, submission_data: dict):
        if assignment_id not in self.submissions:
            self.submissions[assignment_id] = []
        
        # Check if student already submitted
        student_id = submission_data["student_id"]
        existing_submissions = self.submissions[assignment_id]
        
        for i, submission in enumerate(existing_submissions):
            if submission["student_id"] == student_id:
                # Update existing submission
                existing_submissions[i] = submission_data
                return submission_data
        
        # Add new submission
        self.submissions[assignment_id].append(submission_data)
        return submission_data
    
    def get_assignment_submissions(self, assignment_id: str):
        return self.submissions.get(assignment_id, [])
    
    def get_student_assignments(self, student_id: str):
        student_assignments = []
        student_class_ids = self.student_classes.get(student_id, [])
        
        for class_id in student_class_ids:
            class_assignments = self.get_class_assignments(class_id)
            for assignment in class_assignments:
                # Check if student has submitted
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
    
    def update_assignment(self, assignment_id: str, updated_data: dict):
        for class_id, assignments in self.assignments.items():
            for i, assignment in enumerate(assignments):
                if assignment["id"] == assignment_id:
                    # Update the assignment with new data
                    assignments[i].update(updated_data)
                    return assignments[i]
        return None
    
    def delete_assignment(self, assignment_id: str):
        for class_id, assignments in self.assignments.items():
            for i, assignment in enumerate(assignments):
                if assignment["id"] == assignment_id:
                    # Remove the assignment
                    deleted_assignment = assignments.pop(i)
                    # Also remove all submissions for this assignment
                    if assignment_id in self.submissions:
                        del self.submissions[assignment_id]
                    return deleted_assignment
        return None

# Global storage instance
storage = InMemoryStorage()

# Create FastAPI app
app = FastAPI(
    title="ShikkhaSathi API",
    description="AI-Powered Learning Platform for Bangladesh",
    version="1.0.0-dev",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=dev_settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "ShikkhaSathi API - Development Mode",
        "version": "1.0.0-dev",
        "status": "running",
        "database": "SQLite (development)",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "2025-01-09T00:00:00Z",
        "database": "connected",
        "mode": "development"
    }

@app.get("/api/v1/health")
@app.head("/api/v1/health")
async def api_health_check():
    return {
        "status": "healthy",
        "timestamp": "2025-01-10T00:00:00Z",
        "database": "connected",
        "mode": "development",
        "api_version": "v1"
    }

# Basic API endpoints for testing
@app.get("/api/v1/status")
async def api_status():
    return {
        "api_version": "v1",
        "status": "operational",
        "timestamp": datetime.now().isoformat() + "Z",
        "server": "ShikkhaSathi Development Server",
        "features": {
            "authentication": "available",
            "database": "sqlite",
            "ai_services": "mock",
            "voice_services": "mock",
            "scheduled_classes": "available",
            "live_classes": "available"
        },
        "cors_enabled": True,
        "endpoints": {
            "health": "/api/v1/health",
            "auth": "/api/v1/auth/login",
            "scheduled_classes": "/api/v1/scheduled-classes",
            "live_classes": "/api/v1/live-classes"
        }
    }

# Mock authentication endpoint
@app.post("/api/v1/auth/login")
async def login(credentials: dict):
    # Mock login for development
    email = credentials.get("email", "")
    password = credentials.get("password", "")
    
    # Mock users for testing
    mock_users = {
        "student1@example.com": {"role": "student", "name": "Student One", "id": "1"},
        "teacher1@example.com": {"role": "teacher", "name": "Teacher One", "id": "2"},
        "parent1@example.com": {"role": "parent", "name": "Parent One", "id": "3"},
        "admin@example.com": {"role": "admin", "name": "Admin User", "id": "4"}
    }
    
    if email in mock_users and password == "password123":
        user_data = mock_users[email]
        
        # Store the current user email for the /users/me endpoint
        get_current_user_v2.current_email = email
        
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

@app.get("/api/v1/auth/me")
async def get_current_user():
    # Use the same logic as /users/me
    return await get_current_user_v2()

@app.get("/api/v1/users/me")
async def get_current_user_v2():
    # Get the token from the request to determine which user is logged in
    # In a real app, this would decode the JWT token
    # For development, we'll use a simple approach based on stored token
    
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
    
    # In development, we'll extract the email from the mock token
    # The token format is "mock_token_{email}"
    from fastapi import Request, HTTPException
    import re
    
    # Try to get the authorization header
    try:
        # For development, we'll use a global variable to track the current user
        # This is set during login
        current_user_email = getattr(get_current_user_v2, 'current_email', 'student1@example.com')
        
        if current_user_email in mock_users:
            user_data = mock_users[current_user_email]
            return {
                **user_data,
                "is_active": True,
                "created_at": "2025-01-01T00:00:00Z"
            }
        else:
            # Default to student if email not found
            user_data = mock_users["student1@example.com"]
            return {
                **user_data,
                "is_active": True,
                "created_at": "2025-01-01T00:00:00Z"
            }
    except:
        # Fallback to student user
        user_data = mock_users["student1@example.com"]
        return {
            **user_data,
            "is_active": True,
            "created_at": "2025-01-01T00:00:00Z"
        }

# Additional mock endpoints
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

# Mock dashboard endpoints
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
        }
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
        "class": new_class
    }

@app.post("/api/v1/connect/student/join-class")
async def join_class(join_data: dict):
    # Mock class joining for development
    print(f"DEBUG: Received join_data: {join_data}")  # Debug logging
    class_code = join_data.get("class_code", "")
    print(f"DEBUG: Extracted class_code: '{class_code}'")  # Debug logging
    student_id = "1"  # student1@example.com
    
    # Find class by code
    class_info = storage.get_class_by_code(class_code)
    print(f"DEBUG: Found class_info: {class_info}")  # Debug logging
    
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
            }
        }
    else:
        print(f"DEBUG: Class not found for code: '{class_code}'")  # Debug logging
        print(f"DEBUG: Available classes: {storage.classes}")  # Debug logging
        from fastapi import HTTPException
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
            }
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
        ]
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
        ]
    }

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
            "assignment": new_assignment
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "total": len(assignments)
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "total": len(assignments)
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "submission": submission
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "total_submissions": len(submissions)
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "feedback": feedback
        }
        
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to grade assignment: {str(e)}")

@app.put("/api/v1/assignments/{assignment_id}")
async def update_assignment(assignment_id: str, assignment_data: dict):
    """Update an existing assignment"""
    try:
        # Update assignment data
        updated_assignment = storage.update_assignment(assignment_id, assignment_data)
        
        if updated_assignment:
            return {
                "success": True,
                "message": "Assignment updated successfully!",
                "assignment": updated_assignment
            }
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Assignment not found")
        
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to update assignment: {str(e)}")

@app.delete("/api/v1/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str):
    """Delete an assignment"""
    try:
        deleted_assignment = storage.delete_assignment(assignment_id)
        
        if deleted_assignment:
            return {
                "success": True,
                "message": "Assignment deleted successfully!",
                "assignment": deleted_assignment
            }
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Assignment not found")
        
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to delete assignment: {str(e)}")

# AI Tutor Endpoints (Enhanced with Real AI Integration)
@app.post("/api/v1/ai/chat")
async def ai_chat(message: dict):
    """AI-powered chat endpoint with mock responses for development"""
    try:
        user_message = message.get("message", "")
        subject = message.get("subject", "general") or "general"  # Handle None values
        grade = message.get("grade", 8)
        conversation_history = message.get("conversation_history", [])
        
        logger.info(f"AI Chat request: {user_message} (subject: {subject}, grade: {grade})")
        
        # Use mock responses for development mode
        mock_responses = {
            "physics": {
                "force": "Force is a push or pull that can change the motion of an object. In physics, we measure force in Newtons (N). For example, when you push a book across a table, you're applying a force to it.",
                "motion": "Motion is the change in position of an object over time. There are different types of motion: linear (straight line), circular, and rotational.",
                "energy": "Energy is the ability to do work. There are many forms of energy like kinetic energy (energy of motion) and potential energy (stored energy).",
                "gravity": "Gravity is a fundamental force that attracts objects with mass toward each other. On Earth, gravity gives objects weight and causes them to fall toward the ground.",
                "physics": "Physics is the study of matter, energy, and their interactions. It helps us understand how the universe works, from tiny atoms to massive stars.",
                "velocity": "Velocity is the speed of an object in a specific direction. Unlike speed, velocity includes both magnitude and direction.",
                "acceleration": "Acceleration is the rate of change of velocity. When you press the gas pedal in a car, you're causing acceleration.",
                "mass": "Mass is the amount of matter in an object. It's different from weight, which depends on gravity.",
                "weight": "Weight is the force of gravity acting on an object's mass. Your weight changes on different planets, but your mass stays the same.",
                "momentum": "Momentum is mass times velocity. A heavy truck moving slowly can have the same momentum as a light car moving fast.",
                "friction": "Friction is the force that opposes motion between two surfaces in contact. It's why you can walk without slipping.",
                "pressure": "Pressure is force applied over an area. When you use a sharp knife, you're concentrating force into a small area to create high pressure."
            },
            "mathematics": {
                "algebra": "Algebra is a branch of mathematics that uses letters and symbols to represent numbers and quantities in formulas and equations. It helps solve problems by finding unknown values.",
                "geometry": "Geometry is the study of shapes, sizes, and properties of figures and spaces. It includes concepts like area, perimeter, and volume.",
                "calculus": "Calculus is advanced mathematics that deals with rates of change and accumulation of quantities.",
                "equation": "An equation is a mathematical statement that shows two expressions are equal, using the equals sign (=).",
                "math": "Mathematics is the study of numbers, shapes, patterns, and relationships. It's essential for solving problems in science, engineering, and everyday life.",
                "mathematics": "Mathematics is the study of numbers, shapes, patterns, and relationships. It's essential for solving problems in science, engineering, and everyday life.",
                "fraction": "A fraction represents a part of a whole. For example, 1/2 means one part out of two equal parts.",
                "percentage": "A percentage is a way to express a number as a fraction of 100. For example, 50% means 50 out of 100.",
                "ratio": "A ratio compares two or more quantities. For example, if there are 3 boys and 2 girls, the ratio is 3:2.",
                "proportion": "A proportion is an equation that shows two ratios are equal. It's useful for solving problems involving scaling.",
                "variable": "A variable is a symbol (usually a letter) that represents an unknown number in mathematical expressions.",
                "function": "A function is a mathematical relationship where each input has exactly one output.",
                "graph": "A graph is a visual representation of data or mathematical relationships using points, lines, or curves.",
                "triangle": "A triangle is a polygon with three sides and three angles. The sum of angles in any triangle is always 180 degrees.",
                "circle": "A circle is a round shape where all points are the same distance from the center. That distance is called the radius.",
                "area": "Area is the amount of space inside a 2D shape, measured in square units like square meters or square feet.",
                "volume": "Volume is the amount of space inside a 3D object, measured in cubic units like cubic meters or liters.",
                "perimeter": "Perimeter is the distance around the outside of a 2D shape. For a rectangle, it's 2 × (length + width)."
            },
            "chemistry": {
                "atom": "An atom is the smallest unit of matter that retains the properties of an element. It consists of protons, neutrons, and electrons.",
                "molecule": "A molecule is formed when two or more atoms bond together. Water (H2O) is a simple example of a molecule.",
                "reaction": "A chemical reaction occurs when substances interact to form new compounds with different properties.",
                "element": "An element is a pure substance made of only one type of atom. Examples include hydrogen, oxygen, and carbon.",
                "chemistry": "Chemistry is the study of matter and the changes it undergoes. It explores atoms, molecules, and chemical reactions.",
                "compound": "A compound is a substance made of two or more different elements chemically bonded together, like water (H2O).",
                "ion": "An ion is an atom or molecule that has gained or lost electrons, giving it a positive or negative charge.",
                "acid": "An acid is a substance that releases hydrogen ions (H+) in water. Examples include lemon juice and vinegar.",
                "base": "A base is a substance that accepts hydrogen ions or releases hydroxide ions (OH-) in water. Soap is a common base.",
                "ph": "pH measures how acidic or basic a solution is on a scale from 0 to 14. 7 is neutral, below 7 is acidic, above 7 is basic.",
                "oxidation": "Oxidation is a chemical reaction where a substance loses electrons, often involving oxygen. Rusting is an example.",
                "reduction": "Reduction is a chemical reaction where a substance gains electrons. It's the opposite of oxidation.",
                "catalyst": "A catalyst is a substance that speeds up a chemical reaction without being consumed in the process.",
                "solution": "A solution is a mixture where one substance (solute) is completely dissolved in another (solvent)."
            },
            "biology": {
                "cell": "A cell is the basic unit of life. All living things are made up of one or more cells. Cells contain organelles that perform specific functions.",
                "photosynthesis": "Photosynthesis is the process by which plants make their own food using sunlight, carbon dioxide, and water. The process uses chlorophyll in leaves to capture light energy and convert it into chemical energy (glucose).",
                "evolution": "Evolution is the process by which species change over time through natural selection and genetic variation.",
                "dna": "DNA (Deoxyribonucleic acid) is the molecule that carries genetic information in all living organisms.",
                "biology": "Biology is the study of living organisms and life processes. It covers everything from tiny bacteria to complex ecosystems.",
                "gene": "A gene is a section of DNA that contains instructions for making a specific protein or trait.",
                "chromosome": "A chromosome is a structure that contains DNA and genes. Humans have 23 pairs of chromosomes.",
                "protein": "Proteins are large molecules made of amino acids that perform many functions in living organisms.",
                "enzyme": "An enzyme is a type of protein that speeds up chemical reactions in living organisms.",
                "mitosis": "Mitosis is the process by which a cell divides to create two identical daughter cells.",
                "meiosis": "Meiosis is the process that creates sex cells (gametes) with half the normal number of chromosomes.",
                "ecosystem": "An ecosystem is a community of living organisms interacting with their physical environment.",
                "habitat": "A habitat is the natural environment where an organism lives and meets its needs for survival.",
                "species": "A species is a group of organisms that can reproduce with each other and produce fertile offspring.",
                "adaptation": "An adaptation is a trait that helps an organism survive and reproduce in its environment.",
                "respiration": "Cellular respiration is the process by which cells break down glucose to release energy for life processes."
            },
            "bangla": {
                "grammar": "বাংলা ব্যাকরণ হল বাংলা ভাষার নিয়ম-কানুন। এটি সঠিক বাংলা লেখা ও বলার জন্য অত্যন্ত গুরুত্বপূর্ণ।",
                "literature": "বাংলা সাহিত্য অত্যন্ত সমৃদ্ধ। রবীন্দ্রনাথ ঠাকুর, কাজী নজরুল ইসলাম এবং আরও অনেক মহান লেখক আমাদের সাহিত্যকে সমৃদ্ধ করেছেন।",
                "bangla": "বাংলা আমাদের মাতৃভাষা। এটি বিশ্বের অন্যতম সুন্দর ভাষা এবং আমাদের সংস্কৃতির অবিচ্ছেদ্য অংশ।",
                "noun": "বিশেষ্য হল যে শব্দ দিয়ে কোনো ব্যক্তি, বস্তু, স্থান বা ভাবের নাম বোঝায়। যেমন: মানুষ, বই, ঢাকা, ভালোবাসা।",
                "verb": "ক্রিয়া হল যে শব্দ দিয়ে কোনো কাজ, অবস্থা বা গতির কথা বোঝায়। যেমন: খাওয়া, দৌড়ানো, ঘুমানো।",
                "adjective": "বিশেষণ হল যে শব্দ বিশেষ্যের গুণ, অবস্থা বা পরিমাণ প্রকাশ করে। যেমন: সুন্দর, বড়, ভালো।",
                "pronoun": "সর্বনাম হল যে শব্দ বিশেষ্যের পরিবর্তে ব্যবহৃত হয়। যেমন: আমি, তুমি, সে, এটা।"
            },
            "english": {
                "grammar": "English grammar includes rules for sentence structure, verb tenses, and proper word usage. It's essential for clear communication.",
                "literature": "English literature includes works by Shakespeare, Dickens, and many other great authors who have shaped the language.",
                "english": "English is a global language used for international communication, science, and technology.",
                "noun": "A noun is a word that names a person, place, thing, or idea. Examples: teacher, school, book, happiness.",
                "verb": "A verb is a word that shows action or state of being. Examples: run, jump, is, seems.",
                "adjective": "An adjective is a word that describes or modifies a noun. Examples: big, beautiful, smart, red.",
                "pronoun": "A pronoun is a word that takes the place of a noun. Examples: he, she, it, they, we.",
                "adverb": "An adverb is a word that modifies a verb, adjective, or another adverb. Examples: quickly, very, well.",
                "preposition": "A preposition shows the relationship between a noun and other words. Examples: in, on, at, under, over.",
                "conjunction": "A conjunction connects words, phrases, or clauses. Examples: and, but, or, because, although.",
                "sentence": "A sentence is a group of words that expresses a complete thought. It must have a subject and a predicate.",
                "paragraph": "A paragraph is a group of related sentences that develop one main idea or topic.",
                "essay": "An essay is a piece of writing that presents and supports a particular point of view or argument."
            },
            "general": {
                "hello": "Hello! I'm ShikkhaSathi, your AI tutor. I'm here to help you learn Physics, Chemistry, Mathematics, Biology, Bangla, and English. What would you like to learn about today?",
                "help": "I can help you with various subjects including Physics, Chemistry, Mathematics, Biology, Bangla, and English. Just ask me any question about these topics!",
                "learn": "Learning is a wonderful journey! I'm here to guide you through any topic you're curious about. What subject interests you most?",
                "study": "Studying effectively involves understanding concepts, practicing problems, and asking questions. I'm here to help you with all of that!",
                "what": "I'm here to answer your questions! Please ask me about any topic in Physics, Chemistry, Mathematics, Biology, Bangla, or English.",
                "how": "I can explain how things work in science, math, and language. What specific topic would you like me to explain?",
                "why": "Great question! I love explaining the 'why' behind concepts. What topic are you curious about?",
                "explain": "I'd be happy to explain any concept to you! Please tell me what topic you'd like me to explain.",
                "define": "I can define terms and concepts for you. What would you like me to define?",
                "meaning": "I can help you understand the meaning of concepts and terms. What would you like to know about?"
            }
        }
        
        # Find relevant response
        response_text = "I'd be happy to help you learn! Could you please be more specific about what you'd like to know?"
        
        subject_lower = subject.lower()
        message_lower = user_message.lower()
        
        # Check for greetings first
        greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]
        if any(greeting in message_lower for greeting in greetings):
            response_text = "Hello! I'm ShikkhaSathi, your AI tutor. I'm here to help you learn Physics, Chemistry, Mathematics, Biology, Bangla, and English. What would you like to learn about today?"
        else:
            # Look for subject-specific responses first
            found_match = False
            best_match = None
            best_match_length = 0
            
            # First, search all subjects for the longest matching keyword
            for subj, responses in mock_responses.items():
                for keyword, response in responses.items():
                    if keyword in message_lower and len(keyword) > best_match_length:
                        best_match = {
                            'subject': subj,
                            'keyword': keyword,
                            'response': response
                        }
                        best_match_length = len(keyword)
                        found_match = True
            
            # Use the best (longest) match found
            if found_match and best_match:
                response_text = best_match['response']
                subject = best_match['subject']
                logger.info(f"Found best keyword match '{best_match['keyword']}' (length: {best_match_length}) in subject '{best_match['subject']}'")
            
            # If still no match, provide a helpful default response
            if not found_match:
                logger.info(f"No keyword match found for message: '{user_message}' in subject: '{subject_lower}'")
                response_text = "I'd be happy to help you learn! I can assist with Physics, Chemistry, Mathematics, Biology, Bangla, and English. Could you please be more specific about what topic you'd like to explore?"
        
        # Add grade-appropriate language
        if grade <= 8:
            response_text += "\n\nWould you like me to explain this in simpler terms or give you an example?"
        else:
            response_text += "\n\nWould you like me to go deeper into this topic or provide some practice problems?"
        
        return {
            "response": response_text,
            "subject": subject,
            "grade": grade,
            "sources": ["ShikkhaSathi Curriculum Database (Development Mode)"],
            "context_used": True,
            "model": "ShikkhaSathi AI Tutor (Mock Mode)"
        }
        
    except Exception as e:
        logger.error(f"Error in AI chat endpoint: {str(e)}")
        return {
            "response": "I'm sorry, I'm having trouble right now. Please try asking your question again.",
            "error": str(e),
            "model": "ShikkhaSathi AI Tutor (Error Mode)"
        }

@app.post("/api/v1/ai/explain-concept")
async def explain_concept(request: dict):
    """Explain a specific concept with real AI integration"""
    try:
        concept = request.get("concept", "")
        subject = request.get("subject", "")
        grade = request.get("grade", 8)
        difficulty_level = request.get("difficulty_level", "basic")
        
        # Try to use real AI tutor service first
        try:
            from app.services.rag.ai_tutor_service import ai_tutor_service
            
            if hasattr(ai_tutor_service, 'llm') and ai_tutor_service.llm is not None:
                # Use real AI tutor service
                response = await ai_tutor_service.explain_concept(
                    concept=concept,
                    subject=subject,
                    grade=grade,
                    difficulty_level=difficulty_level
                )
                return response
            else:
                raise Exception("AI service not available")
                
        except Exception as ai_error:
            logger.warning(f"AI service error: {ai_error}. Using mock responses.")
            
            # Mock concept explanations (fallback)
            explanations = {
                "force": {
                    "definition": "Force is a push or pull that acts on an object.",
                    "key_points": [
                        "Force can change an object's motion",
                        "Force is measured in Newtons (N)",
                        "Force has both magnitude and direction",
                        "Multiple forces can act on one object"
                    ],
                    "example": "When you kick a football, your foot applies a force to the ball, causing it to move.",
                    "misconceptions": "Force is not needed to keep an object moving at constant speed in space."
                },
                "photosynthesis": {
                    "definition": "Photosynthesis is how plants make food using sunlight.",
                    "key_points": [
                        "Plants use sunlight, water, and carbon dioxide",
                        "Chlorophyll captures light energy",
                        "Glucose (sugar) is produced as food",
                        "Oxygen is released as a byproduct"
                    ],
                    "example": "A mango tree uses sunlight to make sugar, which helps it grow and produce mangoes.",
                    "misconceptions": "Plants don't eat soil - they make their own food through photosynthesis."
                },
                "algebra": {
                    "definition": "Algebra uses letters and symbols to represent unknown numbers in equations.",
                    "key_points": [
                        "Variables (like x, y) represent unknown values",
                        "Equations show relationships between quantities",
                        "We solve equations to find the value of variables",
                        "Algebra helps solve real-world problems"
                    ],
                    "example": "If you have 3x + 5 = 14, you can solve to find x = 3.",
                    "misconceptions": "Letters in algebra aren't just abbreviations - they represent actual numbers."
                }
            }
            
            concept_lower = concept.lower()
            if concept_lower in explanations:
                explanation = explanations[concept_lower]
            else:
                explanation = {
                    "definition": f"{concept} is an important concept in {subject}.",
                    "key_points": ["This concept has multiple aspects", "It's important for understanding the subject"],
                    "example": f"You can see {concept} in everyday life.",
                    "misconceptions": "Make sure to understand the basics before moving to advanced topics."
                }
            
            return {
                "explanation": explanation,
                "concept": concept,
                "subject": subject,
                "grade": grade,
                "difficulty_level": difficulty_level,
                "sources": ["ShikkhaSathi Curriculum (Mock Mode)"]
            }
        
    except Exception as e:
        logger.error(f"Error in explain concept endpoint: {str(e)}")
        return {
            "explanation": {"definition": "Sorry, I couldn't explain this concept right now."},
            "error": str(e)
        }

@app.post("/api/v1/ai/generate-quiz")
async def generate_quiz(request: dict):
    """Generate quiz questions with real AI integration"""
    try:
        subject = request.get("subject", "")
        topic = request.get("topic", "")
        grade = request.get("grade", 8)
        num_questions = request.get("num_questions", 3)
        
        # Try to use real AI tutor service first
        try:
            from app.services.rag.ai_tutor_service import ai_tutor_service
            
            if hasattr(ai_tutor_service, 'llm') and ai_tutor_service.llm is not None:
                # Use real AI tutor service
                questions = await ai_tutor_service.generate_practice_questions(
                    topic=topic,
                    subject=subject,
                    grade=grade,
                    count=num_questions
                )
                
                return {
                    "questions": questions,
                    "subject": subject,
                    "topic": topic,
                    "grade": grade,
                    "total_questions": len(questions),
                    "model": "ShikkhaSathi AI (Real)"
                }
            else:
                raise Exception("AI service not available")
                
        except Exception as ai_error:
            logger.warning(f"AI service error: {ai_error}. Using mock quiz generation.")
            
            # Mock quiz questions (fallback)
            mock_questions = {
                "mathematics": [
                    {
                        "question": "What is 2 + 3 × 4?",
                        "options": ["A) 20", "B) 14", "C) 10", "D) 24"],
                        "correct_answer": "B",
                        "explanation": "Following order of operations (PEMDAS), multiplication comes before addition: 2 + (3 × 4) = 2 + 12 = 14"
                    },
                    {
                        "question": "If x + 5 = 12, what is the value of x?",
                        "options": ["A) 7", "B) 17", "C) 5", "D) 12"],
                        "correct_answer": "A",
                        "explanation": "Subtract 5 from both sides: x + 5 - 5 = 12 - 5, so x = 7"
                    }
                ],
                "physics": [
                    {
                        "question": "What is the unit of force?",
                        "options": ["A) Joule", "B) Newton", "C) Watt", "D) Pascal"],
                        "correct_answer": "B",
                        "explanation": "Force is measured in Newtons (N), named after Sir Isaac Newton"
                    },
                    {
                        "question": "What happens to an object in motion when no force acts on it?",
                        "options": ["A) It stops", "B) It speeds up", "C) It continues at constant velocity", "D) It changes direction"],
                        "correct_answer": "C",
                        "explanation": "According to Newton's first law, an object in motion stays in motion at constant velocity unless acted upon by a force"
                    }
                ],
                "chemistry": [
                    {
                        "question": "What is the chemical symbol for water?",
                        "options": ["A) H2O", "B) CO2", "C) NaCl", "D) O2"],
                        "correct_answer": "A",
                        "explanation": "Water consists of 2 hydrogen atoms and 1 oxygen atom, so its formula is H2O"
                    }
                ],
                "biology": [
                    {
                        "question": "What process do plants use to make their own food?",
                        "options": ["A) Respiration", "B) Photosynthesis", "C) Digestion", "D) Fermentation"],
                        "correct_answer": "B",
                        "explanation": "Photosynthesis is the process where plants use sunlight, water, and carbon dioxide to make glucose"
                    }
                ]
            }
            
            subject_lower = subject.lower()
            questions = mock_questions.get(subject_lower, mock_questions["mathematics"])
            
            # Limit to requested number of questions
            questions = questions[:num_questions]
            
            return {
                "questions": questions,
                "subject": subject,
                "topic": topic,
                "grade": grade,
                "total_questions": len(questions),
                "model": "ShikkhaSathi AI (Mock Mode)"
            }
        
    except Exception as e:
        logger.error(f"Error in generate quiz endpoint: {str(e)}")
        return {
            "questions": [],
            "error": str(e),
            "model": "ShikkhaSathi AI (Error Mode)"
        }

@app.post("/api/v1/ai/voice-to-text")
async def voice_to_text():
    """Convert voice to text with real AI integration"""
    try:
        # Try to use real voice service
        try:
            from app.services.voice_service import VoiceService
            
            voice_service = VoiceService()
            # In a real implementation, this would process uploaded audio file
            # For now, return a mock response
            
            return {
                "text": "This is a mock transcription. In the real implementation, this would process the uploaded audio file using Whisper.",
                "confidence": 0.95,
                "language": "en",
                "duration": 3.5,
                "model": "whisper-base"
            }
            
        except Exception as voice_error:
            logger.warning(f"Voice service error: {voice_error}. Using mock response.")
            
            return {
                "text": "Mock voice transcription: Hello, I would like to learn about photosynthesis.",
                "confidence": 0.85,
                "language": "en",
                "duration": 2.1,
                "model": "mock-whisper"
            }
        
    except Exception as e:
        logger.error(f"Error in voice-to-text endpoint: {str(e)}")
        return {
            "text": "",
            "error": str(e),
            "model": "voice-service-error"
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
        ]
    }

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
        "message": "File uploaded successfully!"
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
(Student Assignment Submission) Tj
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
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="File not found")

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
            "live_class": new_live_class
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "total": len(active_classes)
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "started_at": datetime.now().isoformat() + "Z"
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "ended_at": datetime.now().isoformat() + "Z"
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "joined_at": datetime.now().isoformat() + "Z"
        }
        
    except Exception as e:
        from fastapi import HTTPException
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
            "total_participants": len(participants)
        }
        
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to fetch participants: {str(e)}")

@app.get("/api/v1/debug/scheduled-classes")
async def debug_scheduled_classes():
    """Debug endpoint to check scheduled classes storage"""
    return {
        "total_scheduled_classes": len(storage.scheduled_classes),
        "scheduled_class_ids": list(storage.scheduled_classes.keys()),
        "scheduled_classes": {
            class_id: {
                "id": class_data["id"],
                "title": class_data["title"],
                "status": class_data["status"],
                "created_at": class_data["created_at"]
            }
            for class_id, class_data in storage.scheduled_classes.items()
        }
    }

@app.get("/api/v1/debug/storage")
async def debug_storage():
    """Debug endpoint to check all storage contents"""
    return {
        "classes": {
            teacher_id: [
                {
                    "id": class_info["id"],
                    "name": class_info["name"],
                    "student_count": class_info["student_count"]
                }
                for class_info in classes
            ]
            for teacher_id, classes in storage.classes.items()
        },
        "scheduled_classes_count": len(storage.scheduled_classes),
        "assignments_count": sum(len(assignments) for assignments in storage.assignments.values()),
        "students_in_classes": {
            class_id: len(students) 
            for class_id, students in storage.students_in_classes.items()
        }
    }
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
        storage.scheduled_classes[scheduled_class_id] = new_scheduled_class
        
        return {
            "success": True,
            "scheduled_class_id": scheduled_class_id,
            "meeting_url": new_scheduled_class["meeting_url"],
            "meeting_id": scheduled_class_id,
            "message": "Class scheduled successfully!",
            "scheduled_class": new_scheduled_class
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule class: {str(e)}")

@app.get("/api/v1/scheduled-classes/teacher/{teacher_id}")
async def get_teacher_scheduled_classes(teacher_id: str):
    """Get all scheduled classes for a teacher"""
    try:
        teacher_scheduled_classes = []
        for scheduled_class in storage.scheduled_classes.values():
            if scheduled_class.get("teacher_id") == teacher_id:
                teacher_scheduled_classes.append(scheduled_class)
        
        # Sort by scheduled date/time
        teacher_scheduled_classes.sort(key=lambda x: f"{x['scheduled_date']} {x['scheduled_time']}")
        
        return {
            "success": True,
            "scheduled_classes": teacher_scheduled_classes,
            "total": len(teacher_scheduled_classes)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scheduled classes: {str(e)}")

@app.get("/api/v1/scheduled-classes/student/{student_id}")
async def get_student_scheduled_classes(student_id: str):
    """Get all scheduled classes for a student"""
    try:
        # Get student's classes
        student_class_ids = storage.student_classes.get(student_id, [])
        
        student_scheduled_classes = []
        for scheduled_class in storage.scheduled_classes.values():
            if scheduled_class.get("class_id") in student_class_ids:
                student_scheduled_classes.append(scheduled_class)
        
        # Sort by scheduled date/time
        student_scheduled_classes.sort(key=lambda x: f"{x['scheduled_date']} {x['scheduled_time']}")
        
        return {
            "success": True,
            "scheduled_classes": student_scheduled_classes,
            "total": len(student_scheduled_classes)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch student scheduled classes: {str(e)}")

@app.get("/api/v1/scheduled-classes/{scheduled_class_id}")
async def get_scheduled_class(scheduled_class_id: str):
    """Get a single scheduled class by ID"""
    try:
        if scheduled_class_id in storage.scheduled_classes:
            scheduled_class = storage.scheduled_classes[scheduled_class_id]
            return {
                "success": True,
                "scheduled_class": scheduled_class
            }
        else:
            raise HTTPException(status_code=404, detail="Scheduled class not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scheduled class: {str(e)}")

@app.post("/api/v1/scheduled-classes/{scheduled_class_id}/start")
async def start_scheduled_class(scheduled_class_id: str):
    """Start a scheduled class (convert to live class)"""
    try:
        scheduled_class = storage.scheduled_classes.get(scheduled_class_id)
        if not scheduled_class:
            raise HTTPException(status_code=404, detail="Scheduled class not found")
        
        # Update status to live and change meeting URL to live class page
        scheduled_class["status"] = "live"
        scheduled_class["started_at"] = datetime.now().isoformat() + "Z"
        scheduled_class["meeting_url"] = f"https://192.168.0.109:5174/live/{scheduled_class_id}"
        
        return {
            "success": True,
            "message": "Scheduled class started successfully!",
            "meeting_url": scheduled_class["meeting_url"],
            "meeting_id": scheduled_class["meeting_id"],
            "status": "live",
            "started_at": scheduled_class["started_at"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start scheduled class: {str(e)}")

@app.post("/api/v1/scheduled-classes/{scheduled_class_id}/join")
async def join_scheduled_class(scheduled_class_id: str, participant_data: dict):
    """Join a scheduled class"""
    try:
        scheduled_class = storage.scheduled_classes.get(scheduled_class_id)
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
        
        return {
            "success": True,
            "message": "Successfully joined scheduled class!",
            "meeting_url": f"https://192.168.0.109:5174/live/{scheduled_class_id}" if scheduled_class["status"] == "live" else scheduled_class["meeting_url"],
            "meeting_id": scheduled_class["meeting_id"],
            "participant_id": student_id,
            "joined_at": participant["joined_at"],
            "class_status": scheduled_class["status"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to join scheduled class: {str(e)}")

@app.get("/api/v1/scheduled-classes/upcoming")
async def get_upcoming_scheduled_classes():
    """Get upcoming scheduled classes for notifications"""
    try:
        current_time = datetime.now()
        upcoming_classes = []
        
        for scheduled_class in storage.scheduled_classes.values():
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
            "total": len(upcoming_classes)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch upcoming classes: {str(e)}")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    print("🚀 Starting ShikkhaSathi Development Server...")
    print("📊 Creating database tables...")
    try:
        create_tables()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"⚠️  Database initialization warning: {e}")
    
    print("🌐 Server ready!")
    print(f"📖 API Documentation: http://localhost:8000/docs")
    print(f"🔍 API Explorer: http://localhost:8000/redoc")

# Voice service endpoints
@app.post("/api/v1/voice/test-synthesize")
async def test_voice_synthesize(request: dict):
    """Test voice synthesis endpoint"""
    try:
        text = request.get("text", "Hello, this is a test.")
        return {
            "success": True,
            "audio_url": "/api/v1/voice/audio/test.mp3",
            "text": text,
            "model": "mock-tts",
            "language": "en"
        }
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Voice synthesis failed: {str(e)}")

@app.get("/api/v1/quiz/subjects")
async def get_quiz_subjects():
    """Get available subjects for quizzes"""
    return {
        "subjects": [
            {
                "id": "physics",
                "name": "Physics",
                "name_bn": "পদার্থবিজ্ঞান",
                "icon": "⚛️",
                "color": "#3B82F6",
                "grade_range": [6, 12]
            },
            {
                "id": "chemistry", 
                "name": "Chemistry",
                "name_bn": "রসায়ন",
                "icon": "🧪",
                "color": "#10B981",
                "grade_range": [8, 12]
            },
            {
                "id": "mathematics",
                "name": "Mathematics", 
                "name_bn": "গণিত",
                "icon": "📐",
                "color": "#F59E0B",
                "grade_range": [6, 12]
            },
            {
                "id": "biology",
                "name": "Biology",
                "name_bn": "জীববিজ্ঞান", 
                "icon": "🧬",
                "color": "#EF4444",
                "grade_range": [6, 12]
            },
            {
                "id": "bangla",
                "name": "Bangla",
                "name_bn": "বাংলা",
                "icon": "📚",
                "color": "#8B5CF6",
                "grade_range": [6, 12]
            },
            {
                "id": "english",
                "name": "English", 
                "name_bn": "ইংরেজি",
                "icon": "🔤",
                "color": "#06B6D4",
                "grade_range": [6, 12]
            }
        ]
    }

if __name__ == "__main__":
    print("🎓 ShikkhaSathi - AI-Powered Learning Platform")
    print("🔧 Development Mode - Using SQLite and Mock Services")
    print("=" * 50)
    
    uvicorn.run(
        "run_dev:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )