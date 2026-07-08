#!/usr/bin/env python3
"""
Simple test to verify Ollama is working
"""

import asyncio
import sys

async def test_ollama_direct():
    """Test Ollama directly using the ollama package"""
    try:
        import ollama
        
        print("🔍 Testing Ollama connection...")
        
        # List available models
        models = ollama.list()
        print(f"📋 Available models: {[m['name'] for m in models['models']]}")
        
        # Test a simple chat
        print("\n💬 Testing chat functionality...")
        response = ollama.chat(model='llama2', messages=[
            {
                'role': 'user',
                'content': 'What is force in physics? Give a brief answer for a grade 9 student.',
            },
        ])
        
        print("✅ Ollama chat test successful!")
        print(f"Response: {response['message']['content'][:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Ollama test failed: {str(e)}")
        print("Make sure Ollama is running: ollama serve")
        return False

async def test_langchain_ollama():
    """Test LangChain Ollama integration"""
    try:
        from langchain_ollama import ChatOllama
        
        print("\n🔗 Testing LangChain Ollama integration...")
        
        llm = ChatOllama(model="llama2", temperature=0.7)
        
        # Test with a simple message
        from langchain_core.messages import HumanMessage
        
        message = HumanMessage(content="Explain Newton's first law in simple terms for a student.")
        response = await llm.ainvoke([message])
        
        print("✅ LangChain Ollama test successful!")
        print(f"Response: {response.content[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ LangChain Ollama test failed: {str(e)}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Ollama tests...\n")
    
    tests = [
        ("Direct Ollama", test_ollama_direct),
        ("LangChain Ollama", test_langchain_ollama)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"Running {test_name} test...")
        result = await test_func()
        results.append(result)
        print()
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Ollama is ready for ShikkhaSathi.")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
        print("💡 Make sure Ollama is running: ollama serve")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)