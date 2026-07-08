from fastapi import APIRouter
from app.api.api_v1.endpoints import auth, users, chat, quiz, progress, gamification, teacher, assessment, parent, voice, messages, announcements, reports, classroom, gradebook, notifications, parent_child, learning_content, admin, admin_content, code_connections
from app.api.api_v1 import docs

api_router = APIRouter()

# Health check endpoint (supports both GET and HEAD)
@api_router.get("/health", tags=["health"])
@api_router.head("/health", tags=["health"])
async def health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "service": "ShikkhaSathi API",
        "version": "1.0.0"
    }

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(voice.router, prefix="/voice", tags=["voice"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["gamification"])
api_router.include_router(learning_content.router, prefix="/learning", tags=["learning"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_content.router, prefix="/admin", tags=["admin-content"])
api_router.include_router(teacher.router, prefix="/teacher", tags=["teacher"])
api_router.include_router(assessment.router, prefix="/assessment", tags=["assessment"])
api_router.include_router(parent.router, prefix="/parent", tags=["parent"])
api_router.include_router(parent_child.router, prefix="/parent-child", tags=["parent-child"])
api_router.include_router(code_connections.router, prefix="/connect", tags=["code-connections"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(announcements.router, prefix="/announcements", tags=["announcements"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(classroom.router, prefix="/teacher", tags=["classroom"])
api_router.include_router(gradebook.router, prefix="/teacher", tags=["gradebook"])
api_router.include_router(docs.router, prefix="/docs", tags=["documentation"])