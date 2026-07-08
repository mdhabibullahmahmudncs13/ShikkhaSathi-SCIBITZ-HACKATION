#!/usr/bin/env python3
"""
Test the complete authentication system after restart
"""

import requests
import json

BASE_URL = "http://192.168.0.109:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health")
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_registration():
    """Test user registration"""
    try:
        user_data = {
            "email": "testuser@example.com",
            "password": "testpassword123",
            "full_name": "Test User",
            "role": "student"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/auth/register", json=user_data)
        print(f"✅ Registration: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Registration failed: {e}")
        return False

def test_login():
    """Test user login"""
    try:
        login_data = {
            "email": "testuser@example.com",
            "password": "testpassword123"
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
        print(f"✅ Login: {response.status_code} - {response.json()}")
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            return token
        return None
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return None

def test_user_profile(token):
    """Test user profile endpoint"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/v1/users/me", headers=headers)
        print(f"✅ User profile: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ User profile failed: {e}")
        return False

def main():
    print("🧪 Testing Complete Authentication System")
    print("=" * 50)
    
    # Test health
    if not test_health():
        print("❌ Backend not responding")
        return
    
    # Test registration
    if not test_registration():
        print("❌ Registration failed")
        return
    
    # Test login
    token = test_login()
    if not token:
        print("❌ Login failed")
        return
    
    # Test user profile
    if not test_user_profile(token):
        print("❌ User profile failed")
        return
    
    print("\n🎉 All authentication tests passed!")
    print("✅ Registration works")
    print("✅ Login works")
    print("✅ User profile works")
    print("✅ Authentication system is fully functional")

if __name__ == "__main__":
    main()