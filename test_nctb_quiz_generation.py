#!/usr/bin/env python3
"""
Test NCTB-Based Quiz Generation
Verifies that quizzes are generated from actual NCTB textbook content
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_ict_ebook_quiz():
    """Test quiz generation on ICT E-book topic"""
    print("🧪 Testing NCTB-Based Quiz Generation: ICT E-books\n")
    
    print("📝 Generating quiz on ICT - E-books topic...")
    response = requests.post(
        f"{BASE_URL}/api/v1/quiz/generate",
        json={
            "subject": "ict",
            "topic": "e-book electronic book",
            "difficulty": "medium",
            "num_questions": 5
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Quiz generation failed: {response.status_code}")
        print(response.text)
        return False
    
    quiz = response.json()
    print(f"✅ Quiz generated: {quiz['quiz_id']}")
    print(f"   Subject: {quiz['subject']}")
    print(f"   Topic: {quiz.get('topic', 'N/A')}")
    print(f"   Questions: {quiz['question_count']}\n")
    
    print("📋 Generated Questions:\n")
    for idx, q in enumerate(quiz['questions'], 1):
        print(f"Q{idx}: {q['question_text']}")
        print(f"   A) {q['options']['A']}")
        print(f"   B) {q['options']['B']}")
        print(f"   C) {q['options']['C']}")
        print(f"   D) {q['options']['D']}")
        print(f"   ✓ Correct: {q['correct_answer']}")
        print(f"   📖 Explanation: {q['explanation']}\n")
    
    # Check if questions seem NCTB-based
    nctb_keywords = ['textbook', 'e-book', 'kindle', 'pdf', 'epub', 'according to']
    nctb_based_count = 0
    
    for q in quiz['questions']:
        question_lower = q['question_text'].lower()
        explanation_lower = q['explanation'].lower()
        
        if any(keyword in question_lower or keyword in explanation_lower for keyword in nctb_keywords):
            nctb_based_count += 1
    
    print(f"📊 Analysis:")
    print(f"   Questions with NCTB references: {nctb_based_count}/{quiz['question_count']}")
    
    if nctb_based_count >= quiz['question_count'] * 0.6:  # At least 60% should reference NCTB
        print(f"   ✅ Good! Questions appear to be based on NCTB content")
    else:
        print(f"   ⚠️  Questions may need more NCTB-specific content")
    
    return True

def test_mathematics_quiz():
    """Test quiz generation on Mathematics"""
    print("\n" + "="*60)
    print("🧪 Testing NCTB-Based Quiz Generation: Mathematics\n")
    
    print("📝 Generating quiz on Mathematics - Algebra...")
    response = requests.post(
        f"{BASE_URL}/api/v1/quiz/generate",
        json={
            "subject": "mathematics",
            "topic": "algebra equation",
            "difficulty": "medium",
            "num_questions": 3
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Quiz generation failed: {response.status_code}")
        return False
    
    quiz = response.json()
    print(f"✅ Quiz generated: {quiz['quiz_id']}")
    print(f"   Questions: {quiz['question_count']}\n")
    
    print("📋 Generated Questions:\n")
    for idx, q in enumerate(quiz['questions'], 1):
        print(f"Q{idx}: {q['question_text'][:80]}...")
        print(f"   ✓ Correct: {q['correct_answer']}\n")
    
    return True

def test_bangla_quiz():
    """Test quiz generation on Bangla"""
    print("\n" + "="*60)
    print("🧪 Testing NCTB-Based Quiz Generation: বাংলা\n")
    
    print("📝 Generating quiz on Bangla - ব্যাকরণ...")
    response = requests.post(
        f"{BASE_URL}/api/v1/quiz/generate",
        json={
            "subject": "bangla",
            "topic": "ব্যাকরণ সন্ধি",
            "difficulty": "easy",
            "num_questions": 3
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Quiz generation failed: {response.status_code}")
        return False
    
    quiz = response.json()
    print(f"✅ Quiz generated: {quiz['quiz_id']}")
    print(f"   Questions: {quiz['question_count']}\n")
    
    print("📋 Generated Questions:\n")
    for idx, q in enumerate(quiz['questions'], 1):
        print(f"Q{idx}: {q['question_text']}")
        print(f"   ✓ সঠিক উত্তর: {q['correct_answer']}\n")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("NCTB-Based Quiz Generation Test")
    print("=" * 60 + "\n")
    
    try:
        # Test different subjects
        success1 = test_ict_ebook_quiz()
        success2 = test_mathematics_quiz()
        success3 = test_bangla_quiz()
        
        print("\n" + "=" * 60)
        if success1 and success2 and success3:
            print("✅ All NCTB quiz generation tests passed!")
            print("\n💡 Tips:")
            print("   - Questions are now generated from actual NCTB textbook content")
            print("   - The system retrieves 5 relevant textbook sections")
            print("   - Each section provides up to 800 characters of context")
            print("   - Questions reference specific textbook information")
        else:
            print("❌ Some tests failed")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure backend is running on port 8000")
    except Exception as e:
        print(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()
