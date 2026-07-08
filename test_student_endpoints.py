#!/usr/bin/env python3
"""
Test Student Dashboard Endpoints
Tests all endpoints used by the student dashboard
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, description=""):
    """Test an endpoint and print results"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Method: {method} {endpoint}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ SUCCESS")
            print(f"Response preview: {json.dumps(result, indent=2)[:300]}...")
            return True
        else:
            print(f"❌ FAILED: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ CONNECTION REFUSED - Backend not running?")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("="*60)
    print("STUDENT DASHBOARD ENDPOINTS TEST")
    print("="*60)
    
    results = []
    
    # Test 1: Get student's enrolled classes
    results.append(test_endpoint(
        "GET",
        "/api/v1/connect/my-classes",
        description="Get student's enrolled classes"
    ))
    
    # Test 2: Get scheduled classes
    results.append(test_endpoint(
        "GET",
        "/api/v1/scheduled-classes/student/2",
        description="Get scheduled classes for student"
    ))
    
    # Test 3: Join class with valid code
    results.append(test_endpoint(
        "POST",
        "/api/v1/connect/student/join-class",
        data={"class_code": "MAT9A", "student_id": "2"},
        description="Join class with valid code (MAT9A)"
    ))
    
    # Test 4: Join class with invalid code
    print(f"\n{'='*60}")
    print(f"Testing: Join class with invalid code (should return 404)")
    print(f"Method: POST /api/v1/connect/student/join-class")
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/connect/student/join-class",
            json={"class_code": "INVALID", "student_id": "2"},
            timeout=5
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 404:
            print(f"✅ SUCCESS - Correctly returned 404 for invalid code")
            results.append(True)
        else:
            print(f"❌ FAILED - Expected 404, got {response.status_code}")
            results.append(False)
    except Exception as e:
        print(f"❌ ERROR: {e}")
        results.append(False)
    
    # Test 5: Available class codes
    print(f"\n{'='*60}")
    print("AVAILABLE CLASS CODES FOR TESTING:")
    print("  - MAT9A  : Mathematics Grade 9A")
    print("  - MAT9B  : Mathematics Grade 9B")
    print("  - PHY10B : Physics Grade 10B")
    print("  - Plus any codes from teacher-created classes")
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - Student dashboard endpoints working!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
