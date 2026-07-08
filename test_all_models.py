#!/usr/bin/env python3
"""Test all Ollama models for ShikkhaSathi multi-model setup"""

import asyncio
import sys
sys.path.insert(0, 'backend')

try:
    from langchain_ollama import ChatOllama
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("❌ LangChain not available")
    sys.exit(1)

async def test_model(model_name: str, purpose: str, test_query: str):
    """Test a specific Ollama model"""
    print(f"\n{'='*60}")
    print(f"Testing: {model_name}")
    print(f"Purpose: {purpose}")
    print(f"{'='*60}")
    
    try:
        model = ChatOllama(model=model_name, temperature=0.7)
        
        print(f"📤 Query: {test_query}")
        response = await model.ainvoke(test_query)
        
        print(f"✅ Response received ({len(response.content)} chars)")
        print(f"📝 Preview: {response.content[:200]}...")
        
        return True
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

async def main():
    print("\n" + "="*60)
    print("TESTING ALL OLLAMA MODELS FOR SHIKKHASATHI")
    print("="*60)
    
    models = [
        {
            "name": "llama3.2:1b",
            "purpose": "General subjects (Science, English)",
            "query": "Explain photosynthesis in simple terms."
        },
        {
            "name": "llama3.2:3b",
            "purpose": "Bangla language and literature",
            "query": "বাংলা ব্যাকরণে সন্ধি কি? সংক্ষেপে ব্যাখ্যা করুন।"
        },
        {
            "name": "phi3:mini",
            "purpose": "Mathematics (high precision)",
            "query": "Solve: If x + 5 = 12, what is x? Show steps."
        }
    ]
    
    results = {}
    
    for model_info in models:
        success = await test_model(
            model_info["name"],
            model_info["purpose"],
            model_info["query"]
        )
        results[model_info["name"]] = success
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    all_passed = all(results.values())
    
    for model_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {model_name}")
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL MODELS WORKING CORRECTLY!")
    else:
        print("⚠️  Some models failed. Check errors above.")
    print("="*60 + "\n")
    
    return all_passed

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
