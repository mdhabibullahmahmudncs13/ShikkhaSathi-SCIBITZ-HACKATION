#!/usr/bin/env python3
"""
Complete Quiz System Test
Tests all quiz endpoints with the updated unlimited questions
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_subjects_endpoint():
    """Test /api/v1/quiz/subjects endpoint"""
    print("=" * 60)
    print("TEST 1: Quiz Subjects Endpoint")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/api/v1/quiz/subjects")
    
    if response.status_code != 200:
        print(f"❌ Failed: {response.status_code}")
        return False
    
    data = response.json()
    subjects = data.get('subjects', [])
    
    print(f"✅ Status: 200 OK")
    print(f"📊 Total subjects: {len(subjects)}\n")
    
    for subject in subjects:
        print(f"  • {subject['name']}")
        print(f"    Questions: {subject['total_questions']}")
        print(f"    Available: {subject['available']}")
        print(f"    Description: {subject['description']}\n")
    
    # Verify all have 999 questions
    all_unlimited = all(s['total_questions'] == 999 for s in subjects)
    if all_unlimited:
        print("✅ All subjects show unlimited questions (999)")
    else:
        print("⚠️  Some subjects don't show 999 questions")
    
    return all_unlimited

def test_topics_endpoint():
    """Test /api/v1/quiz/subjects/{id}/topics endpoint"""
    print("\n" + "=" * 60)
    print("TEST 2: Quiz Topics Endpoint")
    print("=" * 60)
    
    test_subjects = ["mathematics", "ict", "physics"]
    all_passed = True
    
    for subject in test_subjects:
        response = requests.get(f"{BASE_URL}/api/v1/quiz/topics/{subject}")
        
        if response.status_code != 200:
            print(f"❌ {subject}: Failed ({response.status_code})")
            all_passed = False
            continue
        
        data = response.json()
        topics = data.get('topics', [])
        
        print(f"\n✅ {subject.upper()}: {len(topics)} topics")
        for topic in topics:
            print(f"  • {topic['name']}: {topic['question_count']} questions")
        
        # Verify all have 999 questions
        all_unlimited = all(t['question_count'] == 999 for t in topics)
        if not all_unlimited:
            print(f"  ⚠️  Some topics don't show 999 questions")
            all_passed = False
    
    return all_passed

def test_quiz_generation():
    """Test /api/v1/quiz/generate endpoint"""
    print("\n" + "=" * 60)
    print("TEST 3: Quiz Generation Endpoint")
    print("=" * 60)
    
    test_cases = [
        {"subject": "mathematics", "num_questions": 3},
        {"subject": "ict", "topic": "internet", "num_questions": 5},
        {"subject": "physics", "difficulty": "medium", "num_questions": 4}
    ]
    
    all_passed = True
    
    for idx, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {idx}: {test_case}")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/quiz/generate",
            json=test_case,
            timeout=45
        )
        
        if response.status_code != 200:
            print(f"❌ Failed: {response.status_code}")
            all_passed = False
            continue
        
        quiz = response.json()
        
        print(f"✅ Quiz generated: {quiz['quiz_id']}")
        print(f"   Subject: {quiz['subject']}")
        print(f"   Questions: {quiz['question_count']}")
        print(f"   Time limit: {quiz['time_limit_minutes']} minutes")
        
        # Verify questions have correct structure
        if quiz['questions']:
            q = quiz['questions'][0]
            has_required_fields = all(
                field in q for field in ['id', 'question_text', 'options', 'subject', 'topic']
            )
            
            if has_required_fields:
                print(f"   ✅ Question structure valid")
                print(f"   Sample: {q['question_text'][:60]}...")
            else:
                print(f"   ❌ Question structure invalid")
                all_passed = False
        else:
            print(f"   ❌ No questions generated")
            all_passed = False
    
    return all_passed

def test_quiz_submission():
    """Test /api/v1/quiz/submit endpoint"""
    print("\n" + "=" * 60)
    print("TEST 4: Quiz Submission Endpoint")
    print("=" * 60)
    
    # First generate a quiz
    print("\nGenerating quiz for submission test...")
    gen_response = requests.post(
        f"{BASE_URL}/api/v1/quiz/generate",
        json={"subject": "mathematics", "num_questions": 3},
        timeout=45
    )
    
    if gen_response.status_code != 200:
        print("❌ Failed to generate quiz")
        return False
    
    quiz = gen_response.json()
    print(f"✅ Quiz generated: {quiz['quiz_id']}")
    
    # Submit answers
    answers = {str(i): "A" for i in range(len(quiz['questions']))}
    
    print(f"\nSubmitting {len(answers)} answers...")
    sub_response = requests.post(
        f"{BASE_URL}/api/v1/quiz/submit",
        json={
            "quiz_id": quiz['quiz_id'],
            "answers": answers,
            "time_taken_seconds": 120
        }
    )
    
    if sub_response.status_code != 200:
        print(f"❌ Submission failed: {sub_response.status_code}")
        return False
    
    result = sub_response.json()
    
    print(f"✅ Quiz submitted successfully!")
    print(f"\n📊 Results:")
    print(f"   Score: {result['score']}/{result['max_score']}")
    print(f"   Percentage: {result['percentage']}%")
    print(f"   Correct: {result['correct_count']}")
    print(f"   Incorrect: {result['incorrect_count']}")
    print(f"   XP Earned: {result['xp_earned']}")
    print(f"   Performance: {result['performance_summary']['level']}")
    
    # Verify result structure
    has_required_fields = all(
        field in result for field in [
            'score', 'percentage', 'xp_earned', 'results', 'performance_summary'
        ]
    )
    
    if has_required_fields:
        print(f"\n✅ Result structure valid")
        return True
    else:
        print(f"\n❌ Result structure invalid")
        return False

def test_rag_database():
    """Check if RAG database has documents"""
    print("\n" + "=" * 60)
    print("TEST 5: RAG Database Status")
    print("=" * 60)
    
    try:
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
        
        from backend.app.services.rag.rag_service import get_rag_service
        
        rag_service = get_rag_service()
        stats = rag_service.get_collection_stats()
        
        doc_count = stats.get('document_count', 0)
        
        print(f"📊 RAG Database:")
        print(f"   Documents: {doc_count}")
        print(f"   Collection: {stats.get('collection_name', 'N/A')}")
        
        if doc_count > 0:
            print(f"\n✅ RAG database loaded ({doc_count} documents)")
            return True
        else:
            print(f"\n⚠️  RAG database empty - questions will use fallback")
            print(f"   Run: python3 backend/load_nctb_txt_documents.py")
            return False
    except Exception as e:
        print(f"❌ Error checking RAG: {e}")
        return False

def main():
    print("\n" + "=" * 60)
    print("COMPLETE QUIZ SYSTEM TEST")
    print("=" * 60 + "\n")
    
    results = {
        "Subjects Endpoint": False,
        "Topics Endpoint": False,
        "Quiz Generation": False,
        "Quiz Submission": False,
        "RAG Database": False
    }
    
    try:
        results["Subjects Endpoint"] = test_subjects_endpoint()
        results["Topics Endpoint"] = test_topics_endpoint()
        results["Quiz Generation"] = test_quiz_generation()
        results["Quiz Submission"] = test_quiz_submission()
        results["RAG Database"] = test_rag_database()
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to server")
        print("   Make sure backend is running on port 8000")
        return
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    
    print(f"\nTotal: {total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        print("\n🎉 All tests passed! Quiz system is fully functional!")
    elif total_passed >= 4:
        print("\n✅ Quiz system is functional (RAG loading may be in progress)")
    else:
        print("\n⚠️  Some tests failed - check errors above")
    
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
