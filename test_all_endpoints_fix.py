#!/usr/bin/env python3
"""
Complete Endpoint Testing - All 404 Errors Fixed
Tests all endpoints that were previously returning 404 errors
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_endpoint(name, method, url, data=None, expected_keys=None):
    """Test a single endpoint"""
    try:
        # Use longer timeout for AI endpoints
        timeout = 30 if 'chat' in url or 'ai' in url else 5
        
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=timeout)
        else:
            print(f"❌ {name}: Unsupported method {method}")
            return False
        
        if response.status_code == 200:
            result = response.json()
            
            # Check if expected keys are present
            if expected_keys:
                missing_keys = [key for key in expected_keys if key not in result]
                
                if missing_keys:
                    print(f"❌ {name}: Missing keys {missing_keys}")
                    return False
            
            print(f"✅ {name}: OK (status 200)")
            return True
        else:
            print(f"❌ {name}: Failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ {name}: Error - {e}")
        return False

def main():
    print("\n" + "="*70)
    print("🧪 Complete Endpoint Testing - All 404 Errors Fixed")
    print("="*70 + "\n")
    
    print("📋 Testing Dashboard Endpoints...")
    dashboard_tests = [
        {
            "name": "Progress Dashboard",
            "method": "GET",
            "url": f"{BASE_URL}/api/v1/progress/dashboard",
            "expected_keys": ["total_xp", "current_streak", "completed_quizzes"]
        },
        {
            "name": "Notifications Unread Count",
            "method": "GET",
            "url": f"{BASE_URL}/api/v1/notifications/unread-count",
            "expected_keys": ["unread_count"]
        },
        {
            "name": "Notifications List",
            "method": "GET",
            "url": f"{BASE_URL}/api/v1/notifications",
            "expected_keys": ["notifications", "total", "unread_count"]
        },
        {
            "name": "Gamification Profile",
            "method": "GET",
            "url": f"{BASE_URL}/api/v1/gamification/profile/1",
            "expected_keys": ["user_id", "total_xp", "achievements"]
        }
    ]
    
    dashboard_results = []
    for test in dashboard_tests:
        result = test_endpoint(
            test["name"], 
            test["method"], 
            test["url"], 
            expected_keys=test.get("expected_keys")
        )
        dashboard_results.append(result)
    
    print(f"\n📊 Dashboard: {sum(dashboard_results)}/{len(dashboard_results)} passed\n")
    
    print("📚 Testing Student Classes Endpoints...")
    classes_tests = [
        {
            "name": "My Classes",
            "method": "GET",
            "url": f"{BASE_URL}/api/v1/connect/my-classes",
            "expected_keys": ["classes", "total"]
        },
        {
            "name": "Scheduled Classes",
            "method": "GET",
            "url": f"{BASE_URL}/api/v1/scheduled-classes/student/1",
            "expected_keys": ["scheduled_classes", "total"]
        }
    ]
    
    classes_results = []
    for test in classes_tests:
        result = test_endpoint(
            test["name"], 
            test["method"], 
            test["url"], 
            expected_keys=test.get("expected_keys")
        )
        classes_results.append(result)
    
    print(f"\n📚 Classes: {sum(classes_results)}/{len(classes_results)} passed\n")
    
    print("🎤 Testing Voice Service Endpoints...")
    voice_tests = [
        {
            "name": "Voice Test Synthesize",
            "method": "POST",
            "url": f"{BASE_URL}/api/v1/voice/test-synthesize",
            "data": {"text": "test"},
            "expected_keys": ["status", "message", "text"]
        },
        {
            "name": "Voice Synthesize",
            "method": "POST",
            "url": f"{BASE_URL}/api/v1/voice/synthesize",
            "data": {"text": "test"},
            "expected_keys": ["status", "message", "text"]
        }
    ]
    
    voice_results = []
    for test in voice_tests:
        result = test_endpoint(
            test["name"], 
            test["method"], 
            test["url"],
            data=test.get("data"),
            expected_keys=test.get("expected_keys")
        )
        voice_results.append(result)
    
    print(f"\n🎤 Voice: {sum(voice_results)}/{len(voice_results)} passed\n")
    
    print("🤖 Testing AI Chat Endpoints...")
    ai_tests = [
        {
            "name": "AI Chat (Primary)",
            "method": "POST",
            "url": f"{BASE_URL}/api/v1/chat/chat",
            "data": {"message": "Hello", "model_category": "general"},
            "expected_keys": ["response", "session_id", "model_used"]
        },
        {
            "name": "AI Chat (Alias)",
            "method": "POST",
            "url": f"{BASE_URL}/api/v1/ai/chat",
            "data": {"message": "Hello", "model_category": "general"},
            "expected_keys": ["response", "session_id", "model_used"]
        }
    ]
    
    ai_results = []
    for test in ai_tests:
        result = test_endpoint(
            test["name"], 
            test["method"], 
            test["url"],
            data=test.get("data"),
            expected_keys=test.get("expected_keys")
        )
        ai_results.append(result)
    
    print(f"\n🤖 AI Chat: {sum(ai_results)}/{len(ai_results)} passed\n")
    
    # Calculate totals
    all_results = dashboard_results + classes_results + voice_results + ai_results
    total_tests = len(all_results)
    total_passed = sum(all_results)
    
    print("="*70)
    print(f"📊 FINAL RESULTS: {total_passed}/{total_tests} tests passed")
    print("="*70)
    
    if all(all_results):
        print("\n✅ SUCCESS! All endpoints are working correctly!")
        print("\n📝 Fixed Endpoints Summary:")
        print("   ✅ Dashboard endpoints (4)")
        print("   ✅ Student classes endpoints (2)")
        print("   ✅ Voice service endpoints (2)")
        print("   ✅ AI chat endpoints (2)")
        print("\n🎉 No more 404 errors in the console!")
    else:
        print("\n⚠️  Some tests failed. Please review the output above.")
    
    print("="*70 + "\n")
    
    return all(all_results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
