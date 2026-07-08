#!/usr/bin/env python3
"""
Test script to check all LLM model connections for ShikkhaSathi
Tests: Ollama models, OpenAI API, and RAG system
"""

import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

async def test_ollama_connection():
    """Test Ollama server connection"""
    print("\n" + "="*60)
    print("TESTING OLLAMA CONNECTION")
    print("="*60)
    
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags", timeout=5.0)
            if response.status_code == 200:
                models = response.json().get("models", [])
                print("✅ Ollama server is running")
                print(f"📦 Available models: {len(models)}")
                for model in models:
                    print(f"   - {model['name']}")
                return True, models
            else:
                print("❌ Ollama server responded with error")
                return False, []
    except Exception as e:
        print(f"❌ Ollama server not accessible: {e}")
        print("💡 Start Ollama with: ollama serve")
        return False, []

async def test_ollama_models():
    """Test specific Ollama models needed for ShikkhaSathi"""
    print("\n" + "="*60)
    print("TESTING REQUIRED OLLAMA MODELS")
    print("="*60)
    
    required_models = {
        "llama3.2:1b": "General subjects (Science, English)",
        "llama3.2:3b": "Bangla language (fallback)",
        "phi3:mini": "Mathematics"
    }
    
    results = {}
    
    try:
        from langchain_ollama import ChatOllama
        
        for model_name, purpose in required_models.items():
            print(f"\n🔍 Testing {model_name} ({purpose})...")
            try:
                model = ChatOllama(model=model_name, temperature=0.7)
                response = await model.ainvoke("Hello, respond with 'OK' if you can understand this.")
                print(f"✅ {model_name} is working")
                print(f"   Response: {response.content[:100]}...")
                results[model_name] = True
            except Exception as e:
                print(f"❌ {model_name} failed: {e}")
                print(f"💡 Install with: ollama pull {model_name}")
                results[model_name] = False
                
    except ImportError as e:
        print(f"❌ LangChain Ollama not installed: {e}")
        print("💡 Install with: pip install langchain-ollama")
        return {}
    
    return results

