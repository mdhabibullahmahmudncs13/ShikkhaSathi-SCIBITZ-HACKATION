# Phase 4: AI Tutor & RAG System - Overview

**Status:** 📋 PLANNING COMPLETE - Ready to Start  
**Target Duration:** 3 weeks (December 28, 2024 - January 10, 2025)  
**Estimated Effort:** 51 hours

---

## 🎯 What We're Building

An intelligent AI tutoring system that helps students learn by:
- Answering questions using NCTB curriculum content
- Providing contextual, accurate responses
- Citing sources from official textbooks
- Supporting both Bangla and English
- Maintaining conversation history
- Awarding XP for learning engagement

---

## 🏗️ Architecture

```
Student Question
      ↓
Frontend Chat Interface
      ↓
Backend Chat API
      ↓
AI Tutor Service
      ↓
RAG System (Pinecone) ← NCTB Documents
      ↓
LangChain + OpenAI
      ↓
Response with Sources
      ↓
Frontend Display
```

---

## 📦 Components to Build

### Backend (4 major components):

1. **RAG System** (`backend/app/services/rag/`)
   - Vector database (Pinecone) integration
   - Document ingestion pipeline
   - Similarity search
   - Context retrieval

2. **AI Tutor Service** (`backend/app/services/ai_tutor/`)
   - LangChain integration
   - Conversation management
   - Language detection
   - Prompt engineering

3. **Chat API** (`backend/app/api/api_v1/endpoints/chat.py`)
   - Send message endpoint
   - Get history endpoint
   - Clear conversation endpoint
   - Session management

4. **Document Ingestion** (`backend/scripts/`)
   - PDF processing
   - Text chunking
   - Embedding generation
   - Batch upload to Pinecone

### Frontend (3 major components):

1. **Chat Interface** (`frontend/src/pages/AITutorChat.tsx`)
   - Message list with scrolling
   - User and AI message components
   - Input area with send button
   - Loading states

2. **Chat Features** (`frontend/src/components/chat/`)
   - Markdown rendering
   - Code syntax highlighting
   - Source citations
   - Copy functionality
   - Conversation sidebar

3. **API Integration** (`frontend/src/services/apiClient.ts`)
   - Chat API methods
   - Message state management
   - Error handling
   - Session management

---

## 🔑 Key Technologies

### AI & ML:
- **Ollama** - Local LLM runtime (llama2 or mistral)
- **ChromaDB** - Local vector database for semantic search
- **LangChain** - Framework for LLM applications
- **Sentence Transformers** - Local embeddings (all-MiniLM-L6-v2)

### Backend:
- **FastAPI** - Chat API endpoints
- **MongoDB** - Conversation history storage
- **Python** - Document processing

### Frontend:
- **React** - Chat interface
- **Markdown** - Message formatting
- **Syntax Highlighting** - Code display

---

## 📊 Task Breakdown

### Backend Tasks (32 hours):
- RAG System Setup: 8 hours
- AI Tutor Service: 10 hours
- Chat API Endpoints: 4 hours
- Document Ingestion: 6 hours
- Testing: 4 hours

### Frontend Tasks (17 hours):
- Chat Interface: 8 hours
- Chat Features: 6 hours
- API Integration: 3 hours

### Integration Tasks (2 hours):
- Dashboard connection: 2 hours

**Total Estimated Time:** 51 hours

---

## 🎨 User Experience Flow

1. **Student clicks "AI Tutor" on dashboard**
   - Opens chat interface
   - Sees welcome message
   - Can start typing immediately

2. **Student asks a question**
   - Types in Bangla or English
   - Presses Enter or clicks Send
   - Sees loading indicator

3. **AI responds**
   - Answer appears with typing animation
   - Source citations shown below
   - Can expand to see full source

4. **Student continues conversation**
   - Previous messages visible
   - Can scroll through history
   - Can start new conversation

