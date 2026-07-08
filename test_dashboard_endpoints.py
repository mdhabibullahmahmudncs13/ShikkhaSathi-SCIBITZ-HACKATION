#!/usr/bin/env python3
"""
Test Dashboard Endpoints Fix
Tests all dashboard endpoints that were returning 404 errors
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, expected_keys):
    """Test a single endpoint"""
    try:
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if expected keys are present
            missing_keys = [key for key in expected_keys if key not in data]
            
            if missing_keys:
                print(f"❌ {name}: Missing keys {missing_keys}")
                return False
            else:
                print(f"✅ {name}: OK (status 200, all keys present)")
                return True
        else:
            print(f"❌ {name}: Failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ {name}: Error - {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🧪 Testing Dashboard Endpoints Fix")
    print("="*60 + "\n")
    
    tests = [
        {
            "name": "Progress Dashboard",
            "url": f"{BASE_URL}/api/v1/progress/dashboard",
            "expected_keys": ["total_xp", "current_streak", "completed_quizzes", "average_score"]
        },
        {
            "name": "Notifications Unread Count",
            "url": f"{BASE_URL}/api/v1/notifications/unread-count",
            "expected_keys": ["unread_count"]
        },
        {
            "name": "Notifications List",
            "url": f"{BASE_URL}/api/v1/notifications",
            "expected_keys": ["notifications", "total", "unread_count"]
        },
        {
            "name": "Gamification Profile",
            "url": f"{BASE_URL}/api/v1/gamification/profile/1",
            "expected_keys": ["user_id", "total_xp", "current_level", "achievements"]
        }
    ]
    
    results = []
    for test in tests:
        result = test_endpoint(test["name"], test["url"], test["expected_keys"])
        results.append(result)
    
    print("\n" + "="*60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    
    if all(results):
        print("✅ All dashboard endpoints are working correctly!")
        print("\n📝 Summary:")
        print("   • Progress dashboard endpoint: ✅")
        print("   • Notifications endpoints: ✅")
        print("   • Gamification profile endpoint: ✅")
        print("\n🎉 Dashboard 404 errors have been fixed!")
    else:
        print("❌ Some tests failed")
    
    print("="*60 + "\n")
    
    return all(results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
