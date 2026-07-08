#!/usr/bin/env python3
"""
Test Quiz System - Frontend-Backend Integration
Tests the complete quiz flow matching frontend expectations
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_quiz_complete_flow():
    """Test complete quiz flow as frontend would use it"""
    print("\n" + "="*70)
    print("QUIZ SYSTEM - FRONTEND-BACKEND INTEGRATION TEST")
    print("="*70)
    
    # Step 1: Get subjects (as frontend does)
    print("\n1️⃣ Getting quiz subjects...")
    response = requests.get(f"{BASE_URL}/api/v1/quiz/subjects")
    assert response.status_code == 200, f"Failed to get subjects: {response.status_code}"
    
    subjects_data = response.json()
    subjects = subjects_data.get('subjects', [])
    print(f"✅ Found {len(subjects)} subjects")
    
    # Verify subject structure
    if subjects:
        subject = subjects[0]
        assert 'subject' in subject, "Missing 'subject' field"
        assert 'total_questions' in subject, "Missing 'total_questions' field"
        assert 'available' in subject, "Missing 'available' field"
        print(f"   Sample: {subject['subject']} - {subject['total_questions']} questions")
    
    # Step 2: Get topics for a subject (as frontend does)
    print("\n2️⃣ Getting topics for mathematics...")
    response = requests.get(f"{BASE_URL}/api/v1/quiz/topics/mathematics")
    assert response.status_code == 200, f"Failed to get topics: {response.status_code}"
    
    topics_data = response.json()
    topics = topics_data.get('topics', [])
    print(f"✅ Found {len(topics)} topics")
    
    # Verify topic structure
    if topics:
        topic = topics[0]
        assert 'topic' in topic, "Missing 'topic' field"
        assert 'question_count' in topic, "Missing 'question_count' field"
        print(f"   Sample: {topic['topic']} - {topic['question_count']} questions")
    
    # Step 3: Generate quiz (EXACTLY as frontend sends)
    print("\n3️⃣ Generating quiz (as frontend would)...")
    quiz_request = {
        "subject": "mathematics",
        "topic": "algebra",
        "grade": 10,
        "question_count": 5,  # Frontend uses question_count
        "time_limit_minutes": 10,
        "language": "english"
    }
    
    print(f"   Request: {json.dumps(quiz_request, indent=2)}")
    
    start_time = time.time()
    response = requests.post(
        f"{BASE_URL}/api/v1/quiz/generate",
        json=quiz_request,
        timeout=60
    )
    generation_time = time.time() - start_time
    
    assert response.status_code == 200, f"Failed to generate quiz: {response.status_code}"
    
    quiz = response.json()
    print(f"✅ Quiz generated in {generation_time:.1f}s")
    print(f"   Quiz ID: {quiz.get('quiz_id')}")
    print(f"   Questions: {len(quiz.get('questions', []))}")
    
    # Step 4: Verify quiz structure (EXACTLY as frontend expects)
    print("\n4️⃣ Verifying quiz structure...")
    
    required_fields = [
        'quiz_id', 'subject', 'topic', 'grade', 
        'difficulty_level', 'bloom_level', 'question_count',
        'time_limit_minutes', 'questions', 'created_at'
    ]
    
    for field in required_fields:
        assert field in quiz, f"Missing required field: {field}"
    
    print("✅ All required fields present")
    
    # Verify questions structure
    questions = quiz.get('questions', [])
    assert len(questions) > 0, "No questions in quiz"
    
    print(f"\n5️⃣ Verifying question structure...")
    question = questions[0]
    
    required_question_fields = [
        'id', 'question_text', 'options', 'subject',
        'topic', 'difficulty_level', 'bloom_level'
    ]
    
    for field in required_question_fields:
        assert field in question, f"Missing question field: {field}"
    
    # Verify options structure
    options = question.get('options', {})
    assert isinstance(options, dict), "Options must be a dict"
    assert 'A' in options, "Missing option A"
    assert 'B' in options, "Missing option B"
    assert 'C' in options, "Missing option C"
    assert 'D' in options, "Missing option D"
    
    print("✅ Question structure correct")
    print(f"   Sample question: {question['question_text'][:60]}...")
    print(f"   Options: A, B, C, D all present")
    
    # Step 6: Submit quiz (EXACTLY as frontend sends)
    print(f"\n6️⃣ Submitting quiz...")
    
    # Create answers (as frontend would)
    answers = {}
    for i, q in enumerate(questions):
        answers[str(i)] = "A"  # Frontend uses string IDs
    
    submission = {
        "quiz_id": quiz['quiz_id'],
        "answers": answers,
        "time_taken_seconds": 120
    }
    
    print(f"   Submitting {len(answers)} answers...")
    
    response = requests.post(
        f"{BASE_URL}/api/v1/quiz/submit",
        json=submission,
        timeout=30
    )
    
    assert response.status_code == 200, f"Failed to submit quiz: {response.status_code}"
    
    result = response.json()
    print(f"✅ Quiz submitted successfully")
    print(f"   Score: {result.get('score')}/{result.get('max_score')}")
    print(f"   Percentage: {result.get('percentage')}%")
    print(f"   XP Earned: {result.get('xp_earned')}")
    
    # Step 7: Verify result structure (EXACTLY as frontend expects)
    print(f"\n7️⃣ Verifying result structure...")
    
    required_result_fields = [
        'attempt_id', 'quiz_id', 'score', 'max_score',
        'percentage', 'correct_count', 'incorrect_count',
        'time_taken_seconds', 'xp_earned', 'total_xp',
        'level', 'level_up', 'results', 'performance_summary'
    ]
    
    for field in required_result_fields:
        assert field in result, f"Missing result field: {field}"
    
    print("✅ All result fields present")
    
    # Verify results array
    results_array = result.get('results', [])
    assert len(results_array) > 0, "No results in response"
    
    question_result = results_array[0]
    required_question_result_fields = [
        'question_id', 'question_text', 'student_answer',
        'correct_answer', 'is_correct', 'explanation', 'options'
    ]
    
    for field in required_question_result_fields:
        assert field in question_result, f"Missing question result field: {field}"
    
    print("✅ Question results structure correct")
    print(f"   Sample: {question_result['question_text'][:60]}...")
    print(f"   Student answer: {question_result['student_answer']}")
    print(f"   Correct answer: {question_result['correct_answer']}")
    print(f"   Is correct: {question_result['is_correct']}")
    
    # Verify performance summary
    perf_summary = result.get('performance_summary', {})
    assert 'level' in perf_summary, "Missing performance level"
    assert 'message' in perf_summary, "Missing performance message"
    assert 'recommendations' in perf_summary, "Missing recommendations"
    
    print("✅ Performance summary present")
    print(f"   Level: {perf_summary['level']}")
    print(f"   Message: {perf_summary['message']}")
    
    # Final summary
    print("\n" + "="*70)
    print("✅ ALL TESTS PASSED - QUIZ SYSTEM WORKING CORRECTLY")
    print("="*70)
    print("\n📊 Summary:")
    print(f"   ✅ Subjects endpoint working")
    print(f"   ✅ Topics endpoint working")
    print(f"   ✅ Quiz generation working (frontend format)")
    print(f"   ✅ Quiz structure matches frontend expectations")
    print(f"   ✅ Quiz submission working (frontend format)")
    print(f"   ✅ Result structure matches frontend expectations")
    print(f"   ✅ All required fields present")
    print("\n🎉 Frontend-Backend integration is PERFECT!")
    print()

if __name__ == "__main__":
    try:
        test_quiz_complete_flow()
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        exit(1)
