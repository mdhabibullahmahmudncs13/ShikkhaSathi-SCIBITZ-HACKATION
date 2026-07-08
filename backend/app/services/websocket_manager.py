import json
import asyncio
from typing import Dict, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.services.rag.rag_service import RAGService
from app.services.voice_service import voice_service
from app.db.mongodb import get_mongodb
from app.core.config import settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, str] = {}  # user_id -> session_id
        self._rag_service = None  # Lazy initialization
    
    def get_rag_service(self):
        """Lazy initialization of RAG service"""
        if self._rag_service is None:
            try:
                rag_config = RAGServiceConfig(
                    openai_api_key=settings.OPENAI_API_KEY,
                    pinecone_api_key=settings.PINECONE_API_KEY,
                    pinecone_environment=settings.PINECONE_ENVIRONMENT,
                    index_name=settings.PINECONE_INDEX_NAME
                )
                self._rag_service = RAGService(rag_config)
            except Exception as e:
                logger.error(f"Failed to initialize RAG service: {e}")
                # Return None if initialization fails (e.g., missing API keys)
                return None
        return self._rag_service

    async def connect(self, websocket: WebSocket, user_id: str, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.user_sessions[user_id] = session_id
        logger.info(f"User {user_id} connected with session {session_id}")

    def disconnect(self, session_id: str, user_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if user_id in self.user_sessions:
            del self.user_sessions[user_id]
        logger.info(f"User {user_id} disconnected from session {session_id}")

    async def send_personal_message(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to session {session_id}: {e}")
                # Remove disconnected connection
                if session_id in self.active_connections:
                    del self.active_connections[session_id]

    async def send_typing_indicator(self, session_id: str, is_typing: bool):
        message = {
            "type": "typing_indicator",
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(message, session_id)

    async def process_user_message(self, message_data: dict, user_id: str, session_id: str):
        """Process incoming user message and generate AI response"""
        try:
            # Send typing indicator
            await self.send_typing_indicator(session_id, True)

            # Extract message content
            user_message = message_data.get("content", "")
            message_id = message_data.get("id", "")
            is_voice = message_data.get("voice_input", False)

            # Save user message to database
            await self.save_message_to_db(user_id, session_id, {
                "id": message_id,
                "role": "user",
                "content": user_message,
                "timestamp": datetime.utcnow(),
                "voice_input": is_voice
            })

            # Send message delivery confirmation
            delivery_confirmation = {
                "type": "message_status",
                "message_id": message_id,
                "status": "delivered",
                "timestamp": datetime.utcnow().isoformat()
            }
            await self.send_personal_message(delivery_confirmation, session_id)

            # Get chat history for context
            chat_history = await self.get_chat_history(user_id, session_id, limit=3)
            
            # Generate AI response using RAG service
            rag_service = self.get_rag_service()
            if rag_service:
                ai_response = await rag_service.process_query(
                    query=user_message,
                    user_id=user_id,
                    chat_history=chat_history
                )
            else:
                # Fallback response if RAG service is not available
                ai_response = {
                    "response": "I apologize, but the AI service is currently unavailable. Please check your API configuration.",
                    "sources": []
                }

            # Create AI message
            ai_message = {
                "id": f"ai_{datetime.utcnow().timestamp()}",
                "role": "assistant",
                "content": ai_response.get("response", "I apologize, but I couldn't generate a response at this time."),
                "timestamp": datetime.utcnow(),
                "sources": ai_response.get("sources", [])
            }

            # Save AI message to database
            await self.save_message_to_db(user_id, session_id, ai_message)

            # Stop typing indicator
            await self.send_typing_indicator(session_id, False)

            # Send AI response
            response_message = {
                "type": "message",
                "message": {
                    **ai_message,
                    "timestamp": ai_message["timestamp"].isoformat()
                }
            }
            await self.send_personal_message(response_message, session_id)
            
            # If user sent voice message, also generate audio response
            if is_voice and ai_response.get("response"):
                try:
                    # Generate audio response
                    voice_service = get_voice_service()
                    tts_result = await voice_service.text_to_speech(
                        ai_response["response"], 
                        language="bn"  # Default to Bangla, could be detected from response
                    )
                    
                    if tts_result["success"] and tts_result["audio_data"]:
                        # Send audio response notification
                        audio_message = {
                            "type": "audio_response",
                            "message_id": ai_message["id"],
                            "has_audio": True,
                            "audio_length": len(tts_result["audio_data"]),
                            "content_type": tts_result["content_type"]
                        }
                        await self.send_personal_message(audio_message, session_id)
                        
                except Exception as audio_error:
                    logger.error(f"Error generating audio response: {audio_error}")
                    # Continue without audio - don't fail the whole response

        except Exception as e:
            logger.error(f"Error processing message for user {user_id}: {e}")
            # Stop typing indicator
            await self.send_typing_indicator(session_id, False)
            
            # Send error message
            error_message = {
                "type": "error",
                "message": "Sorry, I encountered an error processing your message. Please try again.",
                "timestamp": datetime.utcnow().isoformat()
            }
            await self.send_personal_message(error_message, session_id)

    async def save_message_to_db(self, user_id: str, session_id: str, message: dict):
        """Save message to MongoDB"""
        try:
            db = get_mongodb()
            chat_collection = db.chat_history
            
            # Convert datetime to ISO string for MongoDB
            message_copy = message.copy()
            if isinstance(message_copy.get("timestamp"), datetime):
                message_copy["timestamp"] = message_copy["timestamp"].isoformat()

            # Update or create chat session
            await chat_collection.update_one(
                {"user_id": user_id, "session_id": session_id},
                {
                    "$push": {"messages": message_copy},
                    "$set": {"updated_at": datetime.utcnow()},
                    "$setOnInsert": {"created_at": datetime.utcnow()}
                },
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error saving message to database: {e}")

    async def get_chat_history(self, user_id: str, session_id: str, limit: int = 10) -> List[dict]:
        """Get recent chat history for context"""
        try:
            db = get_mongodb()
            chat_collection = db.chat_history
            
            session_doc = await chat_collection.find_one(
                {"user_id": user_id, "session_id": session_id}
            )
            
            if session_doc and "messages" in session_doc:
                # Return last 'limit' messages
                messages = session_doc["messages"][-limit:] if len(session_doc["messages"]) > limit else session_doc["messages"]
                return messages
            
            return []
        except Exception as e:
            logger.error(f"Error retrieving chat history: {e}")
            return []

# Global connection manager instance
manager = ConnectionManager()