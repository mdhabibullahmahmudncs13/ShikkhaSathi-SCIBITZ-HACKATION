#!/usr/bin/env python3
"""
Test script to verify local voice services integration
"""

import asyncio
import sys
import os
import tempfile
import numpy as np
import soundfile as sf

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from services.local_whisper_service import local_whisper_service
from services.local_tts_service import local_tts_service
from services.voice_service import voice_service

async def test_local_whisper():
    """Test local Whisper service"""
    print("🎤 Testing Local Whisper Service...")
    
    try:
        # Get model info
        model_info = await local_whisper_service.get_model_info()
        print(f"📋 Whisper Model Info: {model_info}")
        
        # Test transcription
        test_result = await local_whisper_service.test_transcription()
        print(f"🧪 Whisper Test Result: {test_result}")
        
        return test_result.get('test_passed', False)
        
    except Exception as e:
        print(f"❌ Local Whisper test failed: {str(e)}")
        return False

async def test_local_tts():
    """Test local TTS service"""
    print("\n🔊 Testing Local TTS Service...")
    
    try:
        # Get service info
        service_info = await local_tts_service.get_service_info()
        print(f"📋 TTS Service Info: {service_info}")
        
        # Test synthesis
        test_result = await local_tts_service.test_synthesis()
        print(f"🧪 TTS Test Result: {test_result}")
        
        return test_result.get('test_passed', False)
        
    except Exception as e:
        print(f"❌ Local TTS test failed: {str(e)}")
        return False

async def test_voice_service_integration():
    """Test integrated voice service"""
    print("\n🎯 Testing Voice Service Integration...")
    
    try:
        # Get service status
        status = await voice_service.get_service_status()
        print(f"📊 Voice Service Status: {status}")
        
        # Test voice pipeline
        pipeline_test = await voice_service.test_voice_pipeline()
        print(f"🔄 Voice Pipeline Test: {pipeline_test}")
        
        return pipeline_test.get('test_passed', False)
        
    except Exception as e:
        print(f"❌ Voice service integration test failed: {str(e)}")
        return False

async def test_speech_to_text_with_sample():
    """Test speech-to-text with a sample audio file"""
    print("\n🎙️ Testing Speech-to-Text with Sample Audio...")
    
    try:
        # Create a sample audio file with some noise (simulating speech)
        sample_rate = 16000
        duration = 2.0  # 2 seconds
        samples = int(sample_rate * duration)
        
        # Generate some random noise as a placeholder for speech
        audio_data = np.random.normal(0, 0.1, samples).astype(np.float32)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            sf.write(temp_file.name, audio_data, sample_rate)
            temp_path = temp_file.name
        
        try:
            # Test transcription
            result = await voice_service.speech_to_text(temp_path, 'auto')
            print(f"📝 Transcription Result: {result}")
            
            # Clean up
            os.unlink(temp_path)
            
            return result.get('success', False)
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            raise e
            
    except Exception as e:
        print(f"❌ Speech-to-text test failed: {str(e)}")
        return False

async def test_text_to_speech_samples():
    """Test text-to-speech with sample texts"""
    print("\n🗣️ Testing Text-to-Speech with Sample Texts...")
    
    try:
        test_texts = {
            'en': 'Hello, this is a test of the local text to speech system.',
            'bn': 'নমস্কার, এটি স্থানীয় টেক্সট টু স্পিচ সিস্টেমের একটি পরীক্ষা।'
        }
        
        results = {}
        
        for lang, text in test_texts.items():
            print(f"  Testing {lang}: {text[:50]}...")
            result = await voice_service.text_to_speech(text, lang)
            results[lang] = result
            print(f"  Result: {result.get('success', False)} - {result.get('message', 'OK')}")
        
        return all(r.get('success', False) for r in results.values())
        
    except Exception as e:
        print(f"❌ Text-to-speech test failed: {str(e)}")
        return False

async def main():
    """Run all local voice service tests"""
    print("🚀 Starting Local Voice Services Tests...\n")
    
    tests = [
        ("Local Whisper Service", test_local_whisper),
        ("Local TTS Service", test_local_tts),
        ("Voice Service Integration", test_voice_service_integration),
        ("Speech-to-Text Sample", test_speech_to_text_with_sample),
        ("Text-to-Speech Samples", test_text_to_speech_samples)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"Running {test_name} test...")
        try:
            result = await test_func()
            results.append(result)
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{status}: {test_name}")
        except Exception as e:
            print(f"❌ ERROR in {test_name}: {str(e)}")
            results.append(False)
        print()
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All local voice service tests passed!")
        print("✅ Local voice services are ready for ShikkhaSathi.")
    elif passed > 0:
        print("⚠️ Some tests passed, some failed.")
        print("💡 Check the error messages above for issues.")
        print("🔧 You may need to install additional dependencies:")
        print("   pip install openai-whisper torch torchaudio TTS")
    else:
        print("❌ All tests failed.")
        print("💡 Make sure you have installed the required dependencies:")
        print("   pip install openai-whisper torch torchaudio TTS pydub soundfile")
    
    print("\n📚 Next Steps:")
    print("1. Install missing dependencies if any tests failed")
    print("2. Test with real audio files for better validation")
    print("3. Configure voice models for Bengali language support")
    print("4. Integrate with frontend voice components")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)