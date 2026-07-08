#!/usr/bin/env python3
"""
Comprehensive Test Suite to Verify All Fixes
Tests: WebSocket, Class Deletion, Teacher Dashboard, Backend API
"""

import asyncio
import websockets
import requests
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Test configuration
BACKEND_URL = "http://localhost:8000"
WEBSOCKET_URL = "ws://localhost:8001"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
    
    def add_result(self, test_name, passed, message=""):
        self.tests.append({
            "name": test_name,
            "passed": passed,
            "message": message
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def print_summary(self):
        logger.info("\n" + "=" * 70)
        logger.info("📊 TEST RESULTS SUMMARY")
        logger.info("=" * 70)
        
        for test in self.tests:
            status = "✅ PASS" if test["passed"] else "❌ FAIL"
            logger.info(f"{status} - {test['name']}")
            if test["message"]:
                logger.info(f"      {test['message']}")
        
        logger.info("\n" + "=" * 70)
        total = self.passed + self.failed
        logger.info(f"Total Tests: {total}")
        logger.info(f"Passed: {self.passed} ({(self.passed/total*100):.1f}%)")
        logger.info(f"Failed: {self.failed} ({(self.failed/total*100):.1f}%)")
        logger.info("=" * 70)
        
        if self.failed == 0:
            logger.info("\n🎉 ALL TESTS PASSED! System is working correctly.")
        else:
            logger.info(f"\n⚠️  {self.failed} test(s) failed. Please review the issues above.")

results = TestResults()

# ============================================================================
# TEST 1: Backend API Health Check
# ============================================================================
def test_backend_health():
    """Test if backend API is running and healthy"""
    logger.info("\n🧪 TEST 1: Backend API Health Check")
    logger.info("-" * 70)
    
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Backend API is healthy")
            logger.info(f"   Status: {data.get('status')}")
            logger.info(f"   Ollama: {data.get('ollama')}")
            results.add_result("Backend API Health", True, "API responding correctly")
            return True
        else:
            logger.error(f"❌ Backend returned status code: {response.status_code}")
            results.add_result("Backend API Health", False, f"Status code: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Backend API test failed: {e}")
        results.add_result("Backend API Health", False, str(e))
        return False

# ============================================================================
# TEST 2: WebSocket Server Connection
# ============================================================================
async def test_websocket_connection():
    """Test WebSocket server connection and basic functionality"""
    logger.info("\n🧪 TEST 2: WebSocket Server Connection")
    logger.info("-" * 70)
    
    try:
        # Connect without timeout parameter for compatibility
        websocket = await websockets.connect(WEBSOCKET_URL)
        
        logger.info("✅ WebSocket connection established")
        
        # Test joining a room
        join_message = {
            "type": "join-room",
            "roomId": "test-room-verify",
            "userId": "test-user-verify",
            "userName": "Test User",
            "isTeacher": True
        }
        
        await websocket.send(json.dumps(join_message))
        logger.info("✅ Join room message sent successfully")
        
        # Test chat message
        chat_message = {
            "type": "chat-message",
            "senderName": "Test User",
            "message": "Verification test message",
            "isTeacher": True,
            "timestamp": datetime.now().isoformat()
        }
        
        await websocket.send(json.dumps(chat_message))
        logger.info("✅ Chat message sent successfully")
        
        await websocket.close()
        
        results.add_result("WebSocket Connection", True, "Connection and messaging working")
        return True
        
    except Exception as e:
        logger.error(f"❌ WebSocket test failed: {e}")
        results.add_result("WebSocket Connection", False, str(e))
        return False

# ============================================================================
# TEST 3: Teacher Dashboard Endpoints
# ============================================================================
def test_teacher_dashboard():
    """Test teacher dashboard endpoints"""
    logger.info("\n🧪 TEST 3: Teacher Dashboard Endpoints")
    logger.info("-" * 70)
    
    try:
        # Test dashboard endpoint
        response = requests.get(f"{BACKEND_URL}/api/v1/connect/teacher/dashboard", timeout=5)
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Teacher dashboard endpoint working")
            logger.info(f"   Teacher ID: {data.get('teacher_id')}")
            logger.info(f"   Total Classes: {data.get('total_classes', 0)}")
            logger.info(f"   Total Students: {data.get('total_students', 0)}")
            results.add_result("Teacher Dashboard Endpoint", True, "Dashboard data retrieved")
            return True
        else:
            logger.error(f"❌ Dashboard endpoint returned: {response.status_code}")
            results.add_result("Teacher Dashboard Endpoint", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Teacher dashboard test failed: {e}")
        results.add_result("Teacher Dashboard Endpoint", False, str(e))
        return False

# ============================================================================
# TEST 4: Class Creation and Deletion
# ============================================================================
def test_class_creation_deletion():
    """Test class creation and deletion functionality"""
    logger.info("\n🧪 TEST 4: Class Creation and Deletion")
    logger.info("-" * 70)
    
    created_class_id = None
    
    try:
        # Step 1: Create a test class
        logger.info("Step 1: Creating test class...")
        create_data = {
            "class_name": "Verification Test Class",
            "subject": "Mathematics",
            "grade_level": 9,
            "section": "A",
            "description": "Test class for verification"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/v1/connect/teacher/create-class",
            json=create_data,
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                created_class_id = result["class"]["id"]
                class_code = result["class_code"]
                logger.info(f"✅ Class created successfully")
                logger.info(f"   Class ID: {created_class_id}")
                logger.info(f"   Class Code: {class_code}")
                results.add_result("Class Creation", True, f"Created class: {created_class_id}")
            else:
                logger.error(f"❌ Class creation failed: {result.get('message')}")
                results.add_result("Class Creation", False, result.get('message'))
                return False
        else:
            logger.error(f"❌ Create class returned: {response.status_code}")
            results.add_result("Class Creation", False, f"Status: {response.status_code}")
            return False
        
        # Step 2: Verify class appears in dashboard
        logger.info("\nStep 2: Verifying class in dashboard...")
        response = requests.get(f"{BACKEND_URL}/api/v1/connect/teacher/dashboard", timeout=5)
        if response.status_code == 200:
            data = response.json()
            classes = data.get("classes", [])
            found = any(c["id"] == created_class_id for c in classes)
            if found:
                logger.info(f"✅ Class found in dashboard")
                results.add_result("Class in Dashboard", True, "Class visible in dashboard")
            else:
                logger.error(f"❌ Class not found in dashboard")
                results.add_result("Class in Dashboard", False, "Class not visible")
                return False
        
        # Step 3: Delete the class
        logger.info("\nStep 3: Deleting test class...")
        response = requests.delete(
            f"{BACKEND_URL}/api/v1/connect/teacher/delete-class/{created_class_id}",
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                logger.info(f"✅ Class deleted successfully")
                logger.info(f"   Message: {result['message']}")
                results.add_result("Class Deletion", True, "Class deleted successfully")
            else:
                logger.error(f"❌ Class deletion failed: {result.get('message')}")
                results.add_result("Class Deletion", False, result.get('message'))
                return False
        else:
            logger.error(f"❌ Delete class returned: {response.status_code}")
            results.add_result("Class Deletion", False, f"Status: {response.status_code}")
            return False
        
        # Step 4: Verify class removed from dashboard
        logger.info("\nStep 4: Verifying class removed from dashboard...")
        response = requests.get(f"{BACKEND_URL}/api/v1/connect/teacher/dashboard", timeout=5)
        if response.status_code == 200:
            data = response.json()
            classes = data.get("classes", [])
            found = any(c["id"] == created_class_id for c in classes)
            if not found:
                logger.info(f"✅ Class successfully removed from dashboard")
                results.add_result("Class Removal Verification", True, "Class no longer in dashboard")
                return True
            else:
                logger.error(f"❌ Class still in dashboard after deletion")
                results.add_result("Class Removal Verification", False, "Class still visible")
                return False
        
    except Exception as e:
        logger.error(f"❌ Class creation/deletion test failed: {e}")
        results.add_result("Class Creation/Deletion", False, str(e))
        return False

# ============================================================================
# TEST 5: Learning Arena Endpoints
# ============================================================================
def test_learning_arena():
    """Test Learning Arena endpoints"""
    logger.info("\n🧪 TEST 5: Learning Arena Endpoints")
    logger.info("-" * 70)
    
    try:
        # Test get arenas endpoint (correct URL)
        response = requests.get(f"{BACKEND_URL}/api/v1/learning/arenas", timeout=5)
        if response.status_code == 200:
            data = response.json()
            arenas = data.get("arenas", [])
            logger.info(f"✅ Learning Arena endpoint working")
            logger.info(f"   Available Arenas: {len(arenas)}")
            for arena in arenas[:2]:  # Show first 2
                logger.info(f"   - {arena.get('name')}: {arena.get('description')[:50]}...")
            results.add_result("Learning Arena Endpoints", True, f"{len(arenas)} arenas available")
            return True
        else:
            logger.error(f"❌ Learning Arena returned: {response.status_code}")
            results.add_result("Learning Arena Endpoints", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Learning Arena test failed: {e}")
        results.add_result("Learning Arena Endpoints", False, str(e))
        return False

# ============================================================================
# TEST 6: AI Chat Endpoint
# ============================================================================
def test_ai_chat():
    """Test AI chat endpoint with Ollama"""
    logger.info("\n🧪 TEST 6: AI Chat Endpoint")
    logger.info("-" * 70)
    
    try:
        chat_data = {
            "message": "What is 2 + 2?",
            "model_category": "math",
            "subject": "mathematics"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/v1/chat/chat",
            json=chat_data,
            timeout=30  # AI responses can take longer
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ AI Chat endpoint working")
            logger.info(f"   Model Used: {data.get('model_used')}")
            logger.info(f"   Response Length: {len(data.get('response', ''))} chars")
            logger.info(f"   Has RAG Context: {data.get('has_rag_context')}")
            results.add_result("AI Chat Endpoint", True, f"Model: {data.get('model_used')}")
            return True
        else:
            logger.error(f"❌ AI Chat returned: {response.status_code}")
            results.add_result("AI Chat Endpoint", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ AI Chat test failed: {e}")
        results.add_result("AI Chat Endpoint", False, str(e))
        return False

# ============================================================================
# TEST 7: Quiz System
# ============================================================================
def test_quiz_system():
    """Test quiz system endpoints"""
    logger.info("\n🧪 TEST 7: Quiz System")
    logger.info("-" * 70)
    
    try:
        # Test get subjects endpoint
        response = requests.get(f"{BACKEND_URL}/api/v1/quiz/subjects", timeout=5)
        if response.status_code == 200:
            data = response.json()
            subjects = data.get("subjects", [])
            logger.info(f"✅ Quiz subjects endpoint working")
            logger.info(f"   Available Subjects: {len(subjects)}")
            for subject in subjects[:3]:  # Show first 3
                logger.info(f"   - {subject.get('name')}: {subject.get('total_questions')} questions")
            results.add_result("Quiz System", True, f"{len(subjects)} subjects available")
            return True
        else:
            logger.error(f"❌ Quiz subjects returned: {response.status_code}")
            results.add_result("Quiz System", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Quiz system test failed: {e}")
        results.add_result("Quiz System", False, str(e))
        return False

# ============================================================================
# TEST 8: Scheduled Classes
# ============================================================================
def test_scheduled_classes():
    """Test scheduled classes endpoints"""
    logger.info("\n🧪 TEST 8: Scheduled Classes")
    logger.info("-" * 70)
    
    try:
        # Test get scheduled classes for teacher
        response = requests.get(
            f"{BACKEND_URL}/api/v1/scheduled-classes/teacher/2",
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            classes = data.get("scheduled_classes", [])
            logger.info(f"✅ Scheduled classes endpoint working")
            logger.info(f"   Scheduled Classes: {len(classes)}")
            results.add_result("Scheduled Classes", True, f"{len(classes)} classes scheduled")
            return True
        else:
            logger.error(f"❌ Scheduled classes returned: {response.status_code}")
            results.add_result("Scheduled Classes", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Scheduled classes test failed: {e}")
        results.add_result("Scheduled Classes", False, str(e))
        return False

# ============================================================================
# Main Test Runner
# ============================================================================
async def run_all_tests():
    """Run all verification tests"""
    logger.info("=" * 70)
    logger.info("🚀 SHIKKHASATHI SYSTEM VERIFICATION TEST SUITE")
    logger.info("=" * 70)
    logger.info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Backend URL: {BACKEND_URL}")
    logger.info(f"WebSocket URL: {WEBSOCKET_URL}")
    
    # Run synchronous tests
    test_backend_health()
    test_teacher_dashboard()
    test_class_creation_deletion()
    test_learning_arena()
    test_ai_chat()
    test_quiz_system()
    test_scheduled_classes()
    
    # Run async WebSocket test
    await test_websocket_connection()
    
    # Print summary
    results.print_summary()
    
    return results.failed == 0

if __name__ == "__main__":
    try:
        success = asyncio.run(run_all_tests())
        exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Tests interrupted by user")
        exit(1)
    except Exception as e:
        logger.error(f"\n\n❌ Test suite error: {e}")
        exit(1)