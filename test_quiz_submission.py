#!/usr/bin/env python3
"""
Test Quiz Submission Endpoint
Tests the complete quiz flow: generation → submission → results
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_quiz_submission():
    """Test complete quiz flow"""
    print("🧪 Testing Quiz Submission Flow\n")
    
    # Step 1: Generate a quiz
    print("📝 Step 1: Generating quiz...")
    generate_response = requests.post(
        f"{BASE_URL}/api/v1/quiz/generate",
        json={
            "subject": "mathematics",
            "topic": "algebra",
            "difficulty": "medium",
            "num_questions": 3
        }
    )
    
    if generate_response.status_code != 200:
        print(f"❌ Quiz generation failed: {generate_response.status_code}")
        print(generate_response.text)
        return False
    
    quiz = generate_response.json()
    print(f"✅ Quiz generated: {quiz['quiz_id']}")
    print(f"   Subject: {quiz['subject']}")
    print(f"   Questions: {quiz['question_count']}")
    print(f"   Time limit: {quiz['time_limit_minutes']} minutes\n")
    
    # Display questions
    print("📋 Questions:")
    for idx, q in enumerate(quiz['questions']):
        print(f"\n   Q{idx + 1}: {q['question_text']}")
        for opt, text in q['options'].items():
            print(f"      {opt}. {text}")
        print(f"      Correct: {q['correct_answer']}")
    
    # Step 2: Submit quiz with answers
    print("\n\n📤 Step 2: Submitting quiz answers...")
    
    # Create answers (mix of correct and incorrect)
    answers = {}
    for idx, q in enumerate(quiz['questions']):
        if idx == 0:
            # First answer correct
            answers[str(idx)] = q['correct_answer']
        elif idx == 1:
            # Second answer incorrect
            wrong_answers = ['A', 'B', 'C', 'D']
            wrong_answers.remove(q['correct_answer'])
            answers[str(idx)] = wrong_answers[0]
        else:
            # Third answer correct
            answers[str(idx)] = q['correct_answer']
    
    print(f"   Submitting answers: {answers}")
    
    submit_response = requests.post(
        f"{BASE_URL}/api/v1/quiz/submit",
        json={
            "quiz_id": quiz['quiz_id'],
            "answers": answers,
            "time_taken_seconds": 120
        }
    )
    
    if submit_response.status_code != 200:
        print(f"❌ Quiz submission failed: {submit_response.status_code}")
        print(submit_response.text)
        return False
    
    result = submit_response.json()
    print(f"\n✅ Quiz submitted successfully!")
    print(f"\n📊 Results:")
    print(f"   Attempt ID: {result['attempt_id']}")
    print(f"   Score: {result['score']}/{result['max_score']}")
    print(f"   Percentage: {result['percentage']}%")
    print(f"   Correct: {result['correct_count']}")
    print(f"   Incorrect: {result['incorrect_count']}")
    print(f"   Time taken: {result['time_taken_seconds']}s")
    print(f"   XP earned: {result['xp_earned']}")
    print(f"\n🎯 Performance:")
    print(f"   Level: {result['performance_summary']['level']}")
    print(f"   Message: {result['performance_summary']['message']}")
    print(f"   Recommendations:")
    for rec in result['performance_summary']['recommendations']:
        print(f"      • {rec}")
    
    print(f"\n📝 Detailed Results:")
    for r in result['results']:
        status = "✅" if r['is_correct'] else "❌"
        print(f"\n   {status} Question: {r['question_text'][:50]}...")
        print(f"      Your answer: {r['student_answer']}")
        print(f"      Correct answer: {r['correct_answer']}")
        print(f"      Explanation: {r['explanation'][:80]}...")
    
    return True

def test_quiz_submission_without_storage():
    """Test quiz submission when quiz is not in storage (server restart scenario)"""
    print("\n\n🧪 Testing Quiz Submission Without Storage (Mock Results)\n")
    
    # Submit a quiz that doesn't exist in storage
    print("📤 Submitting quiz with fake ID...")
    submit_response = requests.post(
        f"{BASE_URL}/api/v1/quiz/submit",
        json={
            "quiz_id": "quiz_fake_9999",
            "answers": {
                "0": "A",
                "1": "B",
                "2": "C",
                "3": "D",
                "4": "A"
            },
            "time_taken_seconds": 180
        }
    )
    
    if submit_response.status_code != 200:
        print(f"❌ Quiz submission failed: {submit_response.status_code}")
        return False
    
    result = submit_response.json()
    print(f"✅ Mock results generated successfully!")
    print(f"   Score: {result['score']}/{result['max_score']}")
    print(f"   Percentage: {result['percentage']}%")
    print(f"   Performance: {result['performance_summary']['level']}")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Quiz Submission Endpoint Test")
    print("=" * 60 + "\n")
    
    try:
        # Test 1: Complete flow
        success1 = test_quiz_submission()
        
        # Test 2: Mock results
        success2 = test_quiz_submission_without_storage()
        
        print("\n" + "=" * 60)
        if success1 and success2:
            print("✅ All tests passed!")
        else:
            print("❌ Some tests failed")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure backend is running on port 8000")
    except Exception as e:
        print(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()
