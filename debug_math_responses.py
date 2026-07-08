#!/usr/bin/env python3
"""
Debug the exact responses for failing math problems
"""

import requests
import json

BASE_URL = "http://192.168.0.109:8000"

def debug_responses():
    """Debug the exact responses"""
    
    # Register and login
    import time
    timestamp = str(int(time.time()))
    
    user_data = {
        "email": f"debugtest{timestamp}@example.com",
        "password": "testpass123",
        "full_name": "Debug Test User",
        "role": "student"
    }
    
    reg_response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
    login_data = {
        "email": f"debugtest{timestamp}@example.com",
        "password": "testpass123"
    }
    
    login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test the two failing problems
    problems = [
        {
            "name": "Quadratic Equation",
            "message": "Solve: x² - 5x + 6 = 0",
            "expected": "x = 2 or x = 3"
        },
        {
            "name": "Fraction Problem", 
            "message": "What is 3/4 + 1/2?",
            "expected": "5/4 or 1.25"
        }
    ]
    
    for problem in problems:
        print(f"\n{'='*60}")
        print(f"PROBLEM: {problem['name']}")
        print(f"QUESTION: {problem['message']}")
        print(f"EXPECTED: {problem['expected']}")
        print('='*60)
        
        chat_data = {
            "message": problem['message'],
            "subject": "mathematics"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/ai/chat", json=chat_data, headers=headers)
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', 'No response')
            print(f"FULL AI RESPONSE:\n{ai_response}")
            
            # Check for various forms of the answer
            response_lower = ai_response.lower()
            
            if problem['name'] == "Quadratic Equation":
                checks = [
                    "x = 2" in response_lower,
                    "x = 3" in response_lower,
                    "x=2" in response_lower,
                    "x=3" in response_lower,
                    "2 and 3" in response_lower,
                    "x equals 2" in response_lower,
                    "x equals 3" in response_lower
                ]
                print(f"\nANSWER CHECKS:")
                print(f"  'x = 2' found: {'x = 2' in response_lower}")
                print(f"  'x = 3' found: {'x = 3' in response_lower}")
                print(f"  'x=2' found: {'x=2' in response_lower}")
                print(f"  'x=3' found: {'x=3' in response_lower}")
                print(f"  '2 and 3' found: {'2 and 3' in response_lower}")
                
            elif problem['name'] == "Fraction Problem":
                checks = [
                    "5/4" in response_lower,
                    "1.25" in response_lower,
                    "1 1/4" in response_lower,
                    "five fourths" in response_lower
                ]
                print(f"\nANSWER CHECKS:")
                print(f"  '5/4' found: {'5/4' in response_lower}")
                print(f"  '1.25' found: {'1.25' in response_lower}")
                print(f"  '1 1/4' found: {'1 1/4' in response_lower}")
                print(f"  'five fourths' found: {'five fourths' in response_lower}")

if __name__ == "__main__":
    debug_responses()