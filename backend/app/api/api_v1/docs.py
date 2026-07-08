from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from app.core.config import settings

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
async def api_documentation():
    """Generate API documentation page"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>ShikkhaSathi API Documentation</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ background: #2563eb; color: white; padding: 20px; border-radius: 8px; }}
            .endpoint {{ margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }}
            .method {{ display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; }}
            .get {{ background: #10b981; }}
            .post {{ background: #3b82f6; }}
            .put {{ background: #f59e0b; }}
            .delete {{ background: #ef4444; }}
            .description {{ margin: 10px 0; color: #6b7280; }}
            .parameters {{ margin: 10px 0; }}
            .parameter {{ margin: 5px 0; padding: 5px; background: #f9fafb; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>ShikkhaSathi API Documentation</h1>
            <p>AI-powered adaptive learning platform for Bangladesh students</p>
            <p>Version: 1.0.0 | Base URL: {settings.API_V1_STR}</p>
        </div>

        <h2>Authentication Endpoints</h2>
        
        <div class="endpoint">
            <span class="method post">POST</span> <strong>/auth/login</strong>
            <div class="description">Authenticate user and get access token</div>
            <div class="parameters">
                <div class="parameter"><strong>email</strong> (string): User email address</div>
                <div class="parameter"><strong>password</strong> (string): User password</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span> <strong>/auth/register</strong>
            <div class="description">Register new user account</div>
            <div class="parameters">
                <div class="parameter"><strong>email</strong> (string): User email address</div>
                <div class="parameter"><strong>password</strong> (string): User password</div>
                <div class="parameter"><strong>full_name</strong> (string): User full name</div>
                <div class="parameter"><strong>grade</strong> (integer): Grade level (6-12)</div>
                <div class="parameter"><strong>medium</strong> (string): Language medium (bangla/english)</div>
                <div class="parameter"><strong>role</strong> (string): User role (student/teacher/parent)</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span> <strong>/auth/refresh</strong>
            <div class="description">Refresh access token</div>
            <div class="parameters">
                <div class="parameter"><strong>refresh_token</strong> (string): Valid refresh token</div>
            </div>
        </div>

        <h2>User Management</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <strong>/users/me</strong>
            <div class="description">Get current user profile</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method put">PUT</span> <strong>/users/me</strong>
            <div class="description">Update current user profile</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>full_name</strong> (string, optional): Updated full name</div>
                <div class="parameter"><strong>grade</strong> (integer, optional): Updated grade level</div>
            </div>
        </div>

        <h2>Dashboard & Progress</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <strong>/progress/dashboard</strong>
            <div class="description">Get comprehensive dashboard data for student</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span> <strong>/progress/analytics</strong>
            <div class="description">Get detailed analytics for student progress</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
            </div>
        </div>

        <h2>Quiz System</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <strong>/quiz/list</strong>
            <div class="description">Get available quizzes</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>subject</strong> (string, optional): Filter by subject</div>
                <div class="parameter"><strong>difficulty</strong> (integer, optional): Filter by difficulty level</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span> <strong>/quiz/{{quiz_id}}</strong>
            <div class="description">Get specific quiz details</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>quiz_id</strong> (path): Quiz identifier</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span> <strong>/quiz/{{quiz_id}}/submit</strong>
            <div class="description">Submit quiz answers</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>quiz_id</strong> (path): Quiz identifier</div>
                <div class="parameter"><strong>answers</strong> (array): Array of answer objects</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span> <strong>/quiz/generate</strong>
            <div class="description">Generate new quiz using AI</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>subject</strong> (string): Subject name</div>
                <div class="parameter"><strong>topic</strong> (string): Topic name</div>
                <div class="parameter"><strong>difficulty_level</strong> (integer): Difficulty level (1-5)</div>
                <div class="parameter"><strong>bloom_level</strong> (integer): Bloom's taxonomy level (1-6)</div>
                <div class="parameter"><strong>question_count</strong> (integer): Number of questions</div>
            </div>
        </div>

        <h2>Chat & AI Tutor</h2>
        
        <div class="endpoint">
            <span class="method post">POST</span> <strong>/chat/message</strong>
            <div class="description">Send message to AI tutor</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>message</strong> (string): User message</div>
                <div class="parameter"><strong>session_id</strong> (string, optional): Chat session ID</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span> <strong>/chat/history/{{session_id}}</strong>
            <div class="description">Get chat history for session</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>session_id</strong> (path): Chat session ID</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span> <strong>/chat/voice</strong>
            <div class="description">Process voice input</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>audio</strong> (file): Audio file (WAV/MP3)</div>
            </div>
        </div>

        <h2>Gamification</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <strong>/gamification/status</strong>
            <div class="description">Get user gamification status</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span> <strong>/gamification/leaderboard</strong>
            <div class="description">Get leaderboard data</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
                <div class="parameter"><strong>type</strong> (string, optional): Leaderboard type (global/class/friends)</div>
                <div class="parameter"><strong>timeframe</strong> (string, optional): Time period (weekly/monthly/all-time)</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span> <strong>/gamification/achievements</strong>
            <div class="description">Get user achievements</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required</div>
            </div>
        </div>

        <h2>Teacher Dashboard</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <strong>/teacher/class-overview</strong>
            <div class="description">Get class overview for teacher</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required (teacher role)</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span> <strong>/teacher/student/{{student_id}}/analytics</strong>
            <div class="description">Get analytics for specific student</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required (teacher role)</div>
                <div class="parameter"><strong>student_id</strong> (path): Student identifier</div>
            </div>
        </div>

        <h2>Parent Portal</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span> <strong>/parent/child/{{child_id}}/progress</strong>
            <div class="description">Get child progress for parent</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required (parent role)</div>
                <div class="parameter"><strong>child_id</strong> (path): Child identifier</div>
            </div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span> <strong>/parent/child/{{child_id}}/report</strong>
            <div class="description">Get weekly report for child</div>
            <div class="parameters">
                <div class="parameter"><strong>Authorization</strong> (header): Bearer token required (parent role)</div>
                <div class="parameter"><strong>child_id</strong> (path): Child identifier</div>
                <div class="parameter"><strong>week_start</strong> (query): Week start date (YYYY-MM-DD)</div>
            </div>
        </div>

        <h2>Error Responses</h2>
        
        <div class="endpoint">
            <strong>400 Bad Request</strong>
            <div class="description">Invalid request parameters or data</div>
        </div>

        <div class="endpoint">
            <strong>401 Unauthorized</strong>
            <div class="description">Missing or invalid authentication token</div>
        </div>

        <div class="endpoint">
            <strong>403 Forbidden</strong>
            <div class="description">Insufficient permissions for requested resource</div>
        </div>

        <div class="endpoint">
            <strong>404 Not Found</strong>
            <div class="description">Requested resource not found</div>
        </div>

        <div class="endpoint">
            <strong>422 Validation Error</strong>
            <div class="description">Request data validation failed</div>
        </div>

        <div class="endpoint">
            <strong>500 Internal Server Error</strong>
            <div class="description">Server error occurred</div>
        </div>

        <h2>Rate Limiting</h2>
        <p>API requests are rate limited to prevent abuse:</p>
        <ul>
            <li>Authentication endpoints: 5 requests per minute</li>
            <li>Chat endpoints: 30 requests per minute</li>
            <li>Quiz generation: 10 requests per minute</li>
            <li>Other endpoints: 100 requests per minute</li>
        </ul>

        <h2>WebSocket Endpoints</h2>
        <p>Real-time communication is available through WebSocket connections:</p>
        <ul>
            <li><strong>ws://localhost:8000/ws/chat</strong> - Real-time chat with AI tutor</li>
            <li><strong>ws://localhost:8000/ws/notifications</strong> - Real-time notifications</li>
        </ul>

        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
            <p>ShikkhaSathi API v1.0.0 - Built with FastAPI</p>
            <p>For support, contact: support@shikkhasathi.com</p>
        </footer>
    </body>
    </html>
    """
    
    return html_content

