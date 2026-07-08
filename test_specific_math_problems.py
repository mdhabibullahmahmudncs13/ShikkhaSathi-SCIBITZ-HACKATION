#!/usr/bin/env python3
"""
Test specific math problems that were failing
"""

import requests
import json

BASE_URL = "http://192.168.0.109:8000"

def test_specific_problems():
    """Test the specific problems that were failing"""
    
    # Register and login
    import time
    timestamp = str(int(time.time()))
    
    user_data = {
        "email": f"mathtest{timestamp}@example.com",
        "password": "testpass123",
        "full_name": "Math Test User",
        "role": "student"
    }
    
    reg_response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
    login_data = {
        "email": f"mathtest{timestamp}@example.com",
        "password": "testpass123"
    }
    
    login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test the failing problems with more specific prompts
    problems = [
        {
            "name": "Quadratic Equation",
            "message": "Solve the quadratic equation: x² - 5x + 6 = 0. Find all values of x.",
            "expected": ["x = 2", "x = 3"]
        },
        {
            "name": "Fraction Addition",
            "message": "Add these fractions: 3/4 + 1/2. Show the final answer as both a fraction and decimal.",
            "expected": ["5/4", "1.25"]
        },
        {
            "name": "Simple Arithmetic",
            "message": "Calculate: 15 + 27 =",
            "expected": ["42"]
        }
    ]
    
    print("🔍 Testing Specific Math Problems")
    print("=" * 50)
    
    for problem in problems:
        print(f"\n📝 {problem['name']}")
        print(f"Question: {problem['message']}")
        
        chat_data = {
            "message": problem['message'],
            "subject": "mathematics"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/api/v1/ai/chat", json=chat_data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', 'No response')
                print(f"AI Response:\n{ai_response}\n")
                
                # Check if any expected answer is found
                found_answers = []
                for expected in problem['expected']:
                    if expected.lower() in ai_response.lower():
                        found_answers.append(expected)
                
                if found_answers:
                    print(f"✅ Found answers: {', '.join(found_answers)}")
                else:
                    print(f"❌ Expected answers not found: {', '.join(problem['expected'])}")
            else:
                print(f"❌ API Error: {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")
        
        print("-" * 30)

if __name__ == "__main__":
    test_specific_problems()