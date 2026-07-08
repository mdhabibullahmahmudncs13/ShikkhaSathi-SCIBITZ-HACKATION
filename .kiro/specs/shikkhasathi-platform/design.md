# ShikkhaSathi Platform Design Document

## Overview

ShikkhaSathi is a comprehensive AI-powered adaptive learning platform designed specifically for the Bangladesh education system. The platform leverages RAG (Retrieval-Augmented Generation) technology with NCTB curriculum content to provide personalized learning experiences for 50M+ students. The system architecture follows a microservices approach with offline-first PWA capabilities to ensure accessibility in rural areas with limited internet connectivity.

The platform consists of three main user interfaces (Student, Teacher, Parent), a sophisticated AI tutoring system, adaptive assessment engine, and comprehensive analytics dashboard. The system is designed to reduce the current 35% SSC failure rate and 70% EdTech abandonment rate through personalized learning paths and gamification.

## Architecture

### High-Level Architecture

The system follows a distributed microservices architecture with the following key components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Student PWA   │    │  Teacher Web    │    │  Parent Portal  │
│   (React TS)    │    │   (React TS)    │    │   (React TS)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (FastAPI)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   RAG Service   │    │  Quiz Service   │    │ Analytics Svc   │
│   (LangChain)   │    │   (FastAPI)     │    │   (FastAPI)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │ Gamification    │              │
         │              │   Service       │              │
         │              └─────────────────┘              │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Data Layer     │
                    │ PostgreSQL +    │
                    │ MongoDB + Redis │
                    │ + Pinecone      │
                    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript for type safety and modern development
- Tailwind CSS for utility-first styling and responsive design
- PWA with Service Workers for offline functionality
- IndexedDB with Dexie.js for local data storage
- Framer Motion for smooth animations and transitions

**Backend:**
- FastAPI (Python) for high-performance API development
- PostgreSQL for structured relational data
- MongoDB for document storage (lesson content, user profiles)
- Redis for caching and session management
- JWT for secure authentication

**AI/ML Stack:**
- LangChain for RAG orchestration and prompt management
- OpenAI GPT-4 for natural language generation
- Pinecone for vector database and semantic search
- OpenAI text-embedding-3-large for text embeddings
- Whisper API for Bangla speech-to-text
- ElevenLabs for natural Bangla text-to-speech

## Components and Interfaces

### 1. RAG System Components

**Document Processing Pipeline:**
- PDF text extraction using PyPDF2/pdfplumber
- OCR processing with Tesseract for Bangla text
- Intelligent text chunking (500-1000 tokens with 100-200 overlap)
- Metadata enrichment (subject, grade, chapter, topic)

**Vector Storage and Retrieval:**
- Pinecone vector database with 1536-dimensional embeddings
- Namespace organization by subject and grade level
- Metadata filtering for precise content retrieval
- Cosine similarity search with configurable top-k results

**Query Processing Interface:**
```python
class RAGQueryInterface:
    def process_query(
        self, 
        question: str, 
        user_context: UserContext, 
        filters: Dict[str, Any]
    ) -> RAGResponse:
        """Process student query and return AI-generated response"""
        pass
    
    def generate_embeddings(self, text: str) -> List[float]:
        """Generate vector embeddings for text content"""
        pass
    
    def retrieve_context(
        self, 
        query_embedding: List[float], 
        filters: Dict[str, Any]
    ) -> List[DocumentChunk]:
        """Retrieve relevant document chunks from vector database"""
        pass
```

### 2. Adaptive Quiz Engine

**Question Generation Service:**
```python
class QuizGenerationInterface:
    def generate_questions(
        self,
        topic: str,
        difficulty_level: int,
        bloom_level: int,
        count: int
    ) -> List[Question]:
        """Generate adaptive questions based on topic and difficulty"""
        pass
    
    def calculate_next_difficulty(
        self,
        current_difficulty: int,
        performance_history: List[QuizAttempt]
    ) -> int:
        """Calculate optimal difficulty for next quiz"""
        pass
```

