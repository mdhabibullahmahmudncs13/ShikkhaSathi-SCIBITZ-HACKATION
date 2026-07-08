#!/usr/bin/env python3
"""
Simple test for Whisper loading
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

async def test_whisper_direct():
    """Test Whisper loading directly"""
    try:
        import whisper
        print("🔧 Loading Whisper model directly...")
        model = whisper.load_model("base")
        print(f"✅ Model loaded: {type(model)}")
        return True
    except Exception as e:
        print(f"❌ Direct loading failed: {e}")
        return False

async def test_whisper_service():
    """Test Whisper service"""
    try:
        from services.local_whisper_service import local_whisper_service
        print("🔧 Testing Whisper service...")
        
        # Get model info
        info = await local_whisper_service.get_model_info()
        print(f"📋 Model info: {info}")
        
        # Try to load model
        loaded = await local_whisper_service.load_model()
        print(f"📥 Model loaded: {loaded}")
        
        return loaded
        
    except Exception as e:
        print(f"❌ Service test failed: {e}")
        return False

async def main():
    print("🚀 Testing Whisper Loading...")
    
    # Test direct loading
    direct_result = await test_whisper_direct()
    print()
    
    # Test service loading
    service_result = await test_whisper_service()
    print()
    
    if direct_result and service_result:
        print("🎉 All tests passed!")
        return True
    else:
        print("❌ Some tests failed")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)