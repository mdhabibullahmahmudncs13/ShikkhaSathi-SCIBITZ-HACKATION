#!/usr/bin/env python3
"""
Fast Question Bank Generator
Generates 500+ questions per subject from NCTB textbooks
"""

import os
import sys
import json
import requests
import asyncio
from pathlib import Path
import time
import random

sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.rag.rag_service import get_rag_service

OLLAMA_URL = "http://localhost:11434/api/generate"
QUESTION_BANK_DIR = Path(__file__).parent / "data" / "question_bank"
TARGET_PER_SUBJECT = 500

# Simplified subject list
SUBJECTS = ["mathematics", "ict", "physics", "chemistry", "biology", "bangla", "english"]

def generate_questions_batch(context: str, subject: str, num: int = 10) -> list:
    """Generate a batch of questions"""
    prompt = f"""Generate {num} multiple-choice questions from this NCTB textbook content.

SUBJECT: {subject}
CONTENT: {context[:2000]}

Create {num} questions in JSON format:
{{
  "questions": [
    {{
      "question": "Question text?",
      "options": {{"A": "opt1", "B": "opt2", "C": "opt3", "D": "opt4"}},
      "correct_answer": "A",
      "explanation": "Explanation",
      "topic": "topic",
      "difficulty": "medium"
    }}
  ]
}}"""
    
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.6}
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '')
            
            import re
            json_match = re.search(r'\{[\s\S]*"questions"[\s\S]*\}', ai_response)
            if json_match:
                data = json.loads(json_match.group())
                return data.get('questions', [])
        return []
    except:
        return []

async def generate_for_subject(subject: str, rag_service):
    """Generate 500+ questions for a subject"""
    print(f"\n{'='*60}")
    print(f"📚 Generating {TARGET_PER_SUBJECT} questions for: {subject.upper()}")
    print(f"{'='*60}")
    
    all_questions = []
    
    # Get diverse content from textbooks
    search_queries = [
        subject,
        f"{subject} basics",
        f"{subject} advanced",
        f"{subject} concepts",
        f"{subject} theory"
    ]
    
    for batch_num in range(50):  # 50 batches of 10 = 500 questions
        # Rotate through search queries for diversity
        query = search_queries[batch_num % len(search_queries)]
        
        # Get textbook content
        docs = await rag_service.search_similar(query, n_results=5, subject_filter=None)
        
        if not docs:
            print(f"   ⚠️  No content found for batch {batch_num + 1}")
            continue
        
        context = "\n".join([doc['content'][:400] for doc in docs])
        
        # Generate questions
        questions = generate_questions_batch(context, subject, 10)
        
        if questions:
            all_questions.extend(questions)
            print(f"   ✓ Batch {batch_num + 1}/50: {len(questions)} questions (Total: {len(all_questions)})")
        else:
            print(f"   ✗ Batch {batch_num + 1}/50: Failed")
        
        # Rate limiting
        time.sleep(1)
        
        if len(all_questions) >= TARGET_PER_SUBJECT:
            break
    
    # Save questions
    QUESTION_BANK_DIR.mkdir(parents=True, exist_ok=True)
    output_file = QUESTION_BANK_DIR / f"{subject}_questions.json"
    
    question_bank = {
        "subject": subject,
        "total_questions": len(all_questions),
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "questions": all_questions[:TARGET_PER_SUBJECT]
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(question_bank, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Saved {len(all_questions[:TARGET_PER_SUBJECT])} questions to {output_file.name}")
    return len(all_questions[:TARGET_PER_SUBJECT])

async def main():
    print("🚀 Fast Question Bank Generator")
    print(f"Target: {TARGET_PER_SUBJECT} questions per subject\n")
    
    rag_service = get_rag_service()
    
    if not rag_service:
        print("❌ RAG service not available")
        return
    
    stats = rag_service.get_collection_stats()
    print(f"📊 RAG Database: {stats.get('document_count', 0)} documents\n")
    
    total = 0
    for subject in SUBJECTS:
        try:
            count = await generate_for_subject(subject, rag_service)
            total += count
        except Exception as e:
            print(f"❌ Error with {subject}: {e}")
    
    print(f"\n{'='*60}")
    print(f"✅ Generation Complete!")
    print(f"   Total questions: {total}")
    print(f"   Subjects: {len(SUBJECTS)}")
    print(f"   Average: {total // len(SUBJECTS)} per subject")
    print(f"   Storage: {QUESTION_BANK_DIR}")
    print(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(main())