**Difficulty Adaptation Algorithm:**
- Performance tracking per topic and Bloom's taxonomy level
- Dynamic difficulty adjustment: >80% score increases difficulty, <50% decreases
- Target success rate maintained at 60-70% for optimal challenge
- Spaced repetition integration for long-term retention

### 3. Student Dashboard Interface

**Progress Tracking Components:**
```typescript
interface StudentProgress {
  userId: string;
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  subjectProgress: SubjectProgress[];
  achievements: Achievement[];
  weakAreas: WeakArea[];
  recommendedPath: LearningPath;
}

interface SubjectProgress {
  subject: string;
  completionPercentage: number;
  bloomLevelProgress: BloomProgress[];
  timeSpent: number;
  lastAccessed: Date;
}
```

### 4. Gamification System

**XP and Leveling Mechanics:**
- Activity-based XP rewards: lesson completion (50 XP), quiz completion (100 XP), daily login (10 XP)
- Level calculation: `level = floor(sqrt(total_xp / 100))`
- Achievement system with 50+ predefined achievements
- Streak tracking with freeze functionality (2 per month)

**Leaderboard System:**
- Multiple leaderboard types: global, class, school, friends, subject-specific
- Time-based filtering: weekly, monthly, all-time
- Privacy controls and opt-out mechanisms

## Data Models

### Core Data Entities

