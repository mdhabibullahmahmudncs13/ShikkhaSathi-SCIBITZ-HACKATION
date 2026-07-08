#!/usr/bin/env python3
"""
Test Chapter Extraction from NCTB Textbooks
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_chapter_extraction():
    """Test chapter extraction for all subjects"""
    
    subjects = ["mathematics", "ict", "physics", "english", "bangla"]
    
    print("\n" + "="*70)
    print("NCTB CHAPTER EXTRACTION TEST")
    print("="*70)
    
    for subject in subjects:
        print(f"\n{'='*70}")
        print(f"Subject: {subject.upper()}")
        print(f"{'='*70}")
        
        try:
            response = requests.get(f"{BASE_URL}/api/v1/quiz/topics/{subject}")
            
            if response.status_code == 200:
                data = response.json()
                topics = data.get("topics", [])
                source = data.get("source", "unknown")
                
                print(f"✅ Status: Success")
                print(f"📚 Source: {source}")
                print(f"📖 Total Chapters/Topics: {len(topics)}")
                print(f"\nChapters:")
                
                for i, topic in enumerate(topics, 1):
                    name = topic.get("name", "Unknown")
                    topic_id = topic.get("id", "")
                    print(f"  {i}. {name} (ID: {topic_id})")
                
                if source == "nctb_textbook":
                    print(f"\n✅ Successfully extracted chapters from NCTB textbook!")
                else:
                    print(f"\n⚠️  Using fallback topics (textbook not found)")
                    
            else:
                print(f"❌ Error: HTTP {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print(f"\n{'='*70}")
    print("TEST COMPLETE")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    test_chapter_extraction()
