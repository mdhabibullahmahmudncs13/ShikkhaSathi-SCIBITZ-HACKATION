# 08 - AI Integration Guide

**AI Tutor & RAG System Implementation**

---

## 📖 Table of Contents

1. [AI Overview](#ai-overview)
2. [Ollama Setup](#ollama-setup)
3. [RAG System](#rag-system)
4. [AI Tutor Implementation](#ai-tutor-implementation)
5. [Quiz Generation](#quiz-generation)
6. [Model Selection](#model-selection)
7. [Performance Optimization](#performance-optimization)

---

## 🤖 AI Overview

### Architecture

```
┌─────────────────────────────────────┐
│         User Question               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      RAG System (ChromaDB)          │
│  - Search NCTB textbooks            │
│  - Retrieve relevant context        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Prompt Construction            │
│  - Combine question + context       │
│  - Add system instructions          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Ollama LLM                     │
│  - phi3:mini (Math)                 │
│  - llama3.2:3b (Bangla/Quiz)        │
│  - llama3.2:1b (General)            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Response to User               │
└─────────────────────────────────────┘
```

### Key Components

1. **Ollama** - Local LLM runtime
2. **ChromaDB** - Vector database for embeddings
3. **LangChain** - LLM framework
4. **NCTB Content** - Bangladesh curriculum textbooks

---

## 🚀 Ollama Setup

### Installation

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
```bash
brew install ollama
```

**Windows:**
Download from https://ollama.com/download

### Pull Models

```bash
# Math model (2.3GB)
ollama pull phi3:mini

# Bangla/Quiz model (2GB)
ollama pull llama3.2:3b

# General model (1.3GB)
ollama pull llama3.2:1b

# Verify
ollama list
```

### Start Ollama Service

```bash
# Start server
ollama serve

# Run in background
nohup ollama serve > ollama.log 2>&1 &
```

### Test Models

```bash
# Test math model
ollama run phi3:mini "What is 2+2?"

# Test Bangla model
ollama run llama3.2:3b "বাংলাদেশের রাজধানী কোথায়?"
```

---

## 🔍 RAG System

### ChromaDB Setup

```python
# backend/app/services/rag/rag_service.py
import chromadb
from chromadb.config import Settings
from typing import List, Dict
import os

class RAGService:
    def __init__(self):
        self.client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="./chroma_db"
        ))
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="nctb_textbooks",
            metadata={"description": "NCTB textbook content"}
        )
    
    def add_documents(
        self,
        documents: List[str],
        metadatas: List[Dict],
        ids: List[str]
    ):
        """Add documents to ChromaDB"""
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
    
    def search(
        self,
        query: str,
        n_results: int = 5,
        subject: str = None
    ) -> List[str]:
        """Search for relevant documents"""
        where = {"subject": subject} if subject else None
        
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where
        )
        
        return results['documents'][0]
```

### Loading NCTB Content

```python
# backend/load_nctb_txt_documents.py
import os
from app.services.rag.rag_service import RAGService

def load_nctb_documents():
    """Load NCTB textbooks into ChromaDB"""
    rag_service = RAGService()
    
    # Directory containing NCTB text files
    data_dir = "./data/nctb_txt"
    
    documents = []
    metadatas = []
    ids = []
    
    # Process each textbook file
    for filename in os.listdir(data_dir):
        if not filename.endswith('.txt'):
            continue
        
        filepath = os.path.join(data_dir, filename)
        
        # Extract subject from filename
        # e.g., "class_9_mathematics.txt" -> "mathematics"
        subject = filename.split('_')[-1].replace('.txt', '')
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split into chunks (paragraphs)
        chunks = content.split('\n\n')
        
        for i, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:  # Skip very short chunks
                continue
            
            doc_id = f"{subject}_{i}"
            documents.append(chunk.strip())
            metadatas.append({
                "subject": subject,
                "source": filename,
                "chunk_id": i
            })
            ids.append(doc_id)
    
    # Add to ChromaDB
    print(f"Loading {len(documents)} documents...")
    rag_service.add_documents(documents, metadatas, ids)
    print("✅ Documents loaded successfully!")

if __name__ == "__main__":
    load_nctb_documents()
```

### Chapter Extraction

```python
def extract_chapters_from_textbook(subject: str) -> List[Dict]:
    """Extract chapter names from NCTB textbooks"""
    chapters = []
    
    # Read textbook file
    filepath = f"./data/nctb_txt/class_9_{subject}.txt"
    
    if not os.path.exists(filepath):
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Look for chapter patterns
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Pattern 1: "Chapter 1: Title"
        if line.startswith('Chapter '):
            parts = line.split(':', 1)
            if len(parts) == 2:
                chapters.append({
                    "id": len(chapters) + 1,
                    "name": parts[1].strip(),
                    "source": "nctb_textbook"
                })
        
        # Pattern 2: "১. অধ্যায়: শিরোনাম"
        elif line.startswith(('১.', '২.', '৩.')):
            if 'অধ্যায়' in line:
                chapters.append({
                    "id": len(chapters) + 1,
                    "name": line,
                    "source": "nctb_textbook"
                })
    
    return chapters
```

---

## 💬 AI Tutor Implementation

### Chat Service

```python
# backend/app/services/chat_service.py
import httpx
from typing import Dict, List
from app.services.rag.rag_service import RAGService

class ChatService:
    def __init__(self):
        self.rag_service = RAGService()
        self.ollama_url = "http://localhost:11434/api/generate"
    
    async def get_response(
        self,
        message: str,
        subject: str = None,
        conversation_history: List[Dict] = None
    ) -> str:
        """Get AI tutor response"""
        
        # 1. Retrieve relevant context from NCTB
        context = await self.rag_service.search(
            query=message,
            n_results=3,
            subject=subject
        )
        
        # 2. Select appropriate model
        model = self._select_model(message, subject)
        
        # 3. Construct prompt
        prompt = self._construct_prompt(
            message,
            context,
            conversation_history
        )
        
        # 4. Call Ollama
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.ollama_url,
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )
            
            result = response.json()
            return result.get("response", "")
    
    def _select_model(self, message: str, subject: str) -> str:
        """Select appropriate Ollama model"""
        if subject == "mathematics":
            return "phi3:mini"
        elif subject == "bangla" or "বাংলা" in message:
            return "llama3.2:3b"
        else:
            return "llama3.2:1b"
    
    def _construct_prompt(
        self,
        message: str,
        context: List[str],
        history: List[Dict]
    ) -> str:
        """Construct prompt with context"""
        prompt = f"""You are an AI tutor for Bangladesh students (grades 6-12).

Context from NCTB textbook:
{chr(10).join(context)}

Student question: {message}

Provide a clear, educational answer. If it's a math problem, show step-by-step solution.
If in Bengali, respond in Bengali. Be encouraging and supportive.

Answer:"""
        
        return prompt
```

### Chat Endpoint

```python
# backend/app/api/api_v1/chat.py
from fastapi import APIRouter, Depends
from app.services.chat_service import ChatService
from app.core.deps import get_current_active_user
from app.schemas.chat import ChatMessage, ChatResponse

router = APIRouter()
chat_service = ChatService()

@router.post("/message", response_model=ChatResponse)
async def send_message(
    message: ChatMessage,
    current_user = Depends(get_current_active_user)
):
    """Send message to AI tutor"""
    response = await chat_service.get_response(
        message=message.message,
        subject=message.subject,
        conversation_history=message.history
    )
    
    return {
        "response": response,
        "timestamp": datetime.utcnow()
    }
```

---

## 📝 Quiz Generation

### Quiz Generation Service

```python
async def generate_quiz_with_rag(
    subject: str,
    topic: str,
    question_count: int,
    difficulty: str
) -> List[Dict]:
    """Generate quiz questions using RAG"""
    
    # 1. Search for relevant content
    query = f"{subject} {topic} {difficulty}"
    context_docs = await rag_service.search(
        query=query,
        n_results=10,
        subject=subject
    )
    
    # Combine context
    context = "\n\n".join(context_docs)
    
    # 2. Construct prompt
    prompt = f"""Generate {question_count} multiple choice questions about {topic} in {subject}.

Use ONLY the following content from NCTB textbook:
{context}

Difficulty: {difficulty}

Requirements:
- Questions must be based on the provided content
- Each question has 4 options (A, B, C, D)
- Only one correct answer
- Include explanation for correct answer
- Appropriate for Bangladesh students

Format as JSON array:
[
  {{
    "question_text": "Question here?",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct_answer": "A",
    "explanation": "Explanation here"
  }}
]

Generate questions:"""
    
    # 3. Call Ollama
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9
                }
            }
        )
        
        result = response.json()
        questions_text = result.get("response", "")
        
        # Parse JSON
        import json
        questions = json.loads(questions_text)
        
        return questions
```

---

## 🎯 Model Selection Strategy

### When to Use Each Model

**phi3:mini (Math):**
- Mathematical problems
- Step-by-step solutions
- Equations and formulas
- Numerical calculations

**llama3.2:3b (Bangla/Quiz):**
- Bengali language questions
- Quiz generation
- General subject questions
- Longer, detailed responses

**llama3.2:1b (General):**
- Quick queries
- Simple questions
- Fast responses needed
- Resource-constrained scenarios

### Implementation

```python
def select_model_for_task(
    task_type: str,
    subject: str,
    language: str
) -> str:
    """Select optimal model for task"""
    
    if task_type == "math_problem":
        return "phi3:mini"
    
    if language == "bengali" or subject == "bangla":
        return "llama3.2:3b"
    
    if task_type == "quiz_generation":
        return "llama3.2:3b"
    
    if task_type == "quick_query":
        return "llama3.2:1b"
    
    # Default
    return "llama3.2:3b"
```

---

## ⚡ Performance Optimization

### 1. Caching Responses

```python
from functools import lru_cache
import hashlib

class CachedChatService:
    def __init__(self):
        self.cache = {}
    
    def _get_cache_key(self, message: str, subject: str) -> str:
        """Generate cache key"""
        content = f"{message}_{subject}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def get_response(self, message: str, subject: str):
        """Get response with caching"""
        cache_key = self._get_cache_key(message, subject)
        
        # Check cache
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Generate response
        response = await self._generate_response(message, subject)
        
        # Cache it
        self.cache[cache_key] = response
        
        return response
```

### 2. Batch Processing

```python
async def generate_multiple_quizzes(quiz_requests: List[QuizRequest]):
    """Generate multiple quizzes in parallel"""
    tasks = [
        generate_quiz(req.subject, req.topic, req.count, req.difficulty)
        for req in quiz_requests
    ]
    
    results = await asyncio.gather(*tasks)
    return results
```

### 3. Streaming Responses

```python
@router.post("/chat/stream")
async def stream_chat(message: ChatMessage):
    """Stream AI response"""
    async def generate():
        async with httpx.AsyncClient() as client:
            async with client.stream(
                'POST',
                'http://localhost:11434/api/generate',
                json={
                    "model": "llama3.2:3b",
                    "prompt": message.message,
                    "stream": True
                }
            ) as response:
                async for chunk in response.aiter_text():
                    yield f"data: {chunk}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### 4. Model Preloading

```bash
# Preload models on startup
ollama run phi3:mini "warmup" > /dev/null
ollama run llama3.2:3b "warmup" > /dev/null
ollama run llama3.2:1b "warmup" > /dev/null
```

---

## 🧪 Testing AI Integration

```python
# test_ai_integration.py
import pytest
from app.services.chat_service import ChatService
from app.services.rag.rag_service import RAGService

@pytest.mark.asyncio
async def test_rag_search():
    """Test RAG search functionality"""
    rag = RAGService()
    results = await rag.search("quadratic equations", n_results=3)
    
    assert len(results) > 0
    assert "equation" in results[0].lower()

@pytest.mark.asyncio
async def test_chat_response():
    """Test AI chat response"""
    chat = ChatService()
    response = await chat.get_response(
        message="What is 2+2?",
        subject="mathematics"
    )
    
    assert response is not None
    assert len(response) > 0

@pytest.mark.asyncio
async def test_quiz_generation():
    """Test quiz generation"""
    questions = await generate_quiz_with_rag(
        subject="mathematics",
        topic="algebra",
        question_count=5,
        difficulty="medium"
    )
    
    assert len(questions) == 5
    assert all('question_text' in q for q in questions)
    assert all('correct_answer' in q for q in questions)
```

---

**Next:** [[09-Deployment-Guide]] - Production deployment

**শিক্ষাসাথী** - Powered by AI 🇧🇩
