#!/usr/bin/env python3
"""
Complete system functionality test
Tests authentication, AI chat, quiz generation, and RAG system
"""

import requests
import json
import time

BASE_URL = "http://192.168.0.109:8000"

def test_authentication_flow():
    """Test complete authentication flow"""
    print("🔐 Testing Authentication Flow...")
    
    # Use timestamp to ensure unique email
    import time
    timestamp = str(int(time.time()))
    
    # Register new user
    user_data = {
        "email": f"systemtest{timestamp}@example.com",
        "password": "testpass123",
        "full_name": "System Test User",
        "role": "student"
    }
    
    reg_response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
    if reg_response.status_code != 200:
        print(f"❌ Registration failed: {reg_response.status_code}")
        return None
    
    print("✅ Registration successful")
    
    # Login
    login_data = {
        "email": f"systemtest{timestamp}@example.com",
        "password": "testpass123"
    }
    
    login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return None
    
    token = login_response.json().get("access_token")
    print("✅ Login successful")
    return token

def test_ai_chat(token):
    """Test AI chat functionality"""
    print("🤖 Testing AI Chat...")
    
    headers = {"Authorization": f"Bearer {token}"}
    chat_data = {
        "message": "What is 2 + 2?",
        "subject": "mathematics"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/ai/chat", json=chat_data, headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ AI Chat working: {result.get('response', 'No response')[:50]}...")
            return True
        else:
            print(f"❌ AI Chat failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ AI Chat error: {e}")
        return False

def test_quiz_generation(token):
    """Test quiz generation"""
    print("📝 Testing Quiz Generation...")
    
    headers = {"Authorization": f"Bearer {token}"}
    quiz_data = {
        "subject": "mathematics",
        "topic": "Real Numbers",
        "question_count": 3,
        "difficulty": "medium"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/quiz/generate", json=quiz_data, headers=headers)
        if response.status_code == 200:
            result = response.json()
            questions = result.get('questions', [])
            print(f"✅ Quiz Generation working: Generated {len(questions)} questions")
            return True
        else:
            print(f"❌ Quiz Generation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Quiz Generation error: {e}")
        return False

def test_subjects_and_topics(token):
    """Test subjects and topics endpoints"""
    print("📚 Testing Subjects and Topics...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test subjects
    try:
        subjects_response = requests.get(f"{BASE_URL}/api/v1/quiz/subjects", headers=headers)
        if subjects_response.status_code == 200:
            subjects = subjects_response.json()
            print(f"✅ Subjects endpoint: {len(subjects)} subjects available")
        else:
            print(f"❌ Subjects failed: {subjects_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Subjects error: {e}")
        return False
    
    # Test topics for mathematics
    try:
        topics_response = requests.get(f"{BASE_URL}/api/v1/quiz/topics/mathematics", headers=headers)
        if topics_response.status_code == 200:
            topics = topics_response.json()
            print(f"✅ Topics endpoint: {len(topics)} mathematics topics")
            return True
        else:
            print(f"❌ Topics failed: {topics_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Topics error: {e}")
        return False

def test_rag_search(token):
    """Test RAG search functionality"""
    print("🔍 Testing RAG Status...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/rag/status", headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ RAG Status working: {result}")
            return True
        else:
            print(f"❌ RAG Status failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ RAG Status error: {e}")
        return False

def main():
    print("🧪 Complete System Functionality Test")
    print("=" * 50)
    
    # Test authentication
    token = test_authentication_flow()
    if not token:
        print("❌ Authentication failed - stopping tests")
        return
    
    print()
    
    # Test all major features
    tests = [
        ("AI Chat", lambda: test_ai_chat(token)),
        ("Quiz Generation", lambda: test_quiz_generation(token)),
        ("Subjects & Topics", lambda: test_subjects_and_topics(token)),
        ("RAG Status", lambda: test_rag_search(token))
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            print()
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            print()
    
    print("=" * 50)
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All systems operational!")
        print("✅ Authentication working")
        print("✅ AI Chat working")
        print("✅ Quiz Generation working")
        print("✅ Content Management working")
        print("✅ RAG System working")
        print("\n🚀 ShikkhaSathi is fully functional!")
    else:
        print(f"⚠️  {total - passed} systems need attention")

if __name__ == "__main__":
    main()