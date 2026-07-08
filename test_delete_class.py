#!/usr/bin/env python3
"""
Test script for class deletion functionality
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_class_deletion():
    print("🧪 Testing Class Deletion Functionality")
    print("=" * 50)
    
    # Step 1: Create a test class
    print("1. Creating a test class...")
    create_data = {
        "class_name": "Test Delete Class",
        "subject": "Mathematics",
        "grade_level": 9,
        "section": "A",
        "description": "This class will be deleted for testing"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/connect/teacher/create-class", json=create_data)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                class_id = result["class"]["id"]
                class_code = result["class_code"]
                print(f"✅ Class created successfully!")
                print(f"   Class ID: {class_id}")
                print(f"   Class Code: {class_code}")
                
                # Step 2: Verify class appears in dashboard
                print("\n2. Checking if class appears in dashboard...")
                dashboard_response = requests.get(f"{BASE_URL}/api/v1/connect/teacher/dashboard")
                if dashboard_response.status_code == 200:
                    dashboard_data = dashboard_response.json()
                    classes = dashboard_data.get("classes", [])
                    created_class = next((c for c in classes if c["id"] == class_id), None)
                    if created_class:
                        print(f"✅ Class found in dashboard: {created_class['name']}")
                    else:
                        print("❌ Class not found in dashboard")
                        return
                
                # Step 3: Delete the class
                print(f"\n3. Deleting class {class_id}...")
                delete_response = requests.delete(f"{BASE_URL}/api/v1/connect/teacher/delete-class/{class_id}")
                if delete_response.status_code == 200:
                    delete_result = delete_response.json()
                    if delete_result.get("success"):
                        print(f"✅ Class deleted successfully!")
                        print(f"   Message: {delete_result['message']}")
                        
                        # Step 4: Verify class is removed from dashboard
                        print("\n4. Verifying class is removed from dashboard...")
                        dashboard_response2 = requests.get(f"{BASE_URL}/api/v1/connect/teacher/dashboard")
                        if dashboard_response2.status_code == 200:
                            dashboard_data2 = dashboard_response2.json()
                            classes2 = dashboard_data2.get("classes", [])
                            deleted_class = next((c for c in classes2 if c["id"] == class_id), None)
                            if deleted_class is None:
                                print("✅ Class successfully removed from dashboard")
                                print("\n🎉 All tests passed! Class deletion is working correctly.")
                            else:
                                print("❌ Class still appears in dashboard after deletion")
                        else:
                            print(f"❌ Failed to fetch dashboard: {dashboard_response2.status_code}")
                    else:
                        print(f"❌ Delete failed: {delete_result.get('message', 'Unknown error')}")
                else:
                    print(f"❌ Delete request failed: {delete_response.status_code}")
                    print(f"   Response: {delete_response.text}")
            else:
                print(f"❌ Class creation failed: {result.get('message', 'Unknown error')}")
        else:
            print(f"❌ Create request failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error during testing: {e}")

def test_delete_default_class():
    print("\n🧪 Testing Default Class Protection")
    print("=" * 50)
    
    # Try to delete a default class (should fail)
    print("Attempting to delete default class 'class_9a'...")
    try:
        response = requests.delete(f"{BASE_URL}/api/v1/connect/teacher/delete-class/class_9a")
        if response.status_code == 200:
            result = response.json()
            if not result.get("success"):
                print(f"✅ Default class protection working!")
                print(f"   Message: {result['message']}")
            else:
                print("❌ Default class was deleted (this shouldn't happen)")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error during testing: {e}")

def test_delete_nonexistent_class():
    print("\n🧪 Testing Non-existent Class Deletion")
    print("=" * 50)
    
    # Try to delete a non-existent class
    print("Attempting to delete non-existent class 'fake_class_id'...")
    try:
        response = requests.delete(f"{BASE_URL}/api/v1/connect/teacher/delete-class/fake_class_id")
        if response.status_code == 200:
            result = response.json()
            if not result.get("success"):
                print(f"✅ Non-existent class handling working!")
                print(f"   Message: {result['message']}")
            else:
                print("❌ Non-existent class deletion reported as successful")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error during testing: {e}")

if __name__ == "__main__":
    print("🚀 Starting Class Deletion Tests")
    print("Make sure the backend server is running on http://localhost:8000")
    print()
    
    # Test normal class deletion
    test_class_deletion()
    
    # Test default class protection
    test_delete_default_class()
    
    # Test non-existent class deletion
    test_delete_nonexistent_class()
    
    print("\n" + "=" * 50)
    print("🏁 Testing Complete!")