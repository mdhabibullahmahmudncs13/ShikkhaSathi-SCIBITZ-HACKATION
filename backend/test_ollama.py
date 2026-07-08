#!/usr/bin/env python3
"""
Test script to verify Ollama integration works
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from services.rag.ai_tutor_service import ai_tutor_service

async def test_ollama_chat():
    """Test basic chat functionality with Ollama"""
    print("Testing Ollama integration...")
    
    try:
        # Test basic chat
        response = await ai_tutor_service.chat(
            message="What is force in physics?",
            subject="Physics",
            grade=9
        )
        
        print("✅ Chat test successful!")
        print(f"Response: {response['response'][:200]}...")
        print(f"Model: {response['model']}")
        print(f"Context used: {response['context_used']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Chat test failed: {str(e)}")
        return False

async def test_concept_explanation():
    """Test concept explanation functionality"""
    print("\nTesting concept explanation...")
    
    try:
        response = await ai_tutor_service.explain_concept(
            concept="Newton's First Law",
            subject="Physics",
            grade=9,
            difficulty_level="basic"
        )
        
        print("✅ Concept explanation test successful!")
        print(f"Explanation: {response['explanation'][:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Concept explanation test failed: {str(e)}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Ollama integration tests...\n")
    
    # Test if Ollama is running
    try:
        import ollama
        models = ollama.list()
        print(f"📋 Available Ollama models: {[m['name'] for m in models['models']]}")
    except Exception as e:
        print(f"⚠️  Warning: Could not connect to Ollama: {str(e)}")
        print("Make sure Ollama is running: ollama serve")
    
    # Run tests
    tests = [
        test_ollama_chat,
        test_concept_explanation
    ]
    
    results = []
    for test in tests:
        result = await test()
        results.append(result)
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Ollama integration is working.")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)