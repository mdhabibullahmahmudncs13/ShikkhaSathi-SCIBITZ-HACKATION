#!/usr/bin/env python3
"""
Test math equation solving capabilities
"""

import requests
import json

BASE_URL = "http://192.168.0.109:8000"

def test_math_equations():
    """Test various math equation types"""
    
    # First register and login
    import time
    timestamp = str(int(time.time()))
    
    user_data = {
        "email": f"mathtest{timestamp}@example.com",
        "password": "testpass123",
        "full_name": "Math Test User",
        "role": "student"
    }
    
    reg_response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
    if reg_response.status_code != 200:
        print(f"❌ Registration failed: {reg_response.status_code}")
        return
    
    login_data = {
        "email": f"mathtest{timestamp}@example.com",
        "password": "testpass123"
    }
    
    login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test different types of math problems
    math_problems = [
        {
            "name": "Simple Addition",
            "message": "What is 15 + 27?",
            "expected_answer": "42"
        },
        {
            "name": "Linear Equation",
            "message": "Solve for x: 2x + 5 = 15",
            "expected_answer": "5"
        },
        {
            "name": "Quadratic Equation",
            "message": "Solve: x² - 5x + 6 = 0",
            "expected_answer": "x = 2 or x = 3"
        },
        {
            "name": "Fraction Problem",
            "message": "What is 3/4 + 1/2?",
            "expected_answer": "5/4 or 1.25"
        },
        {
            "name": "Percentage",
            "message": "What is 25% of 80?",
            "expected_answer": "20"
        },
        {
            "name": "Area Calculation",
            "message": "Find the area of a rectangle with length 8 cm and width 5 cm",
            "expected_answer": "40 cm²"
        },
        {
            "name": "Algebraic Expression",
            "message": "Simplify: 3x + 2x - x",
            "expected_answer": "4x"
        }
    ]
    
    print("🧮 Testing Math Equation Solving")
    print("=" * 50)
    
    results = []
    
    for problem in math_problems:
        print(f"\n📝 Testing: {problem['name']}")
        print(f"Question: {problem['message']}")
        print(f"Expected: {problem['expected_answer']}")
        
        chat_data = {
            "message": problem['message'],
            "subject": "mathematics"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/api/v1/ai/chat", json=chat_data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', 'No response')
                print(f"AI Answer: {ai_response[:200]}...")
                
                # Check if the expected answer appears in the response
                contains_answer = problem['expected_answer'].lower() in ai_response.lower()
                results.append({
                    "problem": problem['name'],
                    "success": contains_answer,
                    "response": ai_response
                })
                
                if contains_answer:
                    print("✅ Correct answer found in response")
                else:
                    print("❌ Expected answer not clearly found")
            else:
                print(f"❌ API call failed: {response.status_code}")
                results.append({
                    "problem": problem['name'],
                    "success": False,
                    "response": f"API Error: {response.status_code}"
                })
        except Exception as e:
            print(f"❌ Error: {e}")
            results.append({
                "problem": problem['name'],
                "success": False,
                "response": f"Exception: {e}"
            })
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Math Problem Solving Results")
    print("=" * 50)
    
    successful = sum(1 for r in results if r['success'])
    total = len(results)
    
    for result in results:
        status = "✅" if result['success'] else "❌"
        print(f"{status} {result['problem']}")
    
    print(f"\n🎯 Success Rate: {successful}/{total} ({successful/total*100:.1f}%)")
    
    if successful < total * 0.7:  # Less than 70% success rate
        print("\n⚠️  Math equation solving needs improvement!")
        print("Issues identified:")
        for result in results:
            if not result['success']:
                print(f"  - {result['problem']}: {result['response'][:100]}...")
    else:
        print("\n🎉 Math equation solving is working well!")

if __name__ == "__main__":
    test_math_equations()