5. **Student earns XP**
   - XP awarded for asking questions
   - XP awarded for learning sessions
   - Progress tracked on dashboard

---

## 🔐 Setup Required

Before starting Phase 4, you'll need:

1. **Install Ollama (Local LLM)**
   ```bash
   # Linux/Mac
   curl https://ollama.ai/install.sh | sh
   
   # Pull a model
   ollama pull llama2
   # Or for better performance:
   ollama pull mistral
   ```

2. **Install Python Dependencies**
   ```bash
   cd backend
   pip install chromadb sentence-transformers pypdf2 langchain ollama langchain-community
   ```

3. **NCTB Documents**
   - Collect curriculum PDFs
   - Store in `backend/data/nctb/`
   - Organize by subject and grade

**No API keys needed!** Everything runs locally on your machine.

---

## 📈 Success Metrics

### Performance:
- RAG retrieval: < 2 seconds
- AI response: < 5 seconds
- History load: < 1 second
- 100+ concurrent users

### Quality:
- Answer accuracy: > 85%
- Source relevance: > 90%
- Language detection: > 95%
- User satisfaction: > 4/5

### Engagement:
- Daily active users
- Questions per session
- Conversation length
- Return rate

---

## 🚀 Getting Started

### Step 1: Set Up API Keys
```bash
# Add to backend/.env
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=shikkhasathi-nctb
```

### Step 2: Install Dependencies
```bash
cd backend
pip install langchain openai pinecone-client tiktoken
```

### Step 3: Create Pinecone Index
```python
import pinecone
pinecone.init(api_key="...", environment="...")
pinecone.create_index("shikkhasathi-nctb", dimension=1536)
```

### Step 4: Ingest Documents
```bash
cd backend
python scripts/ingest_nctb_documents.py
```

### Step 5: Start Development
- Follow tasks in `phase4-tasks.md`
- Start with backend RAG system
- Then build AI Tutor service
- Finally create frontend interface

---

## 🎯 Phase 4 Deliverables

By the end of Phase 4, we'll have:

✅ **Functional AI Tutor**
- Students can ask questions
- AI provides accurate answers
- Sources are cited

✅ **RAG System**
- NCTB documents indexed
- Semantic search working
- Context retrieval optimized

✅ **Chat Interface**
- Clean, intuitive design
- Message history
- Markdown formatting
- Source citations

✅ **Integration**
- Connected to dashboard
- XP awards working
- Session management

✅ **Testing**
- Unit tests passing
- Integration tests passing
- Manual testing complete

---

## 🔜 After Phase 4

Once Phase 4 is complete, we'll move to:

**Phase 5: Voice Learning System**
- Add voice input (speech-to-text)
- Add voice output (text-to-speech)
- Support Bangla voice
- Integrate with AI Tutor

**Phase 6: Offline PWA**
- Service worker setup
- Offline content caching
- Background sync
- Push notifications

---

## 💡 Tips for Success

1. **Start Simple**
   - Begin with English-only
   - Use GPT-3.5-turbo initially
   - Add features incrementally

2. **Test Early**
   - Test RAG retrieval with sample questions
   - Verify source citations
   - Check language detection

3. **Monitor Costs**
   - Track OpenAI API usage
   - Implement rate limiting
   - Cache common queries

4. **Optimize Performance**
   - Use streaming responses
   - Implement caching
   - Optimize chunk size

5. **Focus on UX**
   - Fast response times
   - Clear error messages
   - Helpful source citations
   - Smooth animations

---

**Status:** Phase 4 planning complete ✅  
**Next Action:** Set up OpenAI and Pinecone API keys, then start Task 4.1 (RAG System Setup)

**Previous Phase:** Phase 3 (Quiz System) - Complete ✅  
**Current Phase:** Phase 4 (AI Tutor) - Ready to Start 📋  
**Next Phase:** Phase 5 (Voice Learning) - Planned 📝
