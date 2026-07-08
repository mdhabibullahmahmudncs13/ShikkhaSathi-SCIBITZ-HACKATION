#!/usr/bin/env python3
"""
Test Suite for Authentication Fix Verification
Tests the newly added authentication endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = 10

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{text.center(70)}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")

def print_test(name, status, details=""):
    symbol = f"{GREEN}✓{RESET}" if status else f"{RED}✗{RESET}"
    print(f"{symbol} {name}")
    if details:
        print(f"  {details}")

def test_health_check():
    """Test basic health check endpoint"""
    print_header("TEST 1: Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        success = response.status_code == 200
        data = response.json() if success else {}
        
        print_test("Health endpoint accessible", success)
        if success:
            print_test("Response contains status", "status" in data, f"Status: {data.get('status')}")
            print_test("Ollama enabled", data.get("ollama") == "enabled")
        
        return success
    except Exception as e:
        print_test("Health check", False, f"Error: {str(e)}")
        return False

def test_login_endpoint():
    """Test login endpoint with valid credentials"""
    print_header("TEST 2: Login Endpoint")
    
    test_users = [
        ("student1@example.com", "password123", "student"),
        ("teacher1@example.com", "password123", "teacher"),
        ("parent1@example.com", "password123", "parent"),
        ("admin@example.com", "password123", "admin")
    ]
    
    all_passed = True
    
    for email, password, expected_role in test_users:
        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/auth/login",
                json={"email": email, "password": password},
                timeout=TIMEOUT
            )
            
            success = response.status_code == 200
            all_passed = all_passed and success
            
            if success:
                data = response.json()
                has_token = "access_token" in data
                has_user = "user" in data
                correct_role = data.get("user", {}).get("role") == expected_role
                
                print_test(f"Login as {expected_role}", success and has_token and has_user and correct_role,
                          f"Token: {data.get('access_token')[:30]}...")
            else:
                print_test(f"Login as {expected_role}", False, f"Status: {response.status_code}")
                
        except Exception as e:
            print_test(f"Login as {expected_role}", False, f"Error: {str(e)}")
            all_passed = False
    
    return all_passed

def test_invalid_login():
    """Test login with invalid credentials"""
    print_header("TEST 3: Invalid Login Handling")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": "invalid@example.com", "password": "wrongpassword"},
            timeout=TIMEOUT
        )
        
        # Should return 401 for invalid credentials
        success = response.status_code == 401
        print_test("Invalid credentials rejected", success, f"Status: {response.status_code}")
        
        return success
    except Exception as e:
        print_test("Invalid login test", False, f"Error: {str(e)}")
        return False

def test_users_me_endpoint():
    """Test /api/v1/users/me endpoint"""
    print_header("TEST 4: Current User Endpoint")
    
    try:
        # First login to set session
        login_response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"email": "student1@example.com", "password": "password123"},
            timeout=TIMEOUT
        )
        
        if login_response.status_code != 200:
            print_test("Login before /users/me", False, "Login failed")
            return False
        
        print_test("Login successful", True)
        
        # Now test /users/me
        response = requests.get(f"{BASE_URL}/api/v1/users/me", timeout=TIMEOUT)
        success = response.status_code == 200
        
        if success:
            data = response.json()
            has_id = "id" in data
            has_email = "email" in data
            has_role = "role" in data
            has_name = "full_name" in data
            
            print_test("Get current user", success)
            print_test("User has ID", has_id, f"ID: {data.get('id')}")
            print_test("User has email", has_email, f"Email: {data.get('email')}")
            print_test("User has role", has_role, f"Role: {data.get('role')}")
            print_test("User has name", has_name, f"Name: {data.get('full_name')}")
            
            return success and has_id and has_email and has_role and has_name
        else:
            print_test("Get current user", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test("Users/me endpoint", False, f"Error: {str(e)}")
        return False

def test_ai_chat_endpoint():
    """Test AI chat endpoint with authentication"""
    print_header("TEST 5: AI Chat with Authentication")
    
    try:
        # Test math equation solving
        response = requests.post(
            f"{BASE_URL}/api/v1/chat/chat",
            json={
                "message": "Solve: x + 5 = 10",
                "model_category": "math",
                "ai_mode": "tutor"
            },
            timeout=60
        )
        
        success = response.status_code == 200
        
        if success:
            data = response.json()
            has_response = "response" in data and len(data["response"]) > 0
            has_model = "model_used" in data
            correct_model = data.get("model_used") == "phi3:mini"
            
            print_test("AI chat endpoint accessible", success)
            print_test("Response generated", has_response, f"Length: {len(data.get('response', ''))} chars")
            print_test("Correct model used", correct_model, f"Model: {data.get('model_used')}")
            print_test("RAG context included", data.get("has_rag_context", False))
            
            return success and has_response and correct_model
        else:
            print_test("AI chat endpoint", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test("AI chat test", False, f"Error: {str(e)}")
        return False

def test_ollama_models():
    """Test Ollama models availability"""
    print_header("TEST 6: Ollama Models")
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/models", timeout=TIMEOUT)
        success = response.status_code == 200
        
        if success:
            data = response.json()
            models = data.get("models", [])
            model_names = [m["name"] for m in models]
            
            has_math = any("phi3" in name for name in model_names)
            has_bangla = any("llama3.2:3b" in name for name in model_names)
            has_general = any("llama3.2:1b" in name for name in model_names)
            
            print_test("Models endpoint accessible", success)
            print_test("Math model available", has_math, "phi3:mini")
            print_test("Bangla model available", has_bangla, "llama3.2:3b")
            print_test("General model available", has_general, "llama3.2:1b")
            print_test("Total models loaded", len(models) >= 3, f"Count: {len(models)}")
            
            return success and has_math and has_bangla and has_general
        else:
            print_test("Models endpoint", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test("Ollama models test", False, f"Error: {str(e)}")
        return False

def test_cors_headers():
    """Test CORS headers are properly set"""
    print_header("TEST 7: CORS Configuration")
    
    try:
        response = requests.options(
            f"{BASE_URL}/api/v1/auth/login",
            headers={"Origin": "https://localhost:5174"},
            timeout=TIMEOUT
        )
        
        has_cors = "access-control-allow-origin" in response.headers
        
        print_test("CORS headers present", has_cors)
        if has_cors:
            print_test("Origin allowed", True, 
                      f"Allowed: {response.headers.get('access-control-allow-origin')}")
        
        return has_cors
    except Exception as e:
        print_test("CORS test", False, f"Error: {str(e)}")
        return False

def run_all_tests():
    """Run all tests and generate report"""
    print(f"\n{YELLOW}{'='*70}{RESET}")
    print(f"{YELLOW}{'Authentication Fix Test Suite'.center(70)}{RESET}")
    print(f"{YELLOW}{'='*70}{RESET}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target: {BASE_URL}")
    
    results = {
        "Health Check": test_health_check(),
        "Login Endpoint": test_login_endpoint(),
        "Invalid Login": test_invalid_login(),
        "Users/Me Endpoint": test_users_me_endpoint(),
        "AI Chat Integration": test_ai_chat_endpoint(),
        "Ollama Models": test_ollama_models(),
        "CORS Configuration": test_cors_headers()
    }
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0
    
    for test_name, result in results.items():
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"  {test_name:<30} {status}")
    
    print(f"\n{BLUE}{'─'*70}{RESET}")
    print(f"  Total Tests: {total}")
    print(f"  Passed: {GREEN}{passed}{RESET}")
    print(f"  Failed: {RED}{total - passed}{RESET}")
    print(f"  Success Rate: {GREEN if percentage == 100 else YELLOW}{percentage:.1f}%{RESET}")
    print(f"{BLUE}{'─'*70}{RESET}\n")
    
    if percentage == 100:
        print(f"{GREEN}✓ ALL TESTS PASSED! Authentication fix verified successfully.{RESET}\n")
        return 0
    else:
        print(f"{RED}✗ Some tests failed. Please review the output above.{RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