async def test_openai_connection():
    """Test OpenAI API connection"""
    print("\n" + "="*60)
    print("TESTING OPENAI API CONNECTION")
    print("="*60)
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        print("💡 Set it in .env file or export OPENAI_API_KEY=your-key")
        return False
    
    if api_key == "your-openai-api-key-here":
        print("❌ OPENAI_API_KEY is still the placeholder value")
        print("💡 Replace with your actual OpenAI API key")
        return False
    
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=api_key)
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'OK' if you can read this."}],
            max_tokens=10
        )
        
        print("✅ OpenAI API is working")
        print(f"   Response: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f"❌ OpenAI API failed: {e}")
        return False

async def test_chromadb():
    """Test ChromaDB vector database"""
    print("\n" + "="*60)
    print("TESTING CHROMADB VECTOR DATABASE")
    print("="*60)
    
    try:
        import chromadb
        from chromadb.config import Settings
        
        # Test ChromaDB
        client = chromadb.PersistentClient(path="./data/chroma_db_test")
        
        # Create test collection
        collection = client.get_or_create_collection(name="test_collection")
        
        # Add test document
        collection.add(
            documents=["This is a test document about mathematics"],
            metadatas=[{"subject": "math"}],
            ids=["test1"]
        )
        
        # Query test
        results = collection.query(
            query_texts=["mathematics"],
            n_results=1
        )
        
        print("✅ ChromaDB is working")
        print(f"   Test query returned: {len(results['documents'][0])} results")
        
        # Cleanup
        client.delete_collection(name="test_collection")
        
        return True
        
    except Exception as e:
        print(f"❌ ChromaDB failed: {e}")
        print("💡 Install with: pip install chromadb")
        return False

async def test_rag_service():
    """Test RAG service integration"""
    print("\n" + "="*60)
    print("TESTING RAG SERVICE")
    print("="*60)
    
    try:
        from app.services.rag.rag_service import get_rag_service
        
        rag_service = get_rag_service()
        
        if rag_service:
            print("✅ RAG service initialized")
            
            # Test context retrieval
            context = await rag_service.get_context_for_query(
                "What is photosynthesis?",
                "Science"
            )
            
            print(f"   Context retrieved: {len(context)} characters")
            if context and context != "No relevant context found in the curriculum documents.":
                print("✅ RAG context retrieval working")
            else:
                print("⚠️  No context found (database may be empty)")
                print("💡 Ingest curriculum documents to populate RAG database")
            
            return True
        else:
            print("❌ RAG service failed to initialize")
            return False
            
    except Exception as e:
        print(f"❌ RAG service failed: {e}")
        return False

async def test_multi_model_service():
    """Test multi-model AI tutor service"""
    print("\n" + "="*60)
    print("TESTING MULTI-MODEL AI TUTOR SERVICE")
    print("="*60)
    
    try:
        from app.services.rag.multi_model_ai_tutor_service import MultiModelAITutorService
        
        service = MultiModelAITutorService()
        
        print("✅ Multi-model service initialized")
        print(f"   Available models: {list(service.models.keys())}")
        
        # Test each model category
        test_queries = {
            "math": "What is 2+2?",
            "general": "What is photosynthesis?",
            "bangla": "বাংলা ব্যাকরণ কি?"
        }
        
        for category, query in test_queries.items():
            print(f"\n🔍 Testing {category} model...")
            try:
                result = await service.chat(
                    message=query,
                    model_category=category,
                    ai_mode="tutor"
                )
                
                if result.get("response"):
                    print(f"✅ {category} model responded")
                    print(f"   Response preview: {result['response'][:100]}...")
                else:
                    print(f"❌ {category} model failed to respond")
                    
            except Exception as e:
                print(f"❌ {category} model error: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Multi-model service failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("SHIKKHASATHI LLM CONNECTION TEST")
    print("="*60)
    
    results = {
        "ollama_connection": False,
        "ollama_models": {},
        "openai": False,
        "chromadb": False,
        "rag_service": False,
        "multi_model_service": False
    }
    
    # Test Ollama connection
    ollama_ok, models = await test_ollama_connection()
    results["ollama_connection"] = ollama_ok
    
    # Test Ollama models
    if ollama_ok:
        results["ollama_models"] = await test_ollama_models()
    
    # Test OpenAI
    results["openai"] = await test_openai_connection()
    
    # Test ChromaDB
    results["chromadb"] = await test_chromadb()
    
    # Test RAG service
    results["rag_service"] = await test_rag_service()
    
    # Test multi-model service
    results["multi_model_service"] = await test_multi_model_service()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    print(f"\n✅ Ollama Connection: {'PASS' if results['ollama_connection'] else 'FAIL'}")
    
    if results["ollama_models"]:
        print(f"\n📦 Ollama Models:")
        for model, status in results["ollama_models"].items():
            print(f"   {'✅' if status else '❌'} {model}")
    
    print(f"\n✅ OpenAI API: {'PASS' if results['openai'] else 'FAIL'}")
    print(f"✅ ChromaDB: {'PASS' if results['chromadb'] else 'FAIL'}")
    print(f"✅ RAG Service: {'PASS' if results['rag_service'] else 'FAIL'}")
    print(f"✅ Multi-Model Service: {'PASS' if results['multi_model_service'] else 'FAIL'}")
    
    # Overall status
    all_critical_pass = (
        results["ollama_connection"] and
        results["chromadb"] and
        results["rag_service"]
    )
    
    print("\n" + "="*60)
    if all_critical_pass:
        print("✅ ALL CRITICAL SYSTEMS OPERATIONAL")
    else:
        print("❌ SOME SYSTEMS NEED ATTENTION")
        print("\n💡 RECOMMENDATIONS:")
        if not results["ollama_connection"]:
            print("   1. Install and start Ollama: https://ollama.ai")
        if not results["chromadb"]:
            print("   2. Install ChromaDB: pip install chromadb")
        if not results["openai"]:
            print("   3. Set OPENAI_API_KEY in .env file (optional)")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
