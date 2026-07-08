# Phase 4: Local LLM + RAG Setup Guide

**Goal:** Set up a completely local AI tutoring system with no external API dependencies

---

## 🎯 Architecture Overview

```
Student Question
      ↓
Frontend Chat Interface
      ↓
Backend Chat API
      ↓
AI Tutor Service
      ↓
RAG System (ChromaDB) ← NCTB PDFs
      ↓
Local LLM (Ollama/Llama2)
      ↓
Response with Sources
```

**Everything runs on your machine - no API keys, no cloud costs!**

---

## 📦 Components

### 1. Local LLM (Ollama)
- **What:** Runs large language models locally
- **Models:** Llama2, Mistral, CodeLlama
- **Why:** Free, private, no API limits

### 2. Vector Database (ChromaDB)
- **What:** Stores document embeddings locally
- **Storage:** Persistent SQLite database
- **Why:** Fast, simple, no setup needed

### 3. Embeddings (Sentence Transformers)
- **What:** Converts text to vectors
- **Model:** all-MiniLM-L6-v2 (lightweight)
- **Why:** Fast, runs on CPU, good quality

---

## 🚀 Quick Start

### Step 1: Install Ollama

**Linux/Mac:**
```bash
curl https://ollama.ai/install.sh | sh
```

**Windows:**
Download from https://ollama.ai/download

**Verify Installation:**
```bash
ollama --version
```

### Step 2: Download LLM Model

**Option A: Llama2 (7B - Recommended for most systems)**
```bash
ollama pull llama2
```

**Option B: Mistral (7B - Better performance)**
```bash
ollama pull mistral
```

**Option C: Llama2 13B (Better quality, needs more RAM)**
```bash
ollama pull llama2:13b
```

**Test the model:**
```bash
ollama run llama2
>>> Hello, how are you?
```

### Step 3: Install Python Dependencies

```bash
cd backend
pip install chromadb sentence-transformers pypdf2 langchain ollama langchain-community
```

**Verify Installation:**
```python
python3 -c "import chromadb; import sentence_transformers; print('All good!')"
```

### Step 4: Prepare NCTB Documents

```bash
# Create directory structure
mkdir -p backend/data/nctb/{mathematics,physics,chemistry,english,bangla}

# Place your PDF files
# Example structure:
# backend/data/nctb/
#   ├── mathematics/
#   │   ├── grade-8-math.pdf
#   │   └── grade-9-math.pdf
#   ├── physics/
#   │   └── grade-10-physics.pdf
#   └── ...
```

---

## 🔧 Configuration

### Backend .env File

```bash
# Add to backend/.env

# Local LLM Settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2  # or mistral

# ChromaDB Settings
CHROMA_PERSIST_DIRECTORY=./data/chroma_db
CHROMA_COLLECTION_NAME=nctb_documents

# Embedding Model
EMBEDDING_MODEL=all-MiniLM-L6-v2

# RAG Settings
CHUNK_SIZE=500
CHUNK_OVERLAP=50
TOP_K_RESULTS=3
```

---

## 📝 Implementation Steps

### 1. Create Vector Store Service

**File:** `backend/app/services/rag/vector_store.py`

```python
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict
import os

class VectorStore:
    def __init__(self):
        # Initialize ChromaDB with persistent storage
        self.client = chromadb.Client(Settings(
            persist_directory=os.getenv("CHROMA_PERSIST_DIRECTORY", "./data/chroma_db"),
            anonymized_telemetry=False
        ))
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=os.getenv("CHROMA_COLLECTION_NAME", "nctb_documents")
        )
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer(
            os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        )
    
    def add_documents(self, texts: List[str], metadatas: List[Dict], ids: List[str]):
        """Add documents to vector store"""
        embeddings = self.embedding_model.encode(texts).tolist()
        self.collection.add(
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )
    
    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """Search for similar documents"""
        query_embedding = self.embedding_model.encode([query])[0].tolist()
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # Format results
        documents = []
        for i in range(len(results['documents'][0])):
            documents.append({
                'text': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i]
            })
        
        return documents
```

### 2. Create Document Processor

**File:** `backend/app/services/rag/document_processor.py`

```python
from pypdf import PdfReader
from typing import List, Dict
import os
import uuid

class DocumentProcessor:
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def load_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF"""
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    
    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), self.chunk_size - self.chunk_overlap):
            chunk = " ".join(words[i:i + self.chunk_size])
            chunks.append(chunk)
        
        return chunks
    
    def process_pdf(self, pdf_path: str, subject: str, grade: int) -> List[Dict]:
        """Process PDF and return chunks with metadata"""
        # Extract text
        text = self.load_pdf(pdf_path)
        
        # Chunk text
        chunks = self.chunk_text(text)
        
        # Create metadata
        filename = os.path.basename(pdf_path)
        documents = []
        
        for i, chunk in enumerate(chunks):
            documents.append({
                'id': str(uuid.uuid4()),
                'text': chunk,
                'metadata': {
                    'source': filename,
                    'subject': subject,
                    'grade': grade,
                    'chunk_index': i
                }
            })
        
        return documents
```

### 3. Create Ingestion Script

**File:** `backend/app/utils/ingest_documents.py`

