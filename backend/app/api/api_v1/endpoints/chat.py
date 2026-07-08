import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from app.services.websocket_manager import manager
from app.services.rag.multi_model_ai_tutor_service import multi_model_ai_tutor_service
from app.core.deps import get_current_user
from app.models.user import User
from app.db.mongodb import get_mongodb
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for request/response
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    subject: Optional[str] = None
    model_category: str = "general"  # Default to 'general' if not provided
    ai_mode: str = "tutor"  # Default to 'tutor' mode if not provided

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []
    context_used: bool = False
    model: str = "llama3.2:1b"
    category: str = "general"
    specialized: bool = True
    user_selected: bool = True

class ConceptExplanationRequest(BaseModel):
    concept: str
    subject: str
    difficulty_level: str = "basic"
    model_category: str  # Required: 'bangla', 'math', or 'general'

class ConceptExplanationResponse(BaseModel):
    explanation: str
    concept: str
    subject: str
    grade: int
    difficulty_level: str
    sources: List[str] = []
    model: str
    category: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai_tutor(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
) -> ChatResponse:
    """
    Chat with AI tutor using user-selected model
    - User must select model category before asking questions
    - Bangla: Uses specialized model for Bengali language and literature
    - Math: Uses Phi-3-mini model for mathematical precision
    - General: Uses general model for Physics, Chemistry, Biology, English
    """
    try:
        logger.info(f"Chat request from user {current_user.id} (Grade {current_user.grade}) using {request.model_category} model: {request.message[:100]}...")
        
        # Call multi-model AI tutor service with user-selected model and mode
        result = await multi_model_ai_tutor_service.chat(
            message=request.message,
            conversation_history=request.conversation_history,
            subject=request.subject,
            grade=current_user.grade,
            model_category=request.model_category,
            ai_mode=request.ai_mode
        )
        
        # Store conversation in MongoDB
        try:
            db = get_mongodb()
            chat_collection = db.chat_history
            
            # Create or update chat session
            session_id = f"user_{current_user.id}_session"
            
            # Add user message and AI response to history
            current_time = datetime.utcnow().isoformat() + "Z"
            new_messages = [
                {
                    "role": "user",
                    "content": request.message,
                    "timestamp": current_time,
                    "subject": request.subject,
                    "model_category": request.model_category,
                    "ai_mode": request.ai_mode
                },
                {
                    "role": "assistant", 
                    "content": result["response"],
                    "timestamp": current_time,
                    "sources": result.get("sources", []),
                    "model": result.get("model", "unknown"),
                    "category": result.get("category", "general"),
                    "specialized": result.get("specialized", False),
                    "user_selected": result.get("user_selected", True)
                }
            ]
            
            await chat_collection.update_one(
                {"user_id": str(current_user.id), "session_id": session_id},
                {
                    "$push": {"messages": {"$each": new_messages}},
                    "$set": {"updated_at": current_time},
                    "$setOnInsert": {"created_at": current_time}
                },
                upsert=True
            )
        except Exception as e:
            logger.warning(f"Failed to store chat history: {e}")
            # Don't fail the request if chat storage fails
        
        return ChatResponse(
            response=result["response"],
            sources=result.get("sources", []),
            context_used=result.get("context_used", False),
            model=result.get("model", "unknown"),
            category=result.get("category", "general"),
            specialized=result.get("specialized", False),
            user_selected=result.get("user_selected", True)
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="I'm sorry, I'm having trouble processing your question right now. Please try again in a moment."
        )

