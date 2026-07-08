#!/usr/bin/env python3
"""
Quick test of question generation from NCTB textbooks
"""

import sys
import os
import asyncio
import requests
import json

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.services.rag.rag_service import get_rag_service

OLLAMA_URL = "http://localhost:11434/api/generate"

async def test_question_generation():
    print("🧪 Testing Question Generation from NCTB Textbooks\n")
    
    # Initialize RAG
    rag_service = get_rag_service()
    
    # Test: ICT E-book topic
    subject = "ict"
    topic = "e-book"
    
    print(f"📚 Subject: {subject}")
    print(f"📖 Topic: {topic}\n")
    
    # Get textbook content
    print("🔍 Retrieving textbook content...")
    search_query = f"{subject} {topic}"
    relevant_docs = await rag_service.search_similar(
        query=search_query,
        n_results=5,
        subject_filter=None
    )
    
    if not relevant_docs:
        print("❌ No textbook content found")
        return
    
    print(f"✅ Found {len(relevant_docs)} relevant sections\n")
    
    # Build context
    context = "\n\n".join([
        f"From {doc['metadata'].get('textbook_name', 'NCTB')}:\n{doc['content'][:500]}"
        for doc in relevant_docs
    ])
    
    print(f"📄 Context length: {len(context)} characters\n")
    print("First 200 chars of context:")
    print(context[:200] + "...\n")
    
    # Generate questions
    print("🤖 Generating questions with Ollama...")
    
    prompt = f"""You are an expert NCTB question generator for Bangladesh SSC students.

TASK: Generate 3 multiple-choice questions based ONLY on the textbook content below.

SUBJECT: ICT
TOPIC: E-book
DIFFICULTY: medium

NCTB TEXTBOOK CONTENT:
{context[:2000]}

REQUIREMENTS:
1. Questions MUST be based on the textbook content above
2. Use exact facts and definitions from the text
3. Each question must have 4 options (A, B, C, D)
4. Include explanation citing textbook

OUTPUT FORMAT (JSON):
{{
  "questions": [
    {{
      "question": "According to the NCTB textbook, what is an E-book?",
      "options": {{
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      }},
      "correct_answer": "B",
      "explanation": "The textbook states...",
      "topic": "e-book",
      "difficulty": "medium"
    }}
  ]
}}

Generate exactly 3 questions in valid JSON format:"""
    
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
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '')
            
            print("✅ Ollama response received\n")
            
            # Extract JSON
            import re
            json_match = re.search(r'\{[\s\S]*"questions"[\s\S]*\}', ai_response)
            if json_match:
                quiz_data = json.loads(json_match.group())
                questions = quiz_data.get('questions', [])
                
                print(f"📝 Generated {len(questions)} questions:\n")
                
                for i, q in enumerate(questions, 1):
                    print(f"Q{i}: {q.get('question', 'N/A')}")
                    print(f"   A) {q.get('options', {}).get('A', 'N/A')}")
                    print(f"   B) {q.get('options', {}).get('B', 'N/A')}")
                    print(f"   C) {q.get('options', {}).get('C', 'N/A')}")
                    print(f"   D) {q.get('options', {}).get('D', 'N/A')}")
                    print(f"   ✓ Correct: {q.get('correct_answer', 'N/A')}")
                    print(f"   📖 {q.get('explanation', 'N/A')}\n")
                
                print("✅ Question generation successful!")
            else:
                print("⚠️  Could not extract JSON from response")
                print(f"Response: {ai_response[:500]}")
        else:
            print(f"❌ Ollama error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_question_generation())
