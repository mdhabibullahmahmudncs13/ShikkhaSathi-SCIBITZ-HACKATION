"""
Local Whisper Service for ShikkhaSathi
Handles speech-to-text using local OpenAI Whisper models
"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional
from pathlib import Path
import tempfile
import torch
import whisper
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class LocalWhisperService:
    """Service for local speech-to-text using Whisper"""
    
    def __init__(self, model_size: str = "base", device: str = "auto"):
        """
        Initialize Local Whisper service
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
            device: Device to run on (auto, cpu, cuda)
        """
        self.model_size = model_size
        self.device = self._get_device(device)
        self.model = None
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Supported languages
        self.supported_languages = {
            'bn': 'Bengali',
            'en': 'English',
            'auto': 'Auto-detect'
        }
        
        logger.info(f"Initializing Local Whisper service with model: {model_size}, device: {self.device}")
    
    def _get_device(self, device: str) -> str:
        """Determine the best device to use"""
        if device == "auto":
            if torch.cuda.is_available():
                return "cuda"
            else:
                return "cpu"
        return device
    
    async def load_model(self) -> bool:
        """Load the Whisper model asynchronously"""
        try:
            if self.model is None:
                logger.info(f"Loading Whisper model: {self.model_size}")
                
                # Load model in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                self.model = await loop.run_in_executor(
                    self.executor,
                    self._load_model_sync
                )
                
                if self.model is not None:
                    logger.info(f"Whisper model loaded successfully on {self.device}")
                    return True
                else:
                    logger.error("Failed to load Whisper model - model is None")
                    return False
            else:
                return True  # Already loaded
                
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            return False
    
    def _load_model_sync(self):
        """Synchronous model loading for thread pool execution"""
        try:
            import whisper
            logger.info(f"Loading Whisper model {self.model_size} on device {self.device}")
            model = whisper.load_model(self.model_size, device=self.device)
            logger.info(f"Model loaded successfully: {type(model)}")
            return model
        except Exception as e:
            logger.error(f"Sync model loading error: {str(e)}")
            return None
    
    async def transcribe_audio(
        self, 
        audio_file_path: str, 
        language: str = 'auto'
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using local Whisper
        
        Args:
            audio_file_path: Path to the audio file
            language: Language code ('bn', 'en', or 'auto')
            
        Returns:
            Dict with transcription results
        """
        try:
            # Ensure model is loaded
            if not await self.load_model():
                return {
                    'success': False,
                    'error': 'Failed to load Whisper model'
                }
            
            # Validate audio file
            if not os.path.exists(audio_file_path):
                return {
                    'success': False,
                    'error': f'Audio file not found: {audio_file_path}'
                }
            
            # Prepare transcription options
            options = {
                'fp16': False,  # Use fp32 for better compatibility
                'language': None if language == 'auto' else language,
                'task': 'transcribe'
            }
            
            logger.info(f"Transcribing audio: {audio_file_path} with language: {language}")
            
            # Run transcription in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._transcribe_sync,
                audio_file_path,
                options
            )
            
            # Process results
            if result:
                detected_language = result.get('language', 'en')
                text = result.get('text', '').strip()
                
                # Map Whisper language codes to our codes
                lang_mapping = {
                    'bengali': 'bn',
                    'bn': 'bn',
                    'english': 'en',
                    'en': 'en'
                }
                
                mapped_language = lang_mapping.get(detected_language.lower(), detected_language)
                
                return {
                    'success': True,
                    'text': text,
                    'language': mapped_language,
                    'confidence': 1.0,  # Whisper doesn't provide confidence scores
                    'model': f'whisper-{self.model_size}',
                    'processing_time': result.get('processing_time', 0)
                }
            else:
                return {
                    'success': False,
                    'error': 'Transcription failed - no result returned'
                }
                
        except Exception as e:
            logger.error(f"Error in local transcription: {str(e)}")
            return {
                'success': False,
                'error': f'Local transcription error: {str(e)}'
            }
    
    def _transcribe_sync(self, audio_path: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous transcription method for thread pool execution"""
        try:
            import time
            start_time = time.time()
            
            # Perform transcription
            result = self.model.transcribe(audio_path, **options)
            
            processing_time = time.time() - start_time
            
            return {
                'text': result['text'],
                'language': result['language'],
                'processing_time': processing_time
            }
            
        except Exception as e:
            logger.error(f"Sync transcription error: {str(e)}")
            return None
    
    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        try:
            await self.load_model()
            
            return {
                'model_size': self.model_size,
                'device': self.device,
                'supported_languages': self.supported_languages,
                'model_loaded': self.model is not None,
                'cuda_available': torch.cuda.is_available(),
                'torch_version': torch.__version__
            }
            
        except Exception as e:
            logger.error(f"Error getting model info: {str(e)}")
            return {
                'error': str(e),
                'model_loaded': False
            }
    
    async def test_transcription(self) -> Dict[str, Any]:
        """Test transcription with a simple audio file"""
        try:
            # Create a temporary silent audio file for testing
            import numpy as np
            import soundfile as sf
            
            # Generate 1 second of silence
            sample_rate = 16000
            duration = 1.0
            samples = int(sample_rate * duration)
            audio_data = np.zeros(samples, dtype=np.float32)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                sf.write(temp_file.name, audio_data, sample_rate)
                temp_path = temp_file.name
            
            try:
                # Test transcription
                result = await self.transcribe_audio(temp_path, 'auto')
                
                # Clean up
                os.unlink(temp_path)
                
                return {
                    'test_passed': result['success'],
                    'result': result
                }
                
            except Exception as e:
                # Clean up on error
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                raise e
                
        except Exception as e:
            logger.error(f"Test transcription failed: {str(e)}")
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
            
            # Clear model from memory
            if self.model:
                del self.model
                self.model = None
                
            # Clear CUDA cache if using GPU
            if self.device == "cuda" and torch.cuda.is_available():
                torch.cuda.empty_cache()
                
            logger.info("Local Whisper service cleaned up")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

# Global service instance
local_whisper_service = LocalWhisperService()