**User Model:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    grade INTEGER CHECK (grade BETWEEN 6 AND 12),
    medium VARCHAR(10) CHECK (medium IN ('bangla', 'english')),
    role VARCHAR(20) CHECK (role IN ('student', 'teacher', 'parent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

**Student Progress Model:**
```sql
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    bloom_level INTEGER CHECK (bloom_level BETWEEN 1 AND 6),
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mastery_level VARCHAR(20) DEFAULT 'beginner'
);
```

**Quiz Attempts Model:**
```sql
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    quiz_id UUID NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    time_taken_seconds INTEGER NOT NULL,
    difficulty_level INTEGER NOT NULL,
    bloom_level INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answers JSONB NOT NULL
);
```

**Gamification Model:**
```sql
CREATE TABLE gamification (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    achievements JSONB DEFAULT '[]',
    last_activity_date DATE DEFAULT CURRENT_DATE,
    streak_freeze_count INTEGER DEFAULT 0
);
```

**Learning Path Model:**
```sql
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    subject VARCHAR(50) NOT NULL,
    topics JSONB NOT NULL,
    current_topic VARCHAR(100),
    recommended_next_topics JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Document Storage (MongoDB)

**NCTB Content Documents:**
```javascript
{
  _id: ObjectId,
  content_id: "physics_9_ch3_001",
  text: "নিউটনের গতির প্রথম সূত্র...",
  metadata: {
    subject: "Physics",
    grade: 9,
    chapter: 3,
    topic: "Newton's Laws",
    language: "bangla",
    page_number: 45,
    textbook_name: "Physics for Class IX"
  },
  embedding_id: "pinecone_vector_id",
  created_at: ISODate,
  updated_at: ISODate
}
```

**Chat History Documents:**
```javascript
{
  _id: ObjectId,
  user_id: "uuid",
  session_id: "uuid",
  messages: [
    {
      role: "user",
      content: "নিউটনের প্রথম সূত্র কী?",
      timestamp: ISODate,
      voice_input: true
    },
    {
      role: "assistant", 
      content: "নিউটনের প্রথম সূত্র...",
      sources: ["physics_9_ch3_001"],
      timestamp: ISODate
    }
  ],
  created_at: ISODate,
  updated_at: ISODate
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- RAG response properties (1.1, 1.2, 1.4) can be combined into comprehensive response validation
- Dashboard display properties (3.1, 3.2) can be merged into complete dashboard validation  
- Voice system properties (5.1, 5.2, 5.3, 5.4, 5.5) can be consolidated into voice processing validation
- Teacher analytics properties (6.1, 6.3) can be combined into comprehensive analytics validation
- Parent portal properties (7.1, 7.2) can be merged into complete parent data validation

### Core Properties

**Property 1: RAG Response Completeness and Quality**
*For any* student question in Bangla or English, the RAG system response should contain contextually appropriate NCTB content, Bangladesh-specific examples, proper source citations, and be in the same language as the input
**Validates: Requirements 1.1, 1.2, 1.4, 1.5**

**Property 2: Conversation Context Preservation**
*For any* sequence of follow-up questions, the RAG system should maintain context from the last 3 messages and provide coherent responses that reference previous conversation elements
**Validates: Requirements 1.3**

**Property 3: Adaptive Difficulty Adjustment**
*For any* quiz performance above 80%, the next quiz difficulty should increase, and for any performance below 50%, the difficulty should decrease with foundational content provided
**Validates: Requirements 2.1, 2.2**

**Property 4: Bloom Level Question Generation**
*For any* student performance history, generated quiz questions should match the appropriate Bloom's taxonomy level based on the student's demonstrated capabilities
**Validates: Requirements 2.3**

**Property 5: Quiz Feedback Completeness**
*For any* completed quiz, immediate feedback should be provided containing correct answers, detailed explanations, and performance analysis
**Validates: Requirements 2.4**

**Property 6: Adaptive Success Rate Convergence**
*For any* student's quiz sequence over time, the adaptive engine should maintain success rates between 60-70% through appropriate difficulty adjustments
**Validates: Requirements 2.5**

**Property 7: Dashboard Data Completeness**
*For any* student login, the dashboard should display all required elements: current XP, level, learning streak, subject-wise progress, visual indicators, and progress bars
**Validates: Requirements 3.1, 3.2**

**Property 8: XP and Achievement System Consistency**
*For any* learning activity completion, the gamification system should award correct XP amounts and update achievement status according to predefined rules
**Validates: Requirements 3.3**

**Property 9: Personalized Recommendation Generation**
*For any* student's performance data, the dashboard should generate relevant learning path recommendations based on identified strengths and weaknesses
**Validates: Requirements 3.4**

**Property 10: Offline Content Accessibility**
*For any* previously downloaded content, the PWA should provide full access when internet connectivity is unavailable
**Validates: Requirements 4.1**

**Property 11: Offline Quiz Persistence**
*For any* quiz taken while offline, the attempt should be saved locally and remain accessible until connectivity is restored
**Validates: Requirements 4.2**

**Property 12: Offline-Online Data Synchronization**
*For any* offline data (quiz attempts, progress), when connectivity returns, all data should be automatically synchronized to the server without loss
**Validates: Requirements 4.3**

**Property 13: Content Download Functionality**
*For any* selected subjects or topics, the PWA should successfully download and make content available for offline access
**Validates: Requirements 4.4**

**Property 14: Offline State Indication**
*For any* offline operation, the platform should display clear offline indicators and properly limit functionality to available features
**Validates: Requirements 4.5**

**Property 15: Voice Processing Accuracy and Completeness**
*For any* Bangla or English speech input, the voice system should convert to text with >90% accuracy, provide audio visualization, generate natural speech output, and include all player controls
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

**Property 16: Teacher Analytics Completeness**
*For any* teacher accessing student data, the dashboard should display complete class performance overview, individual analytics, weakness patterns, and intervention recommendations
**Validates: Requirements 6.1, 6.2, 6.3**

**Property 17: Teacher Assessment Tools**
*For any* teacher creating assessments, the system should generate custom quizzes using AI tools and enable student grouping based on performance levels
**Validates: Requirements 6.4, 6.5**

**Property 18: Parent Portal Data Completeness**
*For any* parent accessing their child's data, the portal should display progress overview, weekly summaries, learning time tracking, and subject-wise performance
**Validates: Requirements 7.1, 7.2**

**Property 19: Parent Notification System**
*For any* achievement unlocked by a student, the system should automatically send notifications to parents with accomplishment details
**Validates: Requirements 7.3**

**Property 20: Parent Report Generation**
*For any* reporting period, the system should generate weekly progress summaries with insights, recommendations, and privacy-protected comparative data
**Validates: Requirements 7.4, 7.5**

## Error Handling

### RAG System Error Handling
- **Query Processing Failures**: Implement fallback responses when vector search fails or no relevant content is found
- **API Rate Limiting**: Handle OpenAI API rate limits with exponential backoff and request queuing
- **Language Detection Errors**: Default to Bangla if language detection fails, with user override options
- **Context Overflow**: Truncate conversation history intelligently when context window limits are reached

### Quiz System Error Handling
- **Question Generation Failures**: Maintain pre-generated question pools as fallback when AI generation fails
- **Difficulty Calculation Errors**: Use default difficulty levels when adaptation algorithm encounters edge cases
- **Performance Data Corruption**: Implement data validation and recovery mechanisms for student progress

### Offline System Error Handling
- **Sync Conflicts**: Implement conflict resolution strategies for data modified both online and offline
- **Storage Quota Exceeded**: Provide user controls for managing offline content and automatic cleanup
- **Partial Download Failures**: Resume interrupted downloads and validate content integrity

### Voice System Error Handling
- **Speech Recognition Failures**: Provide text input fallback when voice processing fails
- **Audio Generation Errors**: Fall back to text-only responses when TTS services are unavailable
- **Microphone Access Denied**: Gracefully handle permission denials with clear user guidance

### System-Wide Error Handling
- **Database Connection Failures**: Implement connection pooling and automatic retry mechanisms
- **Authentication Errors**: Provide clear error messages and account recovery options
- **Network Timeouts**: Implement progressive timeout strategies with user feedback

## Testing Strategy

### Dual Testing Approach

The ShikkhaSathi platform will implement both unit testing and property-based testing to ensure comprehensive coverage and correctness validation.

**Unit Testing Requirements:**
- Unit tests will verify specific examples, edge cases, and error conditions
- Focus on integration points between components (RAG system, quiz engine, gamification)
- Test concrete scenarios like specific quiz flows, dashboard rendering, and API endpoints
- Validate error handling and boundary conditions
- Use Jest and React Testing Library for frontend components
- Use pytest for backend services

**Property-Based Testing Requirements:**
- Property tests will verify universal properties across all inputs using Hypothesis (Python) and fast-check (TypeScript)
- Each property-based test will run a minimum of 100 iterations to ensure statistical confidence
- Tests will use smart generators that constrain inputs to valid domain spaces
- Each property-based test will include a comment explicitly referencing the design document property
- Format: `**Feature: shikkhasathi-platform, Property {number}: {property_text}**`
- Property tests will focus on core business logic and correctness guarantees

**Testing Framework Configuration:**
- **Python Backend**: Hypothesis for property-based testing with pytest integration
- **TypeScript Frontend**: fast-check for property-based testing with Jest integration
- **Integration Testing**: Playwright for end-to-end user journey testing
- **Performance Testing**: Artillery.js for load testing and response time validation

**Test Coverage Requirements:**
- Minimum 80% code coverage for all core functionality
- 100% coverage for critical paths (authentication, quiz scoring, progress tracking)
- Property-based tests for all 20 correctness properties defined above
- Unit tests for component integration and error scenarios
- End-to-end tests for complete user workflows

### Specific Testing Strategies

**RAG System Testing:**
- Property tests for response quality and source citation accuracy
- Unit tests for embedding generation and vector search functionality
- Integration tests for complete query-to-response workflows
- Performance tests for response time under various loads

**Adaptive Quiz Testing:**
- Property tests for difficulty adjustment algorithms and Bloom level assignment
- Unit tests for question generation and scoring logic
- Integration tests for complete quiz-taking workflows
- A/B testing for optimization of success rate targets

**Gamification Testing:**
- Property tests for XP calculation and achievement unlocking logic
- Unit tests for streak tracking and leaderboard calculations
- Integration tests for real-time updates and notifications

**Offline Functionality Testing:**
- Property tests for data synchronization and conflict resolution
- Unit tests for local storage operations and cache management
- Integration tests for offline-to-online transition scenarios
- Network simulation tests for various connectivity conditions

**Voice System Testing:**
- Property tests for speech recognition accuracy across different accents
- Unit tests for audio processing and TTS generation
- Integration tests for complete voice interaction workflows
- Accessibility tests for voice-only navigation