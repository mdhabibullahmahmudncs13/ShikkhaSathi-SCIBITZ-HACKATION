#!/usr/bin/env python3
"""
Script to add demo classes for testing persistence
"""

import json
import os
from datetime import datetime

def add_demo_classes():
    data_file = os.path.join(os.path.dirname(__file__), "persistent_data.json")
    
    # Demo classes for teacher
    demo_classes = [
        {
            "id": "1001",
            "name": "Mathematics Grade 8",
            "subject": "Mathematics",
            "grade": 8,
            "description": "Advanced mathematics for grade 8 students",
            "class_code": "MATH8A",
            "teacher_id": "2",
            "student_count": 5,
            "created_at": "2024-01-10T10:00:00Z",
            "recent_activity": "Class created"
        },
        {
            "id": "1002", 
            "name": "Science Grade 9",
            "subject": "Science",
            "grade": 9,
            "description": "General science for grade 9 students",
            "class_code": "SCI9B",
            "teacher_id": "2",
            "student_count": 8,
            "created_at": "2024-01-12T14:30:00Z",
            "recent_activity": "Recent quiz added"
        },
        {
            "id": "1003",
            "name": "English Literature",
            "subject": "English",
            "grade": 10,
            "description": "English literature and composition",
            "class_code": "ENG10C",
            "teacher_id": "2", 
            "student_count": 12,
            "created_at": "2024-01-15T09:15:00Z",
            "recent_activity": "Assignment graded"
        }
    ]
    
    # Create initial data structure
    data = {
        "classes": {
            "2": demo_classes  # teacher_id = "2" for teacher1@example.com
        },
        "students_in_classes": {
            "1001": ["1"],  # student1@example.com joined MATH8A
            "1002": ["1"],  # student1@example.com joined SCI9B
        },
        "student_classes": {
            "1": ["1001", "1002"]  # student1@example.com is in these classes
        },
        "assignments": {},
        "submissions": {}
    }
    
    # Save to file
    try:
        with open(data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✅ Demo classes added to {data_file}")
        print("📚 Added classes:")
        for cls in demo_classes:
            print(f"   - {cls['name']} ({cls['class_code']})")
    except Exception as e:
        print(f"❌ Error adding demo classes: {e}")

if __name__ == "__main__":
    add_demo_classes()