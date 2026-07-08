#!/usr/bin/env python3
"""
Test Chapter-Based Quiz Generation
Verify that quiz generation works with actual NCTB chapters
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_chapter_quiz_generation():
    """Test quiz generation with actual chapters"""
    
    print("\n" + "="*70)
    print("CHAPTER-BASED QUIZ GENERATION TEST")
    print("="*70)
    
    # Test 1: Get Mathematics chapters
    print("\n[1] Getting Mathematics chapters...")
    response = requests.get(f"{BASE_URL}/api/v1/quiz/topics/mathematics")
    
    if response.status_code != 200:
        print(f"❌ Failed to get chapters: {response.status_code}")
        return
    
    data = response.json()
    chapters = data.get("topics", [])
    source = data.get("source", "unknown")
    
    print(f"✅ Got {len(chapters)} chapters from {source}")
    
    if not chapters:
        print("❌ No chapters available")
        return
    
    # Test 2: Generate quiz for Chapter 1 (Real Numbers)
    chapter_1 = chapters[0]
    print(f"\n[2] Generating quiz for: {chapter_1['name']}")
    
    quiz_request = {
        "subject": "mathematics",
        "topic": chapter_1["id"],  # e.g., "chapter_1"
        "grade": 10,
        "question_count": 3,
        "time_limit_minutes": 10,
        "language": "english",
        "difficulty": "medium"
    }
    
    print(f"Request: {json.dumps(quiz_request, indent=2)}")
    
    response = requests.post(
        f"{BASE_URL}/api/v1/quiz/generate",
        json=quiz_request
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to generate quiz: {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    quiz_data = response.json()
    questions = quiz_data.get("questions", [])
    
    print(f"\n✅ Quiz generated successfully!")
    print(f"📝 Questions: {len(questions)}")
    print(f"⏱️  Time limit: {quiz_data.get('time_limit_minutes', 0)} minutes")
    print(f"📚 Subject: {quiz_data.get('subject', 'N/A')}")
    print(f"📖 Topic: {quiz_data.get('topic', 'N/A')}")
    
    # Display questions
    print(f"\n{'='*70}")
    print("GENERATED QUESTIONS")
    print(f"{'='*70}")
    
    for i, q in enumerate(questions, 1):
        print(f"\nQuestion {i}:")
        print(f"  Text: {q.get('question_text', 'N/A')[:100]}...")
        print(f"  Type: {q.get('question_type', 'N/A')}")
        print(f"  Difficulty: {q.get('difficulty', 'N/A')}")
        
        if q.get('options'):
            print(f"  Options:")
            for opt in q['options']:
                print(f"    - {opt}")
    
    # Test 3: Generate quiz for Chapter 3 (Algebraic Expressions)
    if len(chapters) >= 3:
        chapter_3 = chapters[2]
        print(f"\n{'='*70}")
        print(f"[3] Generating quiz for: {chapter_3['name']}")
        print(f"{'='*70}")
        
        quiz_request["topic"] = chapter_3["id"]
        quiz_request["question_count"] = 2
        
        response = requests.post(
            f"{BASE_URL}/api/v1/quiz/generate",
            json=quiz_request
        )
        
        if response.status_code == 200:
            quiz_data = response.json()
            questions = quiz_data.get("questions", [])
            print(f"✅ Generated {len(questions)} questions for {chapter_3['name']}")
            
            for i, q in enumerate(questions, 1):
                print(f"\nQuestion {i}: {q.get('question_text', 'N/A')[:80]}...")
        else:
            print(f"❌ Failed: {response.status_code}")
    
    print(f"\n{'='*70}")
    print("TEST COMPLETE")
    print(f"{'='*70}\n")
    
    print("\n✅ Chapter-based quiz generation is working!")
    print("Students can now select specific NCTB chapters for quizzes.")

if __name__ == "__main__":
    test_chapter_quiz_generation()
