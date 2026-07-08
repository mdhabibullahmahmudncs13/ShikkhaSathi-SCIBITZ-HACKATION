#!/usr/bin/env python3
"""
Test AI Tutor Service directly
"""

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

async def test_ai_tutor():
    """Test AI Tutor service directly"""
    try:
        from services.rag.ai_tutor_service import ai_tutor_service
        
        print("🤖 Testing AI Tutor Service...")
        
        # Test basic chat
        print("\n📚 Testing Physics Question...")
        response = await ai_tutor_service.chat(
            message="What is force in physics? Explain it simply for a grade 9 student.",
            subject="Physics",
            grade=9
        )
        
        print("✅ Physics question successful!")
        print(f"Response: {response['response'][:300]}...")
        print(f"Model: {response['model']}")
        print(f"Context used: {response['context_used']}")
        
        # Test concept explanation
        print("\n🔬 Testing Concept Explanation...")
        concept_response = await ai_tutor_service.explain_concept(
            concept="Newton's First Law",
            subject="Physics",
            grade=9,
            difficulty_level="basic"
        )
        
        print("✅ Concept explanation successful!")
        print(f"Explanation: {concept_response['explanation'][:300]}...")
        
        # Test practice questions
        print("\n❓ Testing Practice Questions...")
        questions = await ai_tutor_service.generate_practice_questions(
            topic="Force and Motion",
            subject="Physics",
            grade=9,
            count=2
        )
        
        print("✅ Practice questions successful!")
        print(f"Generated {len(questions)} questions")
        for i, q in enumerate(questions, 1):
            print(f"Question {i}: {q.get('question', 'N/A')[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ AI Tutor test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_rag_service():
    """Test RAG service"""
    try:
        from services.rag.rag_service import rag_service
        
        print("\n📖 Testing RAG Service...")
        
        # Test adding some sample content
        sample_text = """
        Force is a push or pull that can change the motion of an object. 
        In physics, force is measured in Newtons (N). 
        Newton's First Law states that an object at rest stays at rest, 
        and an object in motion stays in motion, unless acted upon by an external force.
        """
        
        success = await rag_service.ingest_text(
            text=sample_text,
            metadata={
                "subject": "Physics",
                "topic": "Force and Motion",
                "grade": 9,
                "source": "test_content"
            }
        )
        
        if success:
            print("✅ Content ingestion successful!")
            
            # Test search
            results = await rag_service.search_similar("What is force?", n_results=2)
            print(f"✅ Search successful! Found {len(results)} results")
            
            # Test context generation
            context = await rag_service.get_context_for_query("Newton's first law", "Physics")
            print(f"✅ Context generation successful! Context length: {len(context)} chars")
            
            # Get stats
            stats = rag_service.get_collection_stats()
            print(f"✅ RAG Stats: {stats['document_count']} documents in collection")
            
        return success
        
    except Exception as e:
        print(f"❌ RAG service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting AI Tutor Integration Tests...\n")
    
    # Test RAG service first
    rag_success = await test_rag_service()
    
    # Test AI Tutor service
    tutor_success = await test_ai_tutor()
    
    # Summary
    total_tests = 2
    passed_tests = sum([rag_success, tutor_success])
    
    print(f"\n📊 Test Results: {passed_tests}/{total_tests} test suites passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! AI Tutor is ready for students!")
        print("\n🌟 You can now:")
        print("   • Visit http://localhost:5173/chat to test the UI")
        print("   • Add curriculum documents via the API")
        print("   • Start using the AI Tutor with students")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)