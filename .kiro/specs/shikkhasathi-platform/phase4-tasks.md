# Phase 4: AI Tutor & RAG System - Task Tracker

## Status: READY TO START
**Target Duration:** Week 6-7 (December 28, 2024 - January 10, 2025)

---

## 🎯 Phase Objectives

Build an intelligent AI tutoring system that:
1. Retrieves relevant content from NCTB curriculum using RAG
2. Provides contextual answers with source citations
3. Maintains conversation history
4. Supports both Bangla and English
5. Integrates with the gamification system

---

## Backend Tasks

### 4.1 RAG System Setup ⏳ NOT STARTED
**Priority:** HIGH  
**Estimated Time:** 8 hours

- [ ] Set up local vector database (ChromaDB)
  - Install ChromaDB (persistent local storage)
  - Configure collection with appropriate settings
  - Set up connection in backend
  
- [ ] Set up local embedding model
  - Install sentence-transformers
  - Use all-MiniLM-L6-v2 (lightweight, fast)
  - Or use multilingual model for Bangla support
  - Test embedding generation
  
- [ ] Document ingestion pipeline
  - Create document loader for NCTB PDFs
  - Implement text chunking strategy (500-1000 tokens)
  - Generate embeddings using local model
  - Store embeddings in ChromaDB
  
- [ ] Similarity search implementation
  - Query embedding generation
  - Top-k retrieval from ChromaDB
  - Relevance scoring
  - Context formatting for LLM

**Files to Create:**
- `backend/app/services/rag/vector_store.py`
- `backend/app/services/rag/document_processor.py`
- `backend/app/services/rag/embeddings.py`
- `backend/app/utils/ingest_documents.py`

**Dependencies to Install:**
```bash
pip install chromadb sentence-transformers pypdf2 langchain
```

---

### 4.2 AI Tutor Service ⏳ NOT STARTED
**Priority:** HIGH  
**Estimated Time:** 10 hours

- [ ] Set up local LLM
  - Install Ollama (easiest option for local LLM)
  - Download model: `ollama pull llama2` or `mistral`
  - Or use llama-cpp-python for more control
  - Test model inference
  
- [ ] LangChain integration with local LLM
  - Configure LangChain with Ollama
  - Create prompt templates for tutoring
  - Implement conversation chain
  - Set temperature and max tokens
  
- [ ] Context retrieval logic
  - Query RAG system for relevant content
  - Format retrieved context for prompt
  - Handle cases with no relevant content
  - Extract source citations (page numbers, chapters)
  
- [ ] Conversation management
  - Store conversation history in MongoDB
  - Maintain last 3-5 messages for context
  - Clear old conversations
  - Session management
  
- [ ] Language support
  - Detect input language (Bangla/English)
  - Use multilingual model if needed
  - Respond in same language as input
  - Handle code-switching

**Files to Create:**
- `backend/app/services/ai_tutor/tutor_service.py`
- `backend/app/services/ai_tutor/prompt_templates.py`
- `backend/app/services/ai_tutor/conversation_manager.py`
- `backend/app/models/conversation.py`

**Local LLM Options:**
1. **Ollama** (Recommended - easiest)
   - Install: `curl https://ollama.ai/install.sh | sh`
   - Models: llama2, mistral, codellama
   - Usage: Simple API, automatic GPU support

2. **llama-cpp-python**
   - More control over model parameters
   - Can use GGUF models
   - Good for resource-constrained systems

3. **GPT4All**
   - User-friendly desktop app
   - Multiple model options
   - Python bindings available

**Dependencies to Install:**
```bash
pip install langchain ollama langchain-community
# Or for llama-cpp-python:
pip install llama-cpp-python
```

---

### 4.3 Chat API Endpoints ⏳ NOT STARTED
**Priority:** HIGH  
**Estimated Time:** 4 hours

- [ ] POST /api/v1/chat/message
  - Input: message, session_id (optional)
  - Output: response, sources[], session_id
  - Logic: Query RAG, generate response, save to history
  
