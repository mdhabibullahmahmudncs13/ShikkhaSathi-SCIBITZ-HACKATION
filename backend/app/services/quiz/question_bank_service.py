"""
Question Bank Service
Loads pre-generated questions from JSON files
"""

import json
import random
from pathlib import Path
from typing import List, Dict, Optional

QUESTION_BANK_DIR = Path(__file__).parent.parent.parent.parent / "data" / "question_bank"

class QuestionBankService:
    def __init__(self):
        self.question_banks = {}
        self.load_all_question_banks()
    
    def load_all_question_banks(self):
        """Load all question banks from JSON files"""
        if not QUESTION_BANK_DIR.exists():
            print(f"⚠️  Question bank directory not found: {QUESTION_BANK_DIR}")
            return
        
        for json_file in QUESTION_BANK_DIR.glob("*_questions.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    subject = data.get('subject')
                    if subject:
                        self.question_banks[subject] = data
                        print(f"✅ Loaded {len(data['questions'])} questions for {subject}")
            except Exception as e:
                print(f"❌ Error loading {json_file}: {e}")

    
    def get_questions(
        self, 
        subject: str, 
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        num_questions: int = 5
    ) -> List[Dict]:
        """Get random questions from question bank"""
        
        if subject not in self.question_banks:
            return []
        
        questions = self.question_banks[subject]['questions']
        
        # Filter by topic if specified
        if topic:
            questions = [q for q in questions if topic.lower() in q.get('topic', '').lower()]
        
        # Filter by difficulty if specified
        if difficulty:
            questions = [q for q in questions if q.get('difficulty', '').lower() == difficulty.lower()]
        
        # Return random selection
        if len(questions) <= num_questions:
            return questions
        
        return random.sample(questions, num_questions)
    
    def get_question_count(self, subject: str) -> int:
        """Get total question count for a subject"""
        if subject not in self.question_banks:
            return 0
        return len(self.question_banks[subject]['questions'])
    
    def get_available_subjects(self) -> List[str]:
        """Get list of subjects with question banks"""
        return list(self.question_banks.keys())

# Global instance
_question_bank_service = None

def get_question_bank_service() -> QuestionBankService:
    """Get or create question bank service instance"""
    global _question_bank_service
    if _question_bank_service is None:
        _question_bank_service = QuestionBankService()
    return _question_bank_service