```python
import os
from app.services.rag.vector_store import VectorStore
from app.services.rag.document_processor import DocumentProcessor

def ingest_nctb_documents():
    """Ingest all NCTB documents into vector store"""
    vector_store = VectorStore()
    processor = DocumentProcessor()
    
    data_dir = "./data/nctb"
    subjects = ["mathematics", "physics", "chemistry", "english", "bangla"]
    
    total_docs = 0
    
    for subject in subjects:
        subject_dir = os.path.join(data_dir, subject)
        if not os.path.exists(subject_dir):
            print(f"Skipping {subject} - directory not found")
            continue
        
        for filename in os.listdir(subject_dir):
            if not filename.endswith('.pdf'):
                continue
            
            pdf_path = os.path.join(subject_dir, filename)
            print(f"Processing: {pdf_path}")
            
            # Extract grade from filename (e.g., "grade-8-math.pdf")
            try:
                grade = int(filename.split('-')[1])
            except:
                grade = 8  # default
            
            # Process PDF
            documents = processor.process_pdf(pdf_path, subject, grade)
            
            # Add to vector store
            texts = [doc['text'] for doc in documents]
            metadatas = [doc['metadata'] for doc in documents]
            ids = [doc['id'] for doc in documents]
            
            vector_store.add_documents(texts, metadatas, ids)
            
            total_docs += len(documents)
            print(f"  Added {len(documents)} chunks")
    
    print(f"\nTotal documents ingested: {total_docs}")

if __name__ == "__main__":
    ingest_nctb_documents()
```

### 4. Create AI Tutor Service

**File:** `backend/app/services/ai_tutor/tutor_service.py`

```python
from langchain.llms import Ollama
from langchain.prompts import PromptTemplate
from app.services.rag.vector_store import VectorStore
from typing import List, Dict
import os

class AITutorService:
    def __init__(self):
        # Initialize Ollama LLM
        self.llm = Ollama(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            model=os.getenv("OLLAMA_MODEL", "llama2"),
            temperature=0.7
        )
        
        # Initialize vector store
        self.vector_store = VectorStore()
        
        # Create prompt template
        self.prompt_template = PromptTemplate(
            input_variables=["context", "question", "history"],
            template="""You are a helpful AI tutor for Bangladesh students. Use the following context from NCTB curriculum to answer the question.

Context from textbooks:
{context}

Previous conversation:
{history}

Student Question: {question}

Provide a clear, educational answer. If the context doesn't contain relevant information, say so and provide general guidance. Always cite the source (subject and grade) when using information from the context.

Answer:"""
        )
    
    def get_response(self, question: str, conversation_history: List[Dict] = None) -> Dict:
        """Generate AI tutor response"""
        # Search for relevant context
        results = self.vector_store.search(question, top_k=3)
        
        # Format context
        context = "\n\n".join([
            f"[{r['metadata']['subject']} - Grade {r['metadata']['grade']}]\n{r['text']}"
            for r in results
        ])
        
        # Format history
        history = ""
        if conversation_history:
            for msg in conversation_history[-3:]:  # Last 3 messages
                history += f"{msg['role']}: {msg['content']}\n"
        
        # Generate prompt
        prompt = self.prompt_template.format(
            context=context,
            question=question,
            history=history
        )
        
        # Get response from LLM
        response = self.llm(prompt)
        
        # Extract sources
        sources = [
            {
                'subject': r['metadata']['subject'],
                'grade': r['metadata']['grade'],
                'source': r['metadata']['source']
            }
            for r in results
        ]
        
        return {
            'response': response,
            'sources': sources
        }
```

---

## 🧪 Testing

### Test Vector Store

```python
from app.services.rag.vector_store import VectorStore

# Initialize
vs = VectorStore()

# Add test document
vs.add_documents(
    texts=["Photosynthesis is the process by which plants make food."],
    metadatas=[{'subject': 'biology', 'grade': 8}],
    ids=['test-1']
)

# Search
results = vs.search("How do plants make food?")
print(results)
```

### Test Document Ingestion

```bash
cd backend
python -m app.utils.ingest_documents
```

### Test AI Tutor

```python
from app.services.ai_tutor.tutor_service import AITutorService

tutor = AITutorService()
response = tutor.get_response("What is photosynthesis?")
print(response['response'])
print(response['sources'])
```

---

## 📊 System Requirements

### Minimum:
- **RAM:** 8GB (for llama2 7B)
- **Storage:** 10GB (model + documents)
- **CPU:** 4 cores

### Recommended:
- **RAM:** 16GB (for better performance)
- **Storage:** 20GB
- **GPU:** NVIDIA GPU with CUDA (optional, 10x faster)

### Model Sizes:
- **llama2 7B:** ~4GB RAM
- **mistral 7B:** ~4GB RAM
- **llama2 13B:** ~8GB RAM

---

## 🚀 Performance Tips

1. **Use GPU if available:**
   ```bash
   # Ollama automatically uses GPU if available
   # Check: nvidia-smi
   ```

2. **Adjust chunk size:**
   - Smaller chunks (300-500): More precise, slower
   - Larger chunks (800-1000): Faster, less precise

3. **Tune top_k:**
   - More results (5-7): Better context, slower
   - Fewer results (2-3): Faster, may miss info

4. **Use smaller model for testing:**
   ```bash
   ollama pull tinyllama  # Only 1.1GB
   ```

---

## 🎯 Next Steps

1. **Install Ollama and download model**
2. **Install Python dependencies**
3. **Place NCTB PDFs in data directory**
4. **Run ingestion script**
5. **Test AI tutor service**
6. **Build chat API endpoints**
7. **Create frontend interface**

---

**Ready to start?** Follow the steps above and you'll have a fully local AI tutoring system! 🚀