@router.post("/explain", response_model=ConceptExplanationResponse)
async def explain_concept(
    request: ConceptExplanationRequest,
    current_user: User = Depends(get_current_user)
) -> ConceptExplanationResponse:
    """
    Get detailed explanation of a concept using specialized models
    - Automatically selects the best model based on subject
    - Provides structured explanations optimized for SSC preparation
    """
    try:
        logger.info(f"Concept explanation request from user {current_user.id}: {request.concept} in {request.subject}")
        
        # Call multi-model AI tutor service for concept explanation
        result = await multi_model_ai_tutor_service.explain_concept(
            concept=request.concept,
            subject=request.subject,
            grade=current_user.grade or 9,  # Default to grade 9 if not set
            difficulty_level=request.difficulty_level,
            model_category=request.model_category
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return ConceptExplanationResponse(
            explanation=result["explanation"],
            concept=result["concept"],
            subject=result["subject"],
            grade=result["grade"],
            difficulty_level=result["difficulty_level"],
            sources=result.get("sources", []),
            model=result.get("model", "unknown"),
            category=result.get("category", "general")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in concept explanation endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="I'm sorry, I couldn't generate an explanation right now. Please try again."
        )

@router.get("/models")
async def get_model_info(current_user: User = Depends(get_current_user)):
    """
    Get information about available specialized models
    Users must select a model category before asking questions
    """
    try:
        model_info = multi_model_ai_tutor_service.get_model_info()
        return {
            "models": model_info,
            "description": {
                "bangla": "Specialized for Bengali language, literature, and cultural context using BanglaBERT",
                "math": "Optimized for mathematical reasoning and step-by-step problem solving using phi3:mini",
                "general": "Covers Physics, Chemistry, Biology, and English with scientific accuracy using llama3.2:1b"
            },
            "selection_required": "Users must select a model category ('bangla', 'math', or 'general') before asking questions",
            "model_categories": ["bangla", "math", "general"]
        }
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model information")

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, token: str = Query(...)):
    """WebSocket endpoint for real-time chat communication"""
    try:
        # Verify user authentication using token
        # Note: In a real implementation, you'd validate the JWT token here
        # For now, we'll extract user_id from the token parameter
        user_id = token  # Simplified for demo - should be JWT validation
        
        await manager.connect(websocket, user_id, session_id)
        
        # Send connection confirmation
        await manager.send_personal_message({
            "type": "connection_status",
            "status": "connected",
            "session_id": session_id
        }, session_id)
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Process different message types
                message_type = message_data.get("type", "message")
                
                if message_type == "message":
                    await manager.process_user_message(message_data, user_id, session_id)
                elif message_type == "ping":
                    # Respond to ping with pong for connection health check
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": message_data.get("timestamp")
                    }, session_id)
                
        except WebSocketDisconnect:
            manager.disconnect(session_id, user_id)
            logger.info(f"WebSocket disconnected for user {user_id}")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
            manager.disconnect(session_id, user_id)
            
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=1008, reason="Authentication failed")

@router.get("/history/{session_id}")
async def get_chat_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100)
):
    """Get chat history for a specific session"""
    try:
        db = get_mongodb()
        chat_collection = db.chat_history
        
        session_doc = await chat_collection.find_one(
            {"user_id": str(current_user.id), "session_id": session_id}
        )
        
        if not session_doc:
            return {"messages": [], "session_id": session_id}
        
        messages = session_doc.get("messages", [])
        # Return last 'limit' messages
        recent_messages = messages[-limit:] if len(messages) > limit else messages
        
        return {
            "messages": recent_messages,
            "session_id": session_id,
            "total_messages": len(messages)
        }
        
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")

@router.get("/sessions")
async def get_user_sessions(current_user: User = Depends(get_current_user)):
    """Get all chat sessions for the current user"""
    try:
        db = get_mongodb()
        chat_collection = db.chat_history
        
        sessions = await chat_collection.find(
            {"user_id": str(current_user.id)},
            {"session_id": 1, "created_at": 1, "updated_at": 1, "messages": {"$slice": -1}}
        ).to_list(length=100)
        
        # Format sessions with last message preview
        formatted_sessions = []
        for session in sessions:
            last_message = session.get("messages", [{}])[-1] if session.get("messages") else {}
            formatted_sessions.append({
                "session_id": session["session_id"],
                "created_at": session.get("created_at"),
                "updated_at": session.get("updated_at"),
                "last_message_preview": last_message.get("content", "")[:100] if last_message else "",
                "last_message_timestamp": last_message.get("timestamp") if last_message else None
            })
        
        return {"sessions": formatted_sessions}
        
    except Exception as e:
        logger.error(f"Error retrieving user sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")

@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a specific chat session"""
    try:
        db = get_mongodb()
        chat_collection = db.chat_history
        
        result = await chat_collection.delete_one({
            "user_id": str(current_user.id),
            "session_id": session_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

@router.post("/voice/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Transcribe audio to text using Whisper API"""
    try:
        # Validate file type
        if not audio.content_type or not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Invalid audio file format")
        
        # Read audio data
        audio_data = await audio.read()
        
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        # Process voice message
        result = await voice_service.process_voice_message(audio_data)
        
        if result["success"]:
            return {
                "text": result["text"],
                "language": result.get("detected_language", "en"),
                "confidence": result.get("confidence", 0.0)
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Transcription failed"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")

@router.post("/voice/synthesize")
async def synthesize_speech(
    text: str,
    language: str = "bn",
    current_user: User = Depends(get_current_user)
):
    """Convert text to speech using ElevenLabs API"""
    try:
        if not text or len(text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if len(text) > 5000:  # Limit text length
            raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
        
        # Generate speech
        result = await voice_service.text_to_speech(text, language)
        
        if result["success"] and result["audio_data"]:
            return Response(
                content=result["audio_data"],
                media_type=result["content_type"],
                headers={
                    "Content-Disposition": "attachment; filename=speech.mp3",
                    "X-Text-Length": str(len(text)),
                    "X-Language": language
                }
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Speech synthesis failed"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error synthesizing speech: {e}")
        raise HTTPException(status_code=500, detail="Failed to synthesize speech")