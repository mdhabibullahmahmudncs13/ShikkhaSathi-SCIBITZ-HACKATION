"""
Voice Learning Service for ShikkhaSathi
Handles speech-to-text and text-to-speech functionality using local models
"""

import os
import asyncio
import aiofiles
import aiohttp
from typing import Optional, Dict, Any
from pathlib import Path
import tempfile
import uuid
import logging
from app.core.config import settings

# Optional imports for voice services
try:
    from .local_whisper_service import local_whisper_service
    from .local_tts_service import local_tts_service
    VOICE_SERVICES_AVAILABLE = True
except ImportError:
    local_whisper_service = None
    local_tts_service = None
    VOICE_SERVICES_AVAILABLE = False

logger = logging.getLogger(__name__)

class VoiceService:
    """Service for handling voice input/output operations using local models"""
    
    def __init__(self):
        if not VOICE_SERVICES_AVAILABLE:
            logger.warning("Voice services dependencies not available. Voice features will be disabled.")
            self.local_whisper = None
            self.local_tts = None
            return
            
        # Keep API keys for fallback (optional)
        self.whisper_api_key = getattr(settings, 'OPENAI_API_KEY', None)
        self.elevenlabs_api_key = getattr(settings, 'ELEVENLABS_API_KEY', None)
        
        # Local services
        self.local_whisper = local_whisper_service
        self.local_tts = local_tts_service
        
        # Configuration
        self.use_local_services = getattr(settings, 'USE_LOCAL_VOICE_SERVICES', True)
        self.fallback_to_api = getattr(settings, 'VOICE_API_FALLBACK', False)
        
        self.audio_storage_path = Path("data/audio")
        self.audio_storage_path.mkdir(parents=True, exist_ok=True)
        
        # Supported languages
        self.supported_languages = {
            'bn': 'Bengali',
            'en': 'English'
        }
        
        logger.info(f"Voice service initialized - Local: {self.use_local_services}, Fallback: {self.fallback_to_api}")
    
    async def speech_to_text(
        self, 
        audio_file_path: str, 
        language: str = 'auto'
    ) -> Dict[str, Any]:
        """
        Convert speech to text using local Whisper or API fallback
        
        Args:
            audio_file_path: Path to the audio file
            language: Language code ('bn', 'en', or 'auto' for detection)
            
        Returns:
            Dict with transcribed text and detected language
        """
        try:
            # Try local Whisper first
            if self.use_local_services:
                logger.info(f"Using local Whisper for transcription: {audio_file_path}")
                result = await self.local_whisper.transcribe_audio(audio_file_path, language)
                
                if result['success']:
                    return {
                        'success': True,
                        'text': result['text'],
                        'language': result['language'],
                        'confidence': result.get('confidence', 1.0),
                        'method': 'local_whisper',
                        'model': result.get('model', 'whisper-local')
                    }
                else:
                    logger.warning(f"Local Whisper failed: {result.get('error')}")
                    if not self.fallback_to_api:
                        return result
            
            # Fallback to OpenAI API if enabled and available
            if self.fallback_to_api and self.whisper_api_key:
                logger.info("Falling back to OpenAI Whisper API")
                return await self._speech_to_text_api(audio_file_path, language)
            
            # No API fallback available
            return {
                'success': False,
                'error': 'Local speech-to-text failed and no API fallback available'
            }
            
        except Exception as e:
            logger.error(f"Speech-to-text error: {str(e)}")
            return {
                'success': False,
                'error': f"Speech-to-text error: {str(e)}"
            }
    
    async def _speech_to_text_api(
        self, 
        audio_file_path: str, 
        language: str = 'auto'
    ) -> Dict[str, Any]:
        """
        Convert speech to text using OpenAI Whisper API (fallback)
        """
        try:
            if not self.whisper_api_key:
                raise ValueError("OpenAI API key not configured")
            
            # Read audio file
            async with aiofiles.open(audio_file_path, 'rb') as audio_file:
                audio_data = await audio_file.read()
            
            # Prepare request to Whisper API
            url = "https://api.openai.com/v1/audio/transcriptions"
            headers = {
                "Authorization": f"Bearer {self.whisper_api_key}"
            }
            
            # Create form data
            data = aiohttp.FormData()
            data.add_field('file', audio_data, filename='audio.wav', content_type='audio/wav')
            data.add_field('model', 'whisper-1')
            
            if language != 'auto' and language in self.supported_languages:
                # Map our language codes to Whisper language codes
                whisper_lang = 'bn' if language == 'bn' else 'en'
                data.add_field('language', whisper_lang)
            
            data.add_field('response_format', 'json')
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Detect language if not specified
                        detected_language = self._detect_language(result.get('text', ''))
                        
                        return {
                            'success': True,
                            'text': result.get('text', ''),
                            'language': detected_language,
                            'confidence': 1.0,  # Whisper doesn't provide confidence scores
                            'method': 'openai_api'
                        }
                    else:
                        error_text = await response.text()
                        return {
                            'success': False,
                            'error': f"Whisper API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {
                'success': False,
                'error': f"API speech-to-text error: {str(e)}"
            }
    
    async def text_to_speech(
        self, 
        text: str, 
        language: str = 'en',
        voice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert text to speech using local TTS or API fallback
        
        Args:
            text: Text to convert to speech
            language: Language code ('bn' or 'en')
            voice_id: Specific voice ID (optional)
            
        Returns:
            Dict with audio file path and metadata
        """
        try:
            # Try local TTS first
            if self.use_local_services:
                logger.info(f"Using local TTS for synthesis: {len(text)} chars in {language}")
                result = await self.local_tts.synthesize_text(text, language, voice_id)
                
                if result['success']:
                    return result
                else:
                    logger.warning(f"Local TTS failed: {result.get('error')}")
                    if not self.fallback_to_api:
                        return result
            
            # Fallback to ElevenLabs API if enabled and available
            if self.fallback_to_api and self.elevenlabs_api_key:
                logger.info("Falling back to ElevenLabs API")
                return await self._text_to_speech_api(text, language, voice_id)
            
            # No API fallback available - return text-only response
            return {
                'success': True,
                'audio_path': None,
                'text': text,
                'language': language,
                'fallback': True,
                'message': 'Local TTS not available and no API fallback configured'
            }
            
        except Exception as e:
            logger.error(f"Text-to-speech error: {str(e)}")
            return {
                'success': False,
                'error': f"Text-to-speech error: {str(e)}"
            }
    
    async def _text_to_speech_api(
        self, 
        text: str, 
        language: str = 'en',
        voice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert text to speech using ElevenLabs API (fallback)
        """
        try:
            if not self.elevenlabs_api_key:
                return {
                    'success': True,
                    'audio_path': None,
                    'text': text,
                    'language': language,
                    'fallback': True,
                    'message': 'ElevenLabs API not configured, text-only response'
                }
            
            # ElevenLabs voice IDs (you'll need to get these from ElevenLabs)
            voice_ids = {
                'en': 'EXAVITQu4vr4xnSDxMaL',  # Default English voice
                'bn': 'EXAVITQu4vr4xnSDxMaL'   # For now, use same voice (can be changed)
            }
            
            # Select voice
            selected_voice_id = voice_id or voice_ids.get(language, voice_ids['en'])
            
            # Prepare request to ElevenLabs API
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{selected_voice_id}"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_api_key
            }
            
            payload = {
                "text": text,
                "model_id": "eleven_multilingual_v2",  # Supports multiple languages
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        # Generate unique filename
                        audio_id = str(uuid.uuid4())
                        audio_filename = f"{audio_id}.mp3"
                        audio_path = self.audio_storage_path / audio_filename
                        
                        # Save audio file
                        audio_data = await response.read()
                        async with aiofiles.open(audio_path, 'wb') as audio_file:
                            await audio_file.write(audio_data)
                        
                        return {
                            'success': True,
                            'audio_path': str(audio_path),
                            'audio_id': audio_id,
                            'audio_url': f"/api/v1/voice/audio/{audio_id}",
                            'text': text,
                            'language': language,
                            'voice_id': selected_voice_id,
                            'method': 'elevenlabs_api'
                        }
                    else:
                        error_text = await response.text()
                        return {
                            'success': False,
                            'error': f"ElevenLabs API error: {response.status} - {error_text}"
                        }
                        
        except Exception as e:
            return {
                'success': False,
                'error': f"API text-to-speech error: {str(e)}"
            }
    
    def _detect_language(self, text: str) -> str:
        """
        Simple language detection based on character patterns
        
        Args:
            text: Text to analyze
            
        Returns:
            Language code ('bn' or 'en')
        """
        if not text:
            return 'en'
        
        # Count Bengali characters (Unicode range for Bengali)
        bengali_chars = sum(1 for char in text if '\u0980' <= char <= '\u09FF')
        total_chars = len([char for char in text if char.isalpha()])
        
        if total_chars == 0:
            return 'en'
        
        # If more than 30% Bengali characters, consider it Bengali
        bengali_ratio = bengali_chars / total_chars
        return 'bn' if bengali_ratio > 0.3 else 'en'
    
    async def get_audio_file(self, audio_id: str) -> Optional[str]:
        """
        Get audio file path by ID
        
        Args:
            audio_id: Audio file ID
            
        Returns:
            File path if exists, None otherwise
        """
        # Try local TTS storage first
        local_path = await self.local_tts.get_audio_file(audio_id)
        if local_path:
            return local_path
        
        # Fallback to legacy storage
        audio_path = self.audio_storage_path / f"{audio_id}.mp3"
        return str(audio_path) if audio_path.exists() else None
    
    async def cleanup_old_audio_files(self, max_age_hours: int = 24):
        """
        Clean up old audio files to save storage space
        
        Args:
            max_age_hours: Maximum age of files to keep (in hours)
        """
        try:
            # Clean up local TTS files
            await self.local_tts.cleanup_old_audio_files(max_age_hours)
            
            # Clean up legacy files
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for audio_file in self.audio_storage_path.glob("*.mp3"):
                file_age = current_time - audio_file.stat().st_mtime
                if file_age > max_age_seconds:
                    audio_file.unlink()
                    
        except Exception as e:
            logger.error(f"Error cleaning up audio files: {e}")
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return self.supported_languages.copy()
    
    def get_available_voices(self) -> Dict[str, str]:
        """Get list of available voice IDs"""
        return {
            'local_en': 'Local English TTS',
            'local_bn': 'Local Bengali TTS'
        }
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive status of voice services"""
        try:
            # Get local service status
            whisper_info = await self.local_whisper.get_model_info()
            tts_info = await self.local_tts.get_service_info()
            
            return {
                'local_services_enabled': self.use_local_services,
                'api_fallback_enabled': self.fallback_to_api,
                'whisper_status': {
                    'available': whisper_info.get('model_loaded', False),
                    'model_size': whisper_info.get('model_size'),
                    'device': whisper_info.get('device'),
                    'cuda_available': whisper_info.get('cuda_available', False)
                },
                'tts_status': {
                    'available': tts_info.get('tts_available', False),
                    'loaded_models': tts_info.get('loaded_models', []),
                    'supported_languages': tts_info.get('supported_languages', {})
                },
                'api_status': {
                    'openai_configured': bool(self.whisper_api_key),
                    'elevenlabs_configured': bool(self.elevenlabs_api_key)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting service status: {str(e)}")
            return {
                'error': str(e),
                'local_services_enabled': self.use_local_services
            }
    
    async def test_voice_pipeline(self) -> Dict[str, Any]:
        """Test the complete voice pipeline"""
        try:
            results = {}
            
            # Test local Whisper
            if self.use_local_services:
                whisper_test = await self.local_whisper.test_transcription()
                results['whisper_test'] = whisper_test
                
                # Test local TTS
                tts_test = await self.local_tts.test_synthesis()
                results['tts_test'] = tts_test
            
            return {
                'test_passed': True,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Voice pipeline test failed: {str(e)}")
            return {
                'test_passed': False,
                'error': str(e)
            }

# Global service instance
voice_service = VoiceService()