- [ ] GET /api/v1/chat/history
  - Input: session_id, limit (optional)
  - Output: messages[] with timestamps
  - Logic: Retrieve from MongoDB
  
- [ ] DELETE /api/v1/chat/clear
  - Input: session_id
  - Output: success confirmation
  - Logic: Clear conversation history
  
- [ ] GET /api/v1/chat/sessions
  - Output: List of user's chat sessions
  - Logic: Get all sessions for current user

**Files to Create/Modify:**
- `backend/app/api/api_v1/endpoints/chat.py`
- `backend/app/schemas/chat.py`

---

## Frontend Tasks

### 4.4 AI Tutor Chat Interface ⏳ NOT STARTED
**Priority:** HIGH  
**Estimated Time:** 8 hours

- [ ] Create ChatPage component
  - Chat container layout
  - Message list with scrolling
  - Input area with send button
  - Session management
  
- [ ] Message components
  - UserMessage component
  - AIMessage component
  - Timestamp display
  - Source citations display
  - Loading indicator for AI response
  
- [ ] Input handling
  - Text input with multiline support
  - Send on Enter (Shift+Enter for new line)
  - Character limit indicator
  - Disable during AI response
  
- [ ] Language support
  - Auto-detect input language
  - Display language indicator
  - Support Bangla Unicode input

**Files to Create:**
- `frontend/src/pages/AITutorChat.tsx`
- `frontend/src/components/chat/ChatContainer.tsx`
- `frontend/src/components/chat/MessageList.tsx`
- `frontend/src/components/chat/UserMessage.tsx`
- `frontend/src/components/chat/AIMessage.tsx`
- `frontend/src/components/chat/ChatInput.tsx`
- `frontend/src/types/chat.ts`

---

### 4.5 Chat Features ⏳ NOT STARTED
**Priority:** MEDIUM  
**Estimated Time:** 6 hours

- [ ] Message formatting
  - Markdown rendering for AI responses
  - Code syntax highlighting
  - Math equation rendering (LaTeX)
  - Link detection and formatting
  
- [ ] Copy functionality
  - Copy message button
  - Copy code blocks
  - Toast notification on copy
  
- [ ] Conversation management
  - New conversation button
  - Conversation history sidebar
  - Delete conversation
  - Rename conversation
  
- [ ] Source citations
  - Expandable source cards
  - Link to original document
  - Highlight relevant sections
  - Page number display

**Files to Create:**
- `frontend/src/components/chat/MessageFormatter.tsx`
- `frontend/src/components/chat/SourceCitation.tsx`
- `frontend/src/components/chat/ConversationSidebar.tsx`
- `frontend/src/hooks/useChatState.ts`

---

### 4.6 Chat API Integration ⏳ NOT STARTED
**Priority:** HIGH  
**Estimated Time:** 3 hours

- [ ] Update API client
  - Add chat API methods
  - WebSocket connection for streaming (optional)
  - Error handling
  
- [ ] Create chat hook
  - useChatMessages hook
  - Message sending logic
  - History loading
  - Session management
  
- [ ] State management
  - Message state
  - Loading states
  - Error states
  - Session state

**Files to Modify:**
- `frontend/src/services/apiClient.ts`
- `frontend/src/hooks/useChatMessages.ts`

---

## Integration Tasks

### 4.7 Connect Dashboard to AI Tutor ⏳ NOT STARTED
**Priority:** MEDIUM  
**Estimated Time:** 2 hours

- [ ] Update "AI Tutor" button in StudentDashboard
  - Navigate to chat page
  - Create new session
  
- [ ] Add quick access
  - Floating chat button on dashboard
  - Quick question input
  - Recent conversations widget
  
- [ ] XP integration
  - Award XP for asking questions
  - Award XP for completing learning sessions
  - Track AI tutor usage

**Files to Modify:**
- `frontend/src/pages/StudentDashboard.tsx`
- `frontend/src/App.tsx`

---

### 4.8 Document Ingestion ⏳ NOT STARTED
**Priority:** HIGH  
**Estimated Time:** 6 hours

- [ ] Prepare NCTB documents
  - Collect NCTB curriculum PDFs
  - Organize by subject and grade
  - Clean and preprocess text
  
- [ ] Create ingestion script
  - PDF text extraction
  - Text chunking (500-1000 tokens)
  - Metadata extraction (subject, grade, chapter)
  - Batch processing
  
- [ ] Run ingestion
  - Generate embeddings
  - Upload to Pinecone
  - Verify data quality
  - Create index statistics

**Files to Create:**
- `backend/scripts/ingest_nctb_documents.py`
- `backend/data/nctb/` (document storage)

---

### 4.9 Testing & Validation ⏳ NOT STARTED
**Priority:** HIGH  
**Estimated Time:** 4 hours

- [ ] Backend unit tests
  - Test RAG retrieval accuracy
  - Test conversation management
  - Test language detection
  - Test source citation extraction
  
- [ ] Frontend component tests
  - Test message rendering
  - Test input handling
  - Test conversation switching
  - Test error states
  
- [ ] Integration tests
  - Test complete chat flow
  - Test RAG context retrieval
  - Test multi-turn conversations
  - Test language switching
  
- [ ] Manual testing
  - Ask questions in English
  - Ask questions in Bangla
  - Verify source citations
  - Test edge cases

**Files to Create:**
- `backend/tests/test_rag_system.py`
- `backend/tests/test_ai_tutor.py`
- `frontend/src/test/chat-interface.test.tsx`

---

## Success Criteria

### Functional Requirements:
- ✅ Students can ask questions in Bangla or English
- ✅ AI provides contextual answers from NCTB curriculum
- ✅ Source citations are displayed
- ✅ Conversation history is maintained
- ✅ XP awarded for AI tutor usage
- ✅ Responses are accurate and relevant

### Technical Requirements:
- ✅ RAG retrieval time < 2 seconds
- ✅ AI response time < 5 seconds
- ✅ Conversation history loads < 1 second
- ✅ Support for 100+ concurrent users
- ✅ All tests passing

### User Experience:
- ✅ Intuitive chat interface
- ✅ Clear source citations
- ✅ Smooth message flow
- ✅ Helpful error messages
- ✅ Responsive design

---

## Dependencies

### External:
- OpenAI API key (GPT-3.5-turbo or GPT-4)
- Pinecone account and API key
- NCTB curriculum documents (PDFs)
- LangChain library
- MongoDB for conversation storage

### Internal:
- Phase 3 completion (Quiz system) ✅
- Gamification service (XP awards) ✅
- Authentication system ✅
- MongoDB connection ✅

---

## Risk Mitigation

### Potential Risks:
1. **OpenAI API costs** → Monitor usage, implement rate limiting
2. **RAG accuracy** → Test with diverse questions, refine chunking strategy
3. **Language support** → Use language detection, test with native speakers
4. **Response time** → Implement caching, optimize retrieval
5. **Document quality** → Clean and preprocess NCTB documents carefully

---

## Timeline

### Week 1 (Dec 28-31):
- Day 1-2: RAG system setup and document ingestion
- Day 3-4: AI Tutor service implementation

### Week 2 (Jan 1-5):
- Day 1-2: Chat API endpoints
- Day 3-4: Frontend chat interface

### Week 3 (Jan 6-10):
- Day 1: Chat features and formatting
- Day 2: Integration and testing
- Day 3: Bug fixes and polish

---

## Notes

- Start with English-only support, add Bangla later
- Use GPT-3.5-turbo initially to control costs
- Implement streaming responses for better UX (optional)
- Consider adding voice input/output in Phase 5
- Plan for future features (homework help, exam prep)

---

**Status:** Ready to begin Phase 4 implementation
**Next Action:** Set up Pinecone and OpenAI API keys

