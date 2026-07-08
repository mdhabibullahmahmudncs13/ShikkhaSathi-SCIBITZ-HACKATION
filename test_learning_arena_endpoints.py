#!/usr/bin/env python3
"""
Test the new learning arena endpoints
"""

import requests
import json

BASE_URL = "http://192.168.0.109:8000"

def test_learning_arena_endpoints():
    """Test all learning arena endpoints"""
    print("🎮 Testing Learning Arena Endpoints")
    print("=" * 50)
    
    # Test get learning arenas
    try:
        response = requests.get(f"{BASE_URL}/api/v1/learning/arenas")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET /learning/arenas: {len(data['arenas'])} arenas found")
            print(f"   Available arenas: {data['available_arenas']}")
            for arena in data['arenas'][:2]:  # Show first 2
                print(f"   - {arena['name']} ({arena['subject']}) - {arena['status']}")
        else:
            print(f"❌ GET /learning/arenas failed: {response.status_code}")
    except Exception as e:
        print(f"❌ GET /learning/arenas error: {e}")
    
    print()
    
    # Test get specific arena details
    try:
        response = requests.get(f"{BASE_URL}/api/v1/learning/arenas/math_kingdom")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET /learning/arenas/math_kingdom: {data['name']}")
            print(f"   Adventures: {len(data['adventures'])}")
            print(f"   Achievements: {len(data['achievements'])}")
        else:
            print(f"❌ GET /learning/arenas/math_kingdom failed: {response.status_code}")
    except Exception as e:
        print(f"❌ GET /learning/arenas/math_kingdom error: {e}")
    
    print()
    
    # Test get adventure details
    try:
        response = requests.get(f"{BASE_URL}/api/v1/learning/adventures/arithmetic_village")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET /learning/adventures/arithmetic_village: {data['name']}")
            print(f"   Type: {data['type']}")
            print(f"   XP Reward: {data['xp_reward']}")
            print(f"   Activities: {len(data['content']['activities'])}")
        else:
            print(f"❌ GET /learning/adventures/arithmetic_village failed: {response.status_code}")
    except Exception as e:
        print(f"❌ GET /learning/adventures/arithmetic_village error: {e}")
    
    print()
    
    # Test start adventure
    try:
        response = requests.post(f"{BASE_URL}/api/v1/learning/adventures/arithmetic_village/start")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ POST /learning/adventures/arithmetic_village/start")
            print(f"   Session ID: {data['session_id']}")
            print(f"   Status: {data['status']}")
            print(f"   Message: {data['message']}")
        else:
            print(f"❌ POST /learning/adventures/arithmetic_village/start failed: {response.status_code}")
    except Exception as e:
        print(f"❌ POST /learning/adventures/arithmetic_village/start error: {e}")
    
    print()
    
    # Test complete adventure
    try:
        completion_data = {
            "score": 85,
            "time_spent": 900  # 15 minutes
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/learning/adventures/arithmetic_village/complete",
            json=completion_data
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ POST /learning/adventures/arithmetic_village/complete")
            print(f"   XP Earned: {data['xp_earned']}")
            print(f"   Score: {data['score']}")
            print(f"   Message: {data['message']}")
            if data['next_adventure']:
                print(f"   Next Adventure: {data['next_adventure']}")
        else:
            print(f"❌ POST /learning/adventures/arithmetic_village/complete failed: {response.status_code}")
    except Exception as e:
        print(f"❌ POST /learning/adventures/arithmetic_village/complete error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Learning Arena endpoints are now available!")
    print("The frontend should no longer show 404 errors for /learning/arenas")

if __name__ == "__main__":
    test_learning_arena_endpoints()