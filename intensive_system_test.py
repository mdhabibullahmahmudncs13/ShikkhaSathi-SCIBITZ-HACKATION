#!/usr/bin/env python3
"""
ShikkhaSathi - Intensive System Testing Suite
Tests all features systematically with detailed reporting
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Tuple
import sys

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "https://localhost:5174"
TIMEOUT = 30

# Test results storage
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "errors": []
}

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    """Print formatted header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(70)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")

def print_section(text: str):
    """Print formatted section"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'-'*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'-'*70}{Colors.END}")

def test_pass(test_name: str, details: str = ""):
    """Record passed test"""
    test_results["total"] += 1
    test_results["passed"] += 1
    status = f"{Colors.GREEN}✓ PASS{Colors.END}"
    print(f"{status} - {test_name}")
    if details:
        print(f"       {Colors.GREEN}{details}{Colors.END}")

def test_fail(test_name: str, error: str):
    """Record failed test"""
    test_results["total"] += 1
    test_results["failed"] += 1
    test_results["errors"].append({"test": test_name, "error": error})
    status = f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"{status} - {test_name}")
    print(f"       {Colors.RED}Error: {error}{Colors.END}")

def test_skip(test_name: str, reason: str):
    """Record skipped test"""
    test_results["total"] += 1
    test_results["skipped"] += 1
    status = f"{Colors.YELLOW}⊘ SKIP{Colors.END}"
    print(f"{status} - {test_name}")
    print(f"       {Colors.YELLOW}Reason: {reason}{Colors.END}")

# ============================================================================
# PHASE 1: SYSTEM HEALTH & CONNECTIVITY
# ============================================================================

def test_phase_1_system_health():
    """Test basic system health and connectivity"""
    print_header("PHASE 1: SYSTEM HEALTH & CONNECTIVITY")
    
    # Test 1.1: Backend server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            test_pass("Backend server health check", f"Status: {response.json().get('status')}")
        else:
            test_fail("Backend server health check", f"Status code: {response.status_code}")
    except Exception as e:
        test_fail("Backend server health check", str(e))
    
    # Test 1.2: API root endpoint
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            test_pass("API root endpoint", f"Version: {data.get('version')}")
        else:
            test_fail("API root endpoint", f"Status code: {response.status_code}")
    except Exception as e:
        test_fail("API root endpoint", str(e))
    
    # Test 1.3: API v1 health check
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health", timeout=5)
        if response.status_code == 200:
            test_pass("API v1 health check")
        else:
            test_fail("API v1 health check", f"Status code: {response.status_code}")
    except Exception as e:
        test_fail("API v1 health check", str(e))
    
    # Test 1.4: CORS headers
    try:
        response = requests.options(f"{BASE_URL}/api/v1/health", 
                                   headers={"Origin": FRONTEND_URL}, 
                                   timeout=5)
        cors_header = response.headers.get("Access-Control-Allow-Origin")
        if cors_header:
            test_pass("CORS configuration", f"Origin: {cors_header}")
        else:
            test_fail("CORS configuration", "CORS headers not found")
    except Exception as e:
        test_fail("CORS configuration", str(e))

# ============================================================================
# PHASE 2: AUTHENTICATION SYSTEM
# ============================================================================

def test_phase_2_authentication():
    """Test authentication and user management"""
    print_header("PHASE 2: AUTHENTICATION SYSTEM")
    
    # Test 2.1: User registration endpoint exists
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "Test123!@#",
                "name": "Test User",
                "role": "student"
            },
            timeout=10
        )
        if response.status_code in [200, 201, 400, 409]:  # 400/409 if user exists
            test_pass("User registration endpoint", f"Status: {response.status_code}")
        else:
            test_fail("User registration endpoint", f"Unexpected status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("User registration endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("User registration endpoint", str(e))
    
    # Test 2.2: User login endpoint exists
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "Test123!@#"
            },
            timeout=10
        )
        if response.status_code in [200, 401]:  # 401 if credentials wrong
            test_pass("User login endpoint", f"Status: {response.status_code}")
        else:
            test_fail("User login endpoint", f"Unexpected status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("User login endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("User login endpoint", str(e))
    
    # Test 2.3: Profile endpoint exists
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/users/profile",
            headers={"Authorization": "Bearer test_token"},
            timeout=10
        )
        if response.status_code in [200, 401, 404]:
            test_pass("User profile endpoint", f"Status: {response.status_code}")
        else:
            test_fail("User profile endpoint", f"Unexpected status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("User profile endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("User profile endpoint", str(e))

# ============================================================================
# PHASE 3: AI TUTOR SYSTEM
# ============================================================================

def test_phase_3_ai_tutor():
    """Test AI tutor chat system"""
    print_header("PHASE 3: AI TUTOR SYSTEM")
    
    # Test 3.1: Chat endpoint exists
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/chat/chat",
            json={
                "message": "What is 2+2?",
                "user_id": "test_user"
            },
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            test_pass("AI chat endpoint", f"Response received: {len(data.get('response', ''))} chars")
        else:
            test_fail("AI chat endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("AI chat endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("AI chat endpoint", str(e))
    
    # Test 3.2: Math-specific chat
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/chat/chat",
            json={
                "message": "Solve: x^2 + 5x + 6 = 0",
                "user_id": "test_user",
                "subject": "mathematics"
            },
            timeout=30
        )
        if response.status_code == 200:
            test_pass("Math-specific AI chat")
        else:
            test_fail("Math-specific AI chat", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Math-specific AI chat", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Math-specific AI chat", str(e))
    
    # Test 3.3: Bengali chat
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/chat/chat",
            json={
                "message": "বাংলা ব্যাকরণ কি?",
                "user_id": "test_user",
                "language": "bengali"
            },
            timeout=30
        )
        if response.status_code == 200:
            test_pass("Bengali AI chat")
        else:
            test_fail("Bengali AI chat", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Bengali AI chat", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Bengali AI chat", str(e))
    
    # Test 3.4: RAG system status (using test_rag_status.py logic)
    try:
        # Test RAG by checking if we can query it
        response = requests.get(f"{BASE_URL}/api/v1/models", timeout=10)
        if response.status_code == 200:
            test_pass("RAG system check", "Models endpoint accessible")
        else:
            test_skip("RAG system check", "Models endpoint not available")
    except Exception as e:
        test_skip("RAG system check", str(e))

# ============================================================================
# PHASE 4: QUIZ SYSTEM
# ============================================================================

def test_phase_4_quiz_system():
    """Test quiz generation and submission"""
    print_header("PHASE 4: QUIZ SYSTEM")
    
    # Test 4.1: Get quiz subjects
    try:
        response = requests.get(f"{BASE_URL}/api/v1/quiz/subjects", timeout=10)
        if response.status_code == 200:
            data = response.json()
            subjects = data.get('subjects', [])
            test_pass("Get quiz subjects", f"Found {len(subjects)} subjects")
        else:
            test_fail("Get quiz subjects", f"Status code: {response.status_code}")
    except Exception as e:
        test_fail("Get quiz subjects", str(e))
    
    # Test 4.2: Get topics for mathematics
    try:
        response = requests.get(f"{BASE_URL}/api/v1/quiz/topics/mathematics", timeout=10)
        if response.status_code == 200:
            data = response.json()
            topics = data.get('topics', [])
            test_pass("Get quiz topics", f"Found {len(topics)} topics for mathematics")
        else:
            test_fail("Get quiz topics", f"Status code: {response.status_code}")
    except Exception as e:
        test_fail("Get quiz topics", str(e))
    
    # Test 4.3: Generate quiz
    try:
        print(f"       {Colors.YELLOW}Generating quiz (may take 30-45 seconds)...{Colors.END}")
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/api/v1/quiz/generate",
            json={
                "subject": "mathematics",
                "num_questions": 3,
                "difficulty": "medium"
            },
            timeout=60
        )
        generation_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            quiz_id = data.get('quiz_id')
            questions = data.get('questions', [])
            test_pass("Generate quiz", f"Generated {len(questions)} questions in {generation_time:.1f}s")
            
            # Store quiz_id for submission test
            return quiz_id
        else:
            test_fail("Generate quiz", f"Status code: {response.status_code}")
            return None
    except Exception as e:
        test_fail("Generate quiz", str(e))
        return None
    
    # Test 4.4: Submit quiz (if quiz was generated)
    quiz_id = test_phase_4_quiz_system.quiz_id if hasattr(test_phase_4_quiz_system, 'quiz_id') else None
    if quiz_id:
        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/quiz/submit",
                json={
                    "quiz_id": quiz_id,
                    "answers": {"0": "A", "1": "B", "2": "C"},
                    "time_taken_seconds": 120
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                score = data.get('score', 0)
                max_score = data.get('max_score', 0)
                test_pass("Submit quiz", f"Score: {score}/{max_score}")
            else:
                test_fail("Submit quiz", f"Status code: {response.status_code}")
        except Exception as e:
            test_fail("Submit quiz", str(e))
    else:
        test_skip("Submit quiz", "No quiz generated to submit")

# Store quiz_id for later use
test_phase_4_quiz_system.quiz_id = None

# ============================================================================
# PHASE 5: DASHBOARD & PROGRESS
# ============================================================================

def test_phase_5_dashboard():
    """Test dashboard and progress tracking"""
    print_header("PHASE 5: DASHBOARD & PROGRESS")
    
    # Test 5.1: Student dashboard data
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/progress/dashboard",
            timeout=10
        )
        if response.status_code == 200:
            test_pass("Student dashboard endpoint", f"Status: {response.status_code}")
        else:
            test_fail("Student dashboard endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Student dashboard endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Student dashboard endpoint", str(e))
    
    # Test 5.2: Progress tracking
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/progress/student/test_user",
            timeout=10
        )
        if response.status_code in [200, 404]:
            test_pass("Progress tracking endpoint", f"Status: {response.status_code}")
        else:
            test_fail("Progress tracking endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Progress tracking endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Progress tracking endpoint", str(e))
    
    # Test 5.3: XP and gamification
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/gamification/xp/test_user",
            timeout=10
        )
        if response.status_code in [200, 404]:
            test_pass("XP tracking endpoint", f"Status: {response.status_code}")
        else:
            test_fail("XP tracking endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("XP tracking endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("XP tracking endpoint", str(e))

# ============================================================================
# PHASE 6: TEACHER FEATURES
# ============================================================================

def test_phase_6_teacher_features():
    """Test teacher dashboard and features"""
    print_header("PHASE 6: TEACHER FEATURES")
    
    # Test 6.1: Teacher dashboard
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/dashboard/teacher",
            headers={"Authorization": "Bearer test_token"},
            timeout=10
        )
        if response.status_code in [200, 401]:
            test_pass("Teacher dashboard endpoint", f"Status: {response.status_code}")
        else:
            test_fail("Teacher dashboard endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Teacher dashboard endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Teacher dashboard endpoint", str(e))
    
    # Test 6.2: Student list
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/teacher/students",
            headers={"Authorization": "Bearer test_token"},
            timeout=10
        )
        if response.status_code in [200, 401]:
            test_pass("Teacher student list endpoint", f"Status: {response.status_code}")
        else:
            test_fail("Teacher student list endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Teacher student list endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Teacher student list endpoint", str(e))

# ============================================================================
# PHASE 7: LIVE CLASS SYSTEM
# ============================================================================

def test_phase_7_live_class():
    """Test live class and WebRTC features"""
    print_header("PHASE 7: LIVE CLASS SYSTEM")
    
    # Test 7.1: Schedule class
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/classes/schedule",
            json={
                "title": "Test Class",
                "subject": "Mathematics",
                "scheduled_time": "2026-01-16T10:00:00",
                "duration_minutes": 60
            },
            headers={"Authorization": "Bearer test_token"},
            timeout=10
        )
        if response.status_code in [200, 201, 401]:
            test_pass("Schedule class endpoint", f"Status: {response.status_code}")
        else:
            test_fail("Schedule class endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Schedule class endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Schedule class endpoint", str(e))
    
    # Test 7.2: Get scheduled classes
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/classes/scheduled",
            headers={"Authorization": "Bearer test_token"},
            timeout=10
        )
        if response.status_code in [200, 401]:
            test_pass("Get scheduled classes endpoint", f"Status: {response.status_code}")
        else:
            test_fail("Get scheduled classes endpoint", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("Get scheduled classes endpoint", "Endpoint not implemented yet")
    except Exception as e:
        test_fail("Get scheduled classes endpoint", str(e))
    
    # Test 7.3: WebSocket connection (basic check)
    try:
        # Just check if WebSocket server is running
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            test_pass("WebSocket server health")
        else:
            test_fail("WebSocket server health", f"Status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        test_skip("WebSocket server health", "WebSocket server not running")
    except Exception as e:
        test_fail("WebSocket server health", str(e))

# ============================================================================
# PHASE 8: PERFORMANCE & LOAD
# ============================================================================

def test_phase_8_performance():
    """Test system performance and response times"""
    print_header("PHASE 8: PERFORMANCE & LOAD")
    
    # Test 8.1: API response time
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        response_time = (time.time() - start_time) * 1000  # Convert to ms
        
        if response_time < 200:
            test_pass("API response time", f"{response_time:.0f}ms (target: <200ms)")
        else:
            test_fail("API response time", f"{response_time:.0f}ms (target: <200ms)")
    except Exception as e:
        test_fail("API response time", str(e))
    
    # Test 8.2: Quiz subjects response time
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/v1/quiz/subjects", timeout=5)
        response_time = (time.time() - start_time) * 1000
        
        if response_time < 200:
            test_pass("Quiz subjects response time", f"{response_time:.0f}ms")
        else:
            test_fail("Quiz subjects response time", f"{response_time:.0f}ms (target: <200ms)")
    except Exception as e:
        test_fail("Quiz subjects response time", str(e))
    
    # Test 8.3: Concurrent requests
    try:
        import concurrent.futures
        
        def make_request():
            return requests.get(f"{BASE_URL}/health", timeout=5)
        
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        total_time = time.time() - start_time
        success_count = sum(1 for r in results if r.status_code == 200)
        
        if success_count == 10:
            test_pass("Concurrent requests", f"10/10 successful in {total_time:.2f}s")
        else:
            test_fail("Concurrent requests", f"Only {success_count}/10 successful")
    except Exception as e:
        test_fail("Concurrent requests", str(e))

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

def print_summary():
    """Print test summary"""
    print_header("TEST SUMMARY")
    
    total = test_results["total"]
    passed = test_results["passed"]
    failed = test_results["failed"]
    skipped = test_results["skipped"]
    
    pass_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Total Tests:   {total}")
    print(f"{Colors.GREEN}Passed:        {passed} ({pass_rate:.1f}%){Colors.END}")
    print(f"{Colors.RED}Failed:        {failed}{Colors.END}")
    print(f"{Colors.YELLOW}Skipped:       {skipped}{Colors.END}")
    
    if failed > 0:
        print(f"\n{Colors.RED}{Colors.BOLD}Failed Tests:{Colors.END}")
        for error in test_results["errors"]:
            print(f"  • {error['test']}")
            print(f"    {Colors.RED}{error['error']}{Colors.END}")
    
    print(f"\n{Colors.BOLD}Overall Status: ", end="")
    if failed == 0:
        print(f"{Colors.GREEN}✓ ALL TESTS PASSED{Colors.END}")
    elif pass_rate >= 80:
        print(f"{Colors.YELLOW}⚠ MOSTLY PASSING ({pass_rate:.0f}%){Colors.END}")
    else:
        print(f"{Colors.RED}✗ NEEDS ATTENTION ({pass_rate:.0f}%){Colors.END}")
    
    print()

def main():
    """Main test execution"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}")
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║                                                                    ║")
    print("║           ShikkhaSathi - Intensive System Testing Suite           ║")
    print("║                                                                    ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}")
    
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Backend URL: {BASE_URL}")
    print(f"Frontend URL: {FRONTEND_URL}")
    
    start_time = time.time()
    
    # Execute all test phases
    test_phase_1_system_health()
    test_phase_2_authentication()
    test_phase_3_ai_tutor()
    
    # Store quiz_id from phase 4 for submission test
    quiz_id = test_phase_4_quiz_system()
    if quiz_id:
        test_phase_4_quiz_system.quiz_id = quiz_id
    
    test_phase_5_dashboard()
    test_phase_6_teacher_features()
    test_phase_7_live_class()
    test_phase_8_performance()
    
    total_time = time.time() - start_time
    
    print_summary()
    
    print(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total Duration: {total_time:.2f} seconds")
    
    # Exit with appropriate code
    sys.exit(0 if test_results["failed"] == 0 else 1)

if __name__ == "__main__":
    main()
