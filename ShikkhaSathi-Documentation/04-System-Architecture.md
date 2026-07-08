# 04 - System Architecture

**Technical Design & Architecture Patterns**

---

## 📖 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [System Components](#system-components)
4. [Data Flow](#data-flow)
5. [Design Patterns](#design-patterns)
6. [Security Architecture](#security-architecture)

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │    Mobile    │  │   Desktop    │      │
│  │   (React)    │  │     PWA      │  │     PWA      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/WSS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              FastAPI Backend (Python)                 │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │   │
│  │  │  Auth  │  │  Quiz  │  │   AI   │  │ WebRTC │    │   │
│  │  │ Service│  │Service │  │ Service│  │ Service│    │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │ MongoDB  │  │  Redis   │  │ ChromaDB │   │
│  │(Relational)│(Documents)│  │ (Cache)  │  │ (Vectors)│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         AI Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Ollama Models                      │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                │   │
│  │  │phi3:mini│ │llama3.2│  │llama3.2│                │   │
│  │  │ (Math) │  │  (3b)  │  │  (1b)  │                │   │
│  │  └────────┘  └────────┘  └────────┘                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns:** Clear boundaries between layers
2. **Scalability:** Horizontal scaling capability
3. **Offline-First:** PWA with local storage
4. **Security:** Authentication, authorization, encryption
5. **Performance:** Caching, async operations, optimization
6. **Maintainability:** Clean code, documentation, testing

---

## 🛠️ Technology Stack

### Frontend Stack

**Core Framework:**
- **React 18.2+** - UI library with hooks
- **TypeScript 5.0+** - Type-safe JavaScript
- **Vite 4.0+** - Fast build tool and dev server

**UI & Styling:**
- **Tailwind CSS 3.3+** - Utility-first CSS framework
- **Headless UI** - Accessible UI components
- **Heroicons** - Beautiful SVG icons

**State Management:**
- **React Context** - Global state
- **Custom Hooks** - Reusable logic
- **Local Storage** - Persistent state

**Data Fetching:**
- **Fetch API** - HTTP requests
- **WebSocket** - Real-time communication
- **IndexedDB** - Offline storage

**PWA Features:**
- **Service Workers** - Offline functionality
- **Web App Manifest** - Installable app
- **Cache API** - Content caching

### Backend Stack

**Core Framework:**
- **FastAPI 0.104+** - Modern Python web framework
- **Python 3.9+** - Programming language
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation

**Databases:**
- **PostgreSQL 15+** - Relational database
- **MongoDB 6.0+** - Document database
- **Redis 7.0+** - In-memory cache
- **ChromaDB** - Vector database

**AI & ML:**
- **Ollama** - Local LLM runtime
- **LangChain** - LLM framework
- **ChromaDB** - Vector embeddings
- **Sentence Transformers** - Text embeddings

**Authentication:**
- **JWT** - JSON Web Tokens
- **bcrypt** - Password hashing
- **OAuth2** - Authorization framework

**Real-time:**
- **WebSocket** - Bidirectional communication
- **WebRTC** - Video/audio streaming
- **Socket.IO** - Real-time events

---

## 🧩 System Components

### Frontend Components

#### 1. Application Shell
```typescript
// Main app structure
App.tsx
├── Router
│   ├── Public Routes (Login, Signup)
│   ├── Student Routes (Dashboard, Quiz, Chat)
│   ├── Teacher Routes (Dashboard, Students, Classes)
│   └── Parent Routes (Dashboard, Children, Reports)
├── Navigation
├── Authentication Guard
└── Error Boundary
```

#### 2. Core Features
- **Authentication:** Login, signup, password reset
- **Dashboard:** Role-specific dashboards
- **Quiz System:** Quiz selection, taking, review
- **AI Chat:** Chat interface with AI tutor
- **Progress Tracking:** Charts, statistics, achievements
- **Live Classes:** Video conferencing interface

#### 3. Shared Components
- **Layout:** Header, sidebar, footer
- **Forms:** Input, select, textarea, validation
- **UI Elements:** Buttons, cards, modals, alerts
- **Charts:** Progress visualization
- **Loading States:** Skeletons, spinners

### Backend Components

#### 1. API Layer
```python
# API structure
backend/app/api/api_v1/
├── auth.py          # Authentication endpoints
├── users.py         # User management
├── quiz.py          # Quiz operations
├── chat.py          # AI tutor chat
├── dashboard.py     # Dashboard data
├── classes.py       # Live classes
└── websocket.py     # WebSocket connections
```

#### 2. Service Layer
```python
# Business logic
backend/app/services/
├── auth_service.py          # Authentication logic
├── quiz/
│   ├── quiz_service.py      # Quiz generation
│   └── grading_service.py   # Auto-grading
├── rag/
│   ├── rag_service.py       # RAG implementation
│   └── embeddings.py        # Vector embeddings
├── gamification_service.py  # XP, levels, achievements
└── websocket_manager.py     # WebSocket management
```

#### 3. Data Layer
```python
# Database models
backend/app/models/
├── user.py              # User, roles
├── quiz_attempt.py      # Quiz attempts
├── student_progress.py  # Progress tracking
├── gamification.py      # XP, achievements
└── learning_path.py     # Adaptive learning
```

---

## 🔄 Data Flow

### Authentication Flow

```
1. User enters credentials
   ↓
2. Frontend sends POST /api/v1/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Backend generates JWT token
   ↓
5. Frontend stores token in localStorage
   ↓
6. Frontend includes token in all requests
   ↓
7. Backend validates token on each request
```

### Quiz Generation Flow

```
1. Student selects subject, topic, difficulty
   ↓
2. Frontend sends POST /api/v1/quiz/generate
   ↓
3. Backend retrieves NCTB content from ChromaDB
   ↓
4. Backend sends prompt to Ollama (llama3.2:3b)
   ↓
5. Ollama generates questions from content
   ↓
6. Backend validates and formats questions
   ↓
7. Backend stores quiz in PostgreSQL
   ↓
8. Frontend displays quiz to student
```

### AI Chat Flow

```
1. Student types question
   ↓
2. Frontend sends POST /api/v1/chat/message
   ↓
3. Backend retrieves relevant context from ChromaDB (RAG)
   ↓
4. Backend constructs prompt with context
   ↓
5. Backend sends to appropriate Ollama model:
   - Math questions → phi3:mini
   - Bangla questions → llama3.2:3b
   - General questions → llama3.2:1b
   ↓
6. Ollama generates response
   ↓
7. Backend stores conversation in MongoDB
   ↓
8. Frontend displays response with streaming
```

### Progress Tracking Flow

```
1. Student completes quiz
   ↓
2. Backend calculates score and XP
   ↓
3. Backend updates student_progress table
   ↓
4. Backend checks for level up
   ↓
5. Backend checks for achievements
   ↓
6. Backend updates gamification table
   ↓
7. Backend sends notification if achievement unlocked
   ↓
8. Frontend updates dashboard with new data
```

---

## 🎨 Design Patterns

### Backend Patterns

#### 1. Layered Architecture
```
Presentation Layer (API endpoints)
        ↓
Business Logic Layer (Services)
        ↓
Data Access Layer (Models)
        ↓
Database Layer (PostgreSQL, MongoDB, Redis)
```

#### 2. Dependency Injection
```python
# Dependencies injected via FastAPI
@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return dashboard_service.get_data(current_user, db)
```

#### 3. Repository Pattern
```python
# Abstract database operations
class QuizRepository:
    def create(self, quiz: Quiz) -> Quiz:
        pass
    
    def get_by_id(self, quiz_id: int) -> Quiz:
        pass
    
    def get_by_user(self, user_id: int) -> List[Quiz]:
        pass
```

#### 4. Service Pattern
```python
# Business logic in services
class QuizService:
    def __init__(self, repo: QuizRepository, ai_service: AIService):
        self.repo = repo
        self.ai_service = ai_service
    
    def generate_quiz(self, params: QuizParams) -> Quiz:
        # Business logic here
        pass
```

### Frontend Patterns

#### 1. Component Composition
```typescript
// Compose smaller components
<Dashboard>
  <Header />
  <Sidebar>
    <Navigation />
  </Sidebar>
  <MainContent>
    <ProgressCard />
    <RecentActivity />
    <QuickActions />
  </MainContent>
</Dashboard>
```

#### 2. Custom Hooks
```typescript
// Reusable logic in hooks
function useQuiz(quizId: string) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchQuiz(quizId).then(setQuiz);
  }, [quizId]);
  
  return { quiz, loading };
}
```

#### 3. Context for State
```typescript
// Global state with context
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### 4. Service Layer
```typescript
// API calls in services
class QuizService {
  async generateQuiz(params: QuizParams): Promise<Quiz> {
    const response = await fetch('/api/v1/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    return response.json();
  }
}
```

---

## 🔒 Security Architecture

### Authentication & Authorization

**JWT Token Flow:**
```
1. User logs in with credentials
2. Server validates and generates JWT
3. JWT contains: user_id, role, expiration
4. Client stores JWT in localStorage
5. Client sends JWT in Authorization header
6. Server validates JWT on each request
7. Server checks user permissions
```

**Token Structure:**
```json
{
  "sub": "user_id",
  "role": "student",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Data Security

**Password Security:**
- Hashed with bcrypt (cost factor 12)
- Never stored in plain text
- Salted automatically

**Data Encryption:**
- HTTPS for all communications
- TLS 1.3 for WebSocket
- Encrypted database connections

**Input Validation:**
- Pydantic models validate all inputs
- SQL injection prevention (ORM)
- XSS prevention (sanitization)
- CSRF protection (tokens)

### API Security

**Rate Limiting:**
```python
# Limit requests per user
@limiter.limit("100/hour")
async def generate_quiz():
    pass
```

**CORS Configuration:**
```python
# Allow only specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📊 Database Architecture

### PostgreSQL Schema

**Core Tables:**
- `users` - User accounts and authentication
- `student_progress` - Learning progress tracking
- `quiz_attempts` - Quiz submissions and scores
- `gamification` - XP, levels, achievements
- `classes` - Live class information
- `assessments` - Teacher-created assessments

**Relationships:**
```
users (1) ──── (many) student_progress
users (1) ──── (many) quiz_attempts
users (1) ──── (many) gamification
users (many) ──── (many) classes
```

### MongoDB Collections

**Document Storage:**
- `chat_history` - AI tutor conversations
- `nctb_documents` - Textbook content
- `learning_materials` - Study resources
- `notifications` - User notifications

### Redis Cache

**Cached Data:**
- Session data (TTL: 24 hours)
- API responses (TTL: 5 minutes)
- User preferences (TTL: 1 hour)
- Leaderboard data (TTL: 10 minutes)

### ChromaDB Collections

**Vector Storage:**
- `nctb_embeddings` - Textbook embeddings
- `question_bank` - Question embeddings
- Similarity search for RAG

---

## 🚀 Performance Architecture

### Caching Strategy

**Multi-Level Caching:**
```
Browser Cache (Service Worker)
        ↓
Redis Cache (Server-side)
        ↓
Database Query Cache
        ↓
Database
```

### Async Operations

**FastAPI Async:**
```python
# Non-blocking I/O
async def get_dashboard(user_id: int):
    progress = await get_progress(user_id)
    quizzes = await get_quizzes(user_id)
    achievements = await get_achievements(user_id)
    return {progress, quizzes, achievements}
```

### Database Optimization

**Indexing:**
- Primary keys on all tables
- Foreign key indexes
- Composite indexes for common queries
- Full-text search indexes

**Query Optimization:**
- Eager loading for relationships
- Pagination for large datasets
- Query result caching
- Connection pooling

---

**Next:** [[05-Setup-Guide]] - Development environment setup

**শিক্ষাসাথী** - Built with modern architecture 🇧🇩
