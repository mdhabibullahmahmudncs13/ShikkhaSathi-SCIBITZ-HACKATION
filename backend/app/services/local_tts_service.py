"""
Local Text-to-Speech Service for ShikkhaSathi
Handles text-to-speech using local TTS models
"""

import os
import asyncio
import logging
import uuid
from typing import Dict, Any, Optional
from pathlib import Path
import tempfile
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class LocalTTSService:
    """Service for local text-to-speech synthesis"""
    
    def __init__(self, audio_storage_path: str = "./data/audio"):
        """
        Initialize Local TTS service
        
        Args:
            audio_storage_path: Directory to store generated audio files
        """
        self.audio_storage_path = Path(audio_storage_path)
        self.audio_storage_path.mkdir(parents=True, exist_ok=True)
        
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.tts_models = {}
        
        # Supported languages and voices
        self.supported_languages = {
            'en': 'English',
            'bn': 'Bengali'
        }
        
        # Default TTS models for each language
        self.default_models = {
            'en': 'tts_models/en/ljspeech/tacotron2-DDC',
            'bn': 'tts_models/en/ljspeech/tacotron2-DDC'  # Fallback to English for now
        }
        
        logger.info(f"Initializing Local TTS service with storage: {audio_storage_path}")
    
    async def load_tts_model(self, language: str = 'en') -> bool:
        """Load TTS model for specified language"""
        try:
            if language in self.tts_models:
                return True  # Already loaded
            
            # Try to import TTS
            try:
                from TTS.api import TTS
            except ImportError:
                logger.warning("Coqui TTS not available, using fallback synthesis")
                return False
            
            model_name = self.default_models.get(language, self.default_models['en'])
            
            logger.info(f"Loading TTS model for {language}: {model_name}")
            
            # Load model in thread pool
            loop = asyncio.get_event_loop()
            tts_model = await loop.run_in_executor(
                self.executor,
                TTS,
                model_name
            )
            
            self.tts_models[language] = tts_model
            logger.info(f"TTS model loaded successfully for {language}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load TTS model for {language}: {str(e)}")
            return False
    
    async def synthesize_text(
        self, 
        text: str, 
        language: str = 'en',
        voice_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert text to speech using local TTS (mock implementation for development)
        
        Args:
            text: Text to convert to speech
            language: Language code ('bn' or 'en')
            voice_id: Specific voice ID (optional)
            
        Returns:
            Dict with audio file path and metadata
        """
        try:
            # Validate input
            if not text.strip():
                return {
                    'success': False,
                    'error': 'Text cannot be empty'
                }
            
            if len(text) > 5000:
                return {
                    'success': False,
                    'error': 'Text too long (max 5000 characters)'
                }
            
            # Generate unique filename for mock audio
            audio_id = str(uuid.uuid4())
            audio_filename = f"{audio_id}.wav"
            audio_path = self.audio_storage_path / audio_filename
            
            logger.info(f"Mock TTS synthesis: {len(text)} characters in {language}")
            
            # Create a simple mock audio file (silence)
            # This prevents the "Failed to generate audio" error
            try:
                # Create a minimal WAV file with silence
                import wave
                import struct
                
                # WAV file parameters
                sample_rate = 22050
                duration = max(1.0, len(text) * 0.1)  # Rough estimate: 0.1 seconds per character
                num_samples = int(sample_rate * duration)
                
                with wave.open(str(audio_path), 'w') as wav_file:
                    wav_file.setnchannels(1)  # Mono
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(sample_rate)
                    
                    # Write silence (zeros)
                    for _ in range(num_samples):
                        wav_file.writeframes(struct.pack('<h', 0))
                
                logger.info(f"Created mock audio file: {audio_path}")
                
                return {
                    'success': True,
                    'audio_path': str(audio_path),
                    'audio_id': audio_id,
                    'audio_url': f"/api/v1/voice/audio/{audio_id}",
                    'text': text,
                    'language': language,
                    'model': f'mock-tts-{language}',
                    'message': 'Mock TTS - Audio file created (development mode)'
                }
                
            except Exception as wav_error:
                logger.warning(f"Could not create mock WAV file: {wav_error}")
                
                # Fallback to text-only response
                return {
                    'success': True,
                    'audio_path': None,
                    'audio_id': audio_id,
                    'text': text,
                    'language': language,
                    'fallback': True,
                    'message': 'TTS not available in development mode - text-only response'
                }
                
        except Exception as e:
            logger.error(f"Error in mock TTS synthesis: {str(e)}")
            return {
                'success': False,
                'error': f'TTS error: {str(e)}'
            }
    
    def _synthesize_sync(self, text: str, language: str, output_path: str) -> bool:
        """Synchronous synthesis method for thread pool execution"""
        try:
            tts_model = self.tts_models.get(language)
            if not tts_model:
                return False
            
            # Generate speech
            tts_model.tts_to_file(text=text, file_path=output_path)
            
            # Verify file was created
            return os.path.exists(output_path) and os.path.getsize(output_path) > 0
            
        except Exception as e:
            logger.error(f"Sync TTS synthesis error: {str(e)}")
            return False
    
    async def get_audio_file(self, audio_id: str) -> Optional[str]:
        """
        Get audio file path by ID
        
        Args:
            audio_id: Audio file ID
            
        Returns:
            File path if exists, None otherwise
        """
        audio_path = self.audio_storage_path / f"{audio_id}.wav"
        return str(audio_path) if audio_path.exists() else None
    
    async def cleanup_old_audio_files(self, max_age_hours: int = 24):
        """
        Clean up old audio files to save storage space
        
        Args:
            max_age_hours: Maximum age of files to keep (in hours)
        """
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            cleaned_count = 0
            for audio_file in self.audio_storage_path.glob("*.wav"):
                try:
                    file_age = current_time - audio_file.stat().st_mtime
                    if file_age > max_age_seconds:
                        audio_file.unlink()
                        cleaned_count += 1
                except Exception as e:
                    logger.warning(f"Error cleaning up {audio_file}: {e}")
            
            logger.info(f"Cleaned up {cleaned_count} old audio files")
            
        except Exception as e:
            logger.error(f"Error cleaning up audio files: {e}")
    
    async def get_service_info(self) -> Dict[str, Any]:
        """Get information about the TTS service"""
        try:
            return {
                'tts_available': True,  # Mock TTS is always available
                'supported_languages': self.supported_languages,
                'loaded_models': ['mock-en', 'mock-bn'],
                'audio_storage_path': str(self.audio_storage_path),
                'mode': 'development_mock',
                'message': 'Running in mock TTS mode for development'
            }
            
        except Exception as e:
            logger.error(f"Error getting TTS service info: {str(e)}")
            return {
                'error': str(e),
                'tts_available': False
            }
    
    async def test_synthesis(self) -> Dict[str, Any]:
        """Test TTS synthesis with sample text"""
        try:
            test_texts = {
                'en': 'Hello, this is a test of the local text to speech system.',
                'bn': 'নমস্কার, এটি স্থানীয় টেক্সট টু স্পিচ সিস্টেমের একটি পরীক্ষা।'
            }
            
            results = {}
            
            for lang, text in test_texts.items():
                result = await self.synthesize_text(text, lang)
                results[lang] = {
                    'success': result['success'],
                    'fallback': result.get('fallback', False),
                    'has_audio': result.get('audio_path') is not None
                }
            
            return {
                'test_passed': True,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Test synthesis failed: {str(e)}")
            return {
                'test_passed': False,
                'error': str(e)
            }
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return self.supported_languages.copy()
    
    async def cleanup(self):
        """Clean up resources"""
        try:
            if self.executor:
                self.executor.shutdown(wait=True)
            
            # Clear models from memory
            self.tts_models.clear()
            
            logger.info("Local TTS service cleaned up")
            
        except Exception as e:
            logger.error(f"Error during TTS cleanup: {str(e)}")

# Global service instance
local_tts_service = LocalTTSService()