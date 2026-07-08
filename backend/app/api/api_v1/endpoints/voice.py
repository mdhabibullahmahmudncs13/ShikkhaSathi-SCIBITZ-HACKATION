"""
Voice API endpoints for speech-to-text and text-to-speech functionality
"""

import os
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core import deps
from app.models.user import User
from app.services.voice_service import voice_service

router = APIRouter()

# Pydantic models for request/response
class TranscriptionRequest(BaseModel):
    language: str = "auto"  # 'bn', 'en', or 'auto'

class TranscriptionResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    language: Optional[str] = None
    confidence: Optional[float] = None
    error: Optional[str] = None

class TextToSpeechRequest(BaseModel):
    text: str
    language: str = "en"  # 'bn' or 'en'
    voice_id: Optional[str] = None

class TextToSpeechResponse(BaseModel):
    success: bool
    audio_id: Optional[str] = None
    audio_url: Optional[str] = None
    text: Optional[str] = None
    language: Optional[str] = None
    voice_id: Optional[str] = None
    fallback: Optional[bool] = False
    message: Optional[str] = None
    error: Optional[str] = None

class VoiceCapabilitiesResponse(BaseModel):
    supported_languages: dict
    available_voices: dict
    features: list

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: str = Form("auto"),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Convert uploaded audio file to text using Whisper API
    """
    try:
        # Validate file type
        if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an audio file"
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            # Read and save uploaded file
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process with voice service
            result = await voice_service.speech_to_text(temp_file_path, language)
            
            return TranscriptionResponse(
                success=result['success'],
                text=result.get('text'),
                language=result.get('language'),
                confidence=result.get('confidence'),
                error=result.get('error')
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing audio: {str(e)}"
        )

@router.post("/synthesize", response_model=TextToSpeechResponse)
async def synthesize_speech(
    request: TextToSpeechRequest,
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Convert text to speech using ElevenLabs API
    """
    try:
        # Validate input
        if not request.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text cannot be empty"
            )
        
        if len(request.text) > 5000:  # Reasonable limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text too long (max 5000 characters)"
            )
        
        # Process with voice service
        result = await voice_service.text_to_speech(
            text=request.text,
            language=request.language,
            voice_id=request.voice_id
        )
        
        return TextToSpeechResponse(
            success=result['success'],
            audio_id=result.get('audio_id'),
            audio_url=result.get('audio_url'),
            text=result.get('text'),
            language=result.get('language'),
            voice_id=result.get('voice_id'),
            fallback=result.get('fallback', False),
            message=result.get('message'),
            error=result.get('error')
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error synthesizing speech: {str(e)}"
        )

@router.get("/audio/{audio_id}")
async def get_audio_file(
    audio_id: str,
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Download generated audio file by ID
    """
    try:
        audio_path = await voice_service.get_audio_file(audio_id)
        
        if not audio_path or not os.path.exists(audio_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio file not found"
            )
        
        return FileResponse(
            path=audio_path,
            media_type='audio/mpeg',
            filename=f"audio_{audio_id}.mp3"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving audio file: {str(e)}"
        )

@router.get("/capabilities", response_model=VoiceCapabilitiesResponse)
async def get_voice_capabilities(
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get information about voice service capabilities
    """
    try:
        return VoiceCapabilitiesResponse(
            supported_languages=voice_service.get_supported_languages(),
            available_voices=voice_service.get_available_voices(),
            features=[
                "speech_to_text",
                "text_to_speech",
                "bengali_support",
                "english_support",
                "auto_language_detection"
            ]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting capabilities: {str(e)}"
        )

# Test endpoints (no authentication required for development)
@router.post("/test-synthesize", response_model=TextToSpeechResponse)
async def test_synthesize_speech(request: TextToSpeechRequest):
    """
    Test text-to-speech without authentication (development only)
    """
    try:
        result = await voice_service.text_to_speech(
            text=request.text,
            language=request.language,
            voice_id=request.voice_id
        )
        
        return TextToSpeechResponse(
            success=result['success'],
            audio_id=result.get('audio_id'),
            audio_url=result.get('audio_url'),
            text=result.get('text'),
            language=result.get('language'),
            voice_id=result.get('voice_id'),
            fallback=result.get('fallback', False),
            message=result.get('message'),
            error=result.get('error')
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error synthesizing speech: {str(e)}"
        )

@router.get("/test-audio/{audio_id}")
async def test_get_audio_file(audio_id: str):
    """
    Test audio file download without authentication (development only)
    """
    try:
        audio_path = await voice_service.get_audio_file(audio_id)
        
        if not audio_path or not os.path.exists(audio_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio file not found"
            )
        
        return FileResponse(
            path=audio_path,
            media_type='audio/mpeg',
            filename=f"audio_{audio_id}.mp3"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving audio file: {str(e)}"
        )

@router.delete("/cleanup")
async def cleanup_old_audio_files(
    max_age_hours: int = 24,
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Clean up old audio files (admin only)
    """
    try:
        await voice_service.cleanup_old_audio_files(max_age_hours)
        return {"message": f"Cleaned up audio files older than {max_age_hours} hours"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cleaning up files: {str(e)}"
        )