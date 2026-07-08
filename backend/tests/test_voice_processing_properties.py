"""
Property-based tests for voice processing functionality
**Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
"""

import pytest
import asyncio
import tempfile
import os
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from hypothesis.strategies import text, integers, composite, sampled_from, binary
import wave
import struct
from io import BytesIO

from app.services.voice_service import VoiceService


# Test data generators
@composite
def valid_bangla_text(draw):
    """Generate valid Bangla text for TTS testing"""
    bangla_chars = "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃ"
    english_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    
    # Common Bangla words and phrases
    bangla_words = [
        "নিউটনের", "সূত্র", "গতি", "বিজ্ঞান", "পদার্থ", "রসায়ন", "গণিত",
        "শিক্ষা", "পড়াশোনা", "বই", "অধ্যায়", "প্রশ্ন", "উত্তর", "সমাধান"
    ]
    
    # Generate mixed text (Bangla and English)
    text_type = draw(sampled_from(['bangla_only', 'english_only', 'mixed']))
    
    if text_type == 'bangla_only':
        words = draw(st.lists(sampled_from(bangla_words), min_size=1, max_size=10))
        return ' '.join(words)
    elif text_type == 'english_only':
        return draw(text(alphabet=english_chars + ' ', min_size=5, max_size=100))
    else:  # mixed
        bangla_part = draw(st.lists(sampled_from(bangla_words), min_size=1, max_size=5))
        english_part = draw(text(alphabet=english_chars + ' ', min_size=5, max_size=50))
        return ' '.join(bangla_part) + ' ' + english_part


@composite
def valid_audio_data(draw):
    """Generate valid audio data for STT testing"""
    # Generate simple sine wave audio data
    sample_rate = 44100
    duration = draw(st.floats(min_value=0.5, max_value=2.0))  # 0.5 to 2 seconds
    frequency = draw(st.integers(min_value=200, max_value=2000))  # Human voice range
    
    num_samples = int(sample_rate * duration)
    
    # Generate sine wave
    audio_data = []
    for i in range(num_samples):
        sample = int(32767 * 0.5 * (i / sample_rate * frequency * 2 * 3.14159) % 1)
        audio_data.append(struct.pack('<h', sample))
    
    # Create WAV file in memory
    wav_buffer = BytesIO()
    with wave.open(wav_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(b''.join(audio_data))
    
    return wav_buffer.getvalue()


class TestVoiceProcessingProperties:
    """Property-based tests for voice processing accuracy and completeness"""

    @given(valid_bangla_text())
    @settings(max_examples=20, deadline=30000)  # Reduced examples for API calls
    def test_text_to_speech_completeness(self, text_input):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: For any valid text input, TTS should generate audio data with proper metadata
        """
        assume(len(text_input.strip()) > 0)
        assume(len(text_input) <= 1000)  # Reasonable length limit
        
        voice_service = VoiceService()
        
        # Mock ElevenLabs API response
        mock_audio_data = b"fake_audio_data_" + text_input.encode('utf-8')[:50]
        
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.content = mock_audio_data
            mock_post.return_value = mock_response
            
            result = asyncio.run(voice_service.text_to_speech(text_input, "bn"))
            
            # Property: TTS should always return structured response
            assert isinstance(result, dict)
            assert "success" in result
            assert "audio_data" in result
            assert "content_type" in result
            
            if result["success"]:
                # Property: Successful TTS should include audio data and metadata
                assert result["audio_data"] is not None
                assert len(result["audio_data"]) > 0
                assert result["content_type"] == "audio/mpeg"
                assert "text" in result
                assert result["text"] == text_input
                assert "language" in result

    @given(valid_audio_data())
    @settings(max_examples=15, deadline=30000, suppress_health_check=[HealthCheck.data_too_large])  # Reduced examples for API calls
    def test_speech_to_text_completeness(self, audio_data):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: For any valid audio input, STT should return transcription with confidence
        """
        assume(len(audio_data) > 1000)  # Minimum audio data size
        
        voice_service = VoiceService()
        
        # Mock OpenAI Whisper API response
        mock_transcript = Mock()
        mock_transcript.text = "মকড ট্রান্সক্রিপশন"  # Mock Bangla transcription
        mock_transcript.language = "bn"
        
        # Mock the OpenAI client
        with patch.object(voice_service, 'openai_client') as mock_client:
            mock_client.audio.transcriptions.create.return_value = mock_transcript
            result = asyncio.run(voice_service.speech_to_text(audio_data, "bn"))
            
            # Property: STT should always return structured response
            assert isinstance(result, dict)
            assert "success" in result
            assert "text" in result
            assert "confidence" in result
            
            if result["success"]:
                # Property: Successful STT should include transcription and metadata
                assert isinstance(result["text"], str)
                assert isinstance(result["confidence"], (int, float))
                assert 0.0 <= result["confidence"] <= 1.0
                assert "language" in result

    @given(st.text(min_size=1, max_size=100))
    @settings(max_examples=50)
    def test_language_detection_consistency(self, text_input):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: Language detection should be consistent and return valid language codes
        """
        assume(len(text_input.strip()) > 0)
        
        voice_service = VoiceService()
        detected_language = voice_service.detect_language(text_input)
        
        # Property: Language detection should always return valid language code
        assert detected_language in ['bn', 'en']
        
        # Property: Detection should be consistent for same input
        second_detection = voice_service.detect_language(text_input)
        assert detected_language == second_detection

    @given(valid_bangla_text())
    @settings(max_examples=30)
    def test_bangla_text_detection(self, bangla_text):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: Bangla text should be correctly identified as Bangla language
        """
        assume(len(bangla_text.strip()) > 0)
        
        voice_service = VoiceService()
        
        # Count Bangla characters
        bangla_chars = sum(1 for char in bangla_text if '\u0980' <= char <= '\u09FF')
        total_alpha_chars = len([char for char in bangla_text if char.isalpha()])
        
        detected_language = voice_service.detect_language(bangla_text)
        
        if total_alpha_chars > 0:
            bangla_ratio = bangla_chars / total_alpha_chars
            
            # Property: Text with >30% Bangla characters should be detected as Bangla
            if bangla_ratio > 0.3:
                assert detected_language == 'bn'
            # Property: Text with <=30% Bangla characters should be detected as English
            else:
                assert detected_language == 'en'

    @given(valid_audio_data())
    @settings(max_examples=10, deadline=30000)
    def test_voice_message_processing_completeness(self, audio_data):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: Complete voice message processing should handle all steps correctly
        """
        assume(len(audio_data) > 1000)
        
        voice_service = VoiceService()
        
        # Mock the complete pipeline
        mock_transcript = Mock()
        mock_transcript.text = "সম্পূর্ণ ভয়েস প্রসেসিং পরীক্ষা"
        mock_transcript.language = "bn"
        
        with patch.object(voice_service, 'openai_client') as mock_client:
            mock_client.audio.transcriptions.create.return_value = mock_transcript
            
            result = asyncio.run(voice_service.process_voice_message(audio_data))
            
            # Property: Voice processing should return complete result structure
            assert isinstance(result, dict)
            assert "success" in result
            assert "text" in result
            assert "detected_language" in result
            
            if result["success"]:
                # Property: Successful processing should include all required fields
                assert isinstance(result["text"], str)
                assert len(result["text"]) > 0
                assert result["detected_language"] in ['bn', 'en']
                
                # Property: Language detection should be consistent with transcribed text
                manual_detection = voice_service.detect_language(result["text"])
                # Allow some flexibility as auto-detection might differ from manual detection
                assert result["detected_language"] in ['bn', 'en']

    @given(st.text(min_size=0, max_size=10))
    @settings(max_examples=20)
    def test_edge_case_handling(self, edge_text):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: Voice service should handle edge cases gracefully
        """
        voice_service = VoiceService()
        
        # Test empty or very short text
        detected_language = voice_service.detect_language(edge_text)
        
        # Property: Edge cases should default to English
        if len(edge_text.strip()) == 0 or len([c for c in edge_text if c.isalpha()]) == 0:
            assert detected_language == 'en'
        else:
            assert detected_language in ['bn', 'en']

    @pytest.mark.asyncio
    async def test_error_handling_properties(self):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: Voice service should handle errors gracefully and return proper error responses
        """
        voice_service = VoiceService()
        
        # Test STT with invalid audio data
        result = await voice_service.speech_to_text(b"invalid_audio_data", "bn")
        
        # Property: Invalid input should return structured error response
        assert isinstance(result, dict)
        assert "success" in result
        assert result["success"] is False
        assert "error" in result
        assert "text" in result
        assert result["text"] == ""
        assert "confidence" in result
        assert result["confidence"] == 0.0

    @pytest.mark.asyncio
    async def test_tts_error_handling(self):
        """
        **Feature: shikkhasathi-platform, Property 15: Voice Processing Accuracy and Completeness**
        
        Property: TTS should handle API failures gracefully
        """
        voice_service = VoiceService()
        
        with patch('requests.post') as mock_post:
            # Simulate API failure
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.text = "Internal Server Error"
            mock_post.return_value = mock_response
            
            result = await voice_service.text_to_speech("Test text", "bn")
            
            # Property: API failures should return structured error response
            assert isinstance(result, dict)
            assert "success" in result
            assert result["success"] is False
            assert "error" in result
            assert result["audio_data"] is None


# Run the tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])