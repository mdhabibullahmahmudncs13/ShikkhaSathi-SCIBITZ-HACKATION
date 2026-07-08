#!/usr/bin/env python3
"""
Generate Question Bank from NCTB Textbooks
Creates 500+ questions per subject and stores them in JSON files
"""

import os
import sys
import json
import requests
import asyncio
from pathlib import Path
from typing import List, Dict
import time

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.rag.rag_service import get_rag_service

# Configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
QUESTION_BANK_DIR = Path(__file__).parent / "data" / "question_bank"
QUESTIONS_PER_BATCH = 10
TARGET_QUESTIONS_PER_SUBJECT = 500

# Subject configuration
SUBJECTS = {
    "mathematics": {
        "topics": [
            "algebra", "geometry", "trigonometry", "calculus", 
            "statistics", "probability", "number theory", "equations"
        ],
        "bangla_name": "গণিত"
    },
    "ict": {
        "topics": [
            "e-book", "internet", "web", "programming", "database",
            "networking", "hardware", "software", "cyber security"
        ],
        "bangla_name": "তথ্য ও যোগাযোগ প্রযুক্তি"
    },
    "physics": {
        "topics": [
            "mechanics", "thermodynamics", "electricity", "magnetism",
            "optics", "waves", "modern physics", "motion"
        ],
        "bangla_name": "পদার্থবিজ্ঞান"
    },
    "chemistry": {
        "topics": [
            "organic chemistry", "inorganic chemistry", "physical chemistry",
            "chemical reactions", "periodic table", "acids and bases"
        ],
        "bangla_name": "রসায়ন"
    },
    "biology": {
        "topics": [
            "cell biology", "genetics", "evolution", "ecology",
            "human body", "plants", "animals", "microorganisms"
        ],
        "bangla_name": "জীববিজ্ঞান"
    },
    "bangla": {
        "topics": [
            "ব্যাকরণ", "সন্ধি", "সমাস", "প্রত্যয়", "কারক",
            "বিভক্তি", "উপসর্গ", "ধাতু", "শব্দ"
        ],
        "bangla_name": "বাংলা"
    },
    "english": {
        "topics": [
            "grammar", "tenses", "parts of speech", "vocabulary",
            "comprehension", "writing", "literature"
        ],
        "bangla_name": "ইংরেজি"
    }
}

def create_question_generation_prompt(subject: str, topic: str, context: str, difficulty: str) -> str:
    """Create prompt for generating questions from textbook content"""
    return f"""You are an expert NCTB question generator for Bangladesh SSC students (Classes 9-10).

TASK: Generate {QUESTIONS_PER_BATCH} high-quality multiple-choice questions based ONLY on the textbook content below.

SUBJECT: {subject.title()}
TOPIC: {topic}
DIFFICULTY: {difficulty}

NCTB TEXTBOOK CONTENT:
{context}

CRITICAL RULES:
1. Questions MUST be based on the textbook content above
2. Use exact facts, definitions, and examples from the text
3. Each question must test specific textbook knowledge
4. Include textbook references in explanations
5. Create diverse question types (recall, understanding, application)

QUESTION FORMAT:
- Clear, unambiguous question text
- 4 options (A, B, C, D) with only ONE correct answer
- Wrong options should be plausible but clearly incorrect
- Explanation must cite textbook content

OUTPUT FORMAT (JSON):
{{
  "questions": [
    {{
      "question": "According to the NCTB textbook, [specific question]?",
      "options": {{
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      }},
      "correct_answer": "B",
      "explanation": "The textbook states: [exact quote or paraphrase]",
      "topic": "{topic}",
      "difficulty": "{difficulty}",
      "source": "NCTB Textbook"
    }}
  ]
}}

Generate exactly {QUESTIONS_PER_BATCH} questions in valid JSON format:"""

async def get_textbook_content(subject: str, topic: str, rag_service) -> str:
    """Retrieve relevant textbook content for a topic"""
    try:
        search_query = f"{subject} {topic}"
        
        # Try without subject filter first (more flexible)
        relevant_docs = await rag_service.search_similar(
            query=search_query,
            n_results=10,  # Get more content for question generation
            subject_filter=None  # Don't filter by subject, let the query handle it
        )
        
        if not relevant_docs:
            print(f"   ⚠️  No textbook content found for {subject} - {topic}")
            return ""
        
        # Build comprehensive context
        context = "\n\n".join([
            f"From {doc['metadata'].get('textbook_name', 'NCTB Textbook')} (Page {doc['metadata'].get('page', 'N/A')}):\n{doc['content']}"
            for doc in relevant_docs
        ])
        
        return context[:4000]  # Limit context size
        
    except Exception as e:
        print(f"   ❌ Error retrieving content: {e}")
        import traceback
        traceback.print_exc()
        return ""

def generate_questions_with_ollama(prompt: str) -> List[Dict]:
    """Generate questions using Ollama"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.6,
                    "top_p": 0.9
                }
            },
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '')
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*"questions"[\s\S]*\}', ai_response)
            if json_match:
                quiz_data = json.loads(json_match.group())
                return quiz_data.get('questions', [])
        
        return []
        
    except Exception as e:
        print(f"   ❌ Ollama generation error: {e}")
        return []

async def generate_questions_for_topic(
    subject: str, 
    topic: str, 
    target_count: int,
    rag_service
) -> List[Dict]:
    """Generate questions for a specific topic"""
    print(f"\n   📝 Generating questions for: {topic}")
    
    all_questions = []
    difficulties = ["easy", "medium", "hard"]
    
    # Get textbook content once
    context = await get_textbook_content(subject, topic, rag_service)
    
    if not context:
        print(f"   ⚠️  Skipping {topic} - no textbook content")
        return []
    
    # Generate questions in batches
    batches_needed = (target_count + QUESTIONS_PER_BATCH - 1) // QUESTIONS_PER_BATCH
    
    for batch in range(batches_needed):
        difficulty = difficulties[batch % len(difficulties)]
        
        prompt = create_question_generation_prompt(subject, topic, context, difficulty)
        questions = generate_questions_with_ollama(prompt)
        
        if questions:
            all_questions.extend(questions)
            print(f"      ✓ Batch {batch + 1}: {len(questions)} questions ({difficulty})")
        else:
            print(f"      ✗ Batch {batch + 1}: Failed")
        
        # Rate limiting
        time.sleep(2)
        
        if len(all_questions) >= target_count:
            break
    
    print(f"   ✅ Total generated: {len(all_questions)} questions")
    return all_questions[:target_count]

async def generate_question_bank_for_subject(subject: str, config: Dict):
    """Generate complete question bank for a subject"""
    print(f"\n{'='*60}")
    print(f"📚 Generating Question Bank: {config['bangla_name']} ({subject.upper()})")
    print(f"{'='*60}")
    
    # Initialize RAG service
    rag_service = get_rag_service()
    
    all_questions = []
    topics = config['topics']
    questions_per_topic = TARGET_QUESTIONS_PER_SUBJECT // len(topics)
    
    for topic in topics:
        questions = await generate_questions_for_topic(
            subject, 
            topic, 
            questions_per_topic,
            rag_service
        )
        all_questions.extend(questions)
    
    # Save question bank
    QUESTION_BANK_DIR.mkdir(parents=True, exist_ok=True)
    output_file = QUESTION_BANK_DIR / f"{subject}_questions.json"
    
    question_bank = {
        "subject": subject,
        "bangla_name": config['bangla_name'],
        "total_questions": len(all_questions),
        "topics": topics,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "questions": all_questions
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(question_bank, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Question bank saved: {output_file}")
    print(f"   Total questions: {len(all_questions)}")
    print(f"   Target: {TARGET_QUESTIONS_PER_SUBJECT}")
    
    return len(all_questions)

async def main():
    """Main function to generate all question banks"""
    print("🚀 NCTB Question Bank Generator")
    print(f"Target: {TARGET_QUESTIONS_PER_SUBJECT} questions per subject\n")
    
    total_questions = 0
    
    for subject, config in SUBJECTS.items():
        try:
            count = await generate_question_bank_for_subject(subject, config)
            total_questions += count
        except Exception as e:
            print(f"❌ Error generating {subject}: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*60}")
    print(f"✅ Question Bank Generation Complete!")
    print(f"   Total questions generated: {total_questions}")
    print(f"   Subjects: {len(SUBJECTS)}")
    print(f"   Average per subject: {total_questions // len(SUBJECTS)}")
    print(f"   Storage: {QUESTION_BANK_DIR}")
    print(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(main())