@router.get("/openapi.json")
async def get_openapi_schema():
    """Get OpenAPI schema in JSON format"""
    from app.main import app
    return app.openapi()

@router.get("/postman")
async def get_postman_collection():
    """Generate Postman collection for API testing"""
    
    collection = {
        "info": {
            "name": "ShikkhaSathi API",
            "description": "AI-powered adaptive learning platform API",
            "version": "1.0.0",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "auth": {
            "type": "bearer",
            "bearer": [
                {
                    "key": "token",
                    "value": "{{access_token}}",
                    "type": "string"
                }
            ]
        },
        "variable": [
            {
                "key": "base_url",
                "value": "http://localhost:8000/api/v1",
                "type": "string"
            },
            {
                "key": "access_token",
                "value": "",
                "type": "string"
            }
        ],
        "item": [
            {
                "name": "Authentication",
                "item": [
                    {
                        "name": "Login",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": '{\n  "email": "student@example.com",\n  "password": "password123"\n}'
                            },
                            "url": {
                                "raw": "{{base_url}}/auth/login",
                                "host": ["{{base_url}}"],
                                "path": ["auth", "login"]
                            }
                        }
                    },
                    {
                        "name": "Register",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": '{\n  "email": "newstudent@example.com",\n  "password": "password123",\n  "full_name": "New Student",\n  "grade": 9,\n  "medium": "bangla",\n  "role": "student"\n}'
                            },
                            "url": {
                                "raw": "{{base_url}}/auth/register",
                                "host": ["{{base_url}}"],
                                "path": ["auth", "register"]
                            }
                        }
                    }
                ]
            },
            {
                "name": "Dashboard",
                "item": [
                    {
                        "name": "Get Dashboard Data",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/progress/dashboard",
                                "host": ["{{base_url}}"],
                                "path": ["progress", "dashboard"]
                            }
                        }
                    },
                    {
                        "name": "Get Analytics",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/progress/analytics",
                                "host": ["{{base_url}}"],
                                "path": ["progress", "analytics"]
                            }
                        }
                    }
                ]
            },
            {
                "name": "Quiz",
                "item": [
                    {
                        "name": "Get Quiz List",
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {
                                "raw": "{{base_url}}/quiz/list?subject=Math&difficulty=3",
                                "host": ["{{base_url}}"],
                                "path": ["quiz", "list"],
                                "query": [
                                    {
                                        "key": "subject",
                                        "value": "Math"
                                    },
                                    {
                                        "key": "difficulty",
                                        "value": "3"
                                    }
                                ]
                            }
                        }
                    },
                    {
                        "name": "Generate Quiz",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": '{\n  "subject": "Math",\n  "topic": "Algebra",\n  "difficulty_level": 3,\n  "bloom_level": 2,\n  "question_count": 10\n}'
                            },
                            "url": {
                                "raw": "{{base_url}}/quiz/generate",
                                "host": ["{{base_url}}"],
                                "path": ["quiz", "generate"]
                            }
                        }
                    }
                ]
            },
            {
                "name": "Chat",
                "item": [
                    {
                        "name": "Send Message",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": '{\n  "message": "গণিতের বীজগণিত সম্পর্কে বলুন",\n  "session_id": "session_123"\n}'
                            },
                            "url": {
                                "raw": "{{base_url}}/chat/message",
                                "host": ["{{base_url}}"],
                                "path": ["chat", "message"]
                            }
                        }
                    }
                ]
            }
        ]
    }
    
    return collection