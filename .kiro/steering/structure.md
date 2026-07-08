# Project Structure & Organization

## Root Level Structure
```
ShikkhaSathi/
├── backend/           # FastAPI backend application
├── frontend/          # React TypeScript frontend
├── docker-compose.yml # Development database services
├── start-dev.sh       # Development environment setup script
└── README.md          # Project documentation
```

## Backend Structure (`backend/`)
```
backend/
├── app/
│   ├── api/           # API route definitions
│   │   └── api_v1/    # Version 1 API endpoints
│   ├── core/          # Core application configuration
│   │   ├── config.py      # Settings and environment variables
│   │   ├── deps.py        # Dependency injection
│   │   ├── security.py    # Authentication and security
│   │   └── error_handlers.py # Global exception handling
│   ├── db/            # Database connections and sessions
│   │   ├── session.py     # SQLAlchemy session management
│   │   ├── mongodb.py     # MongoDB connection
│   │   └── redis_client.py # Redis connection
│   ├── models/        # SQLAlchemy ORM models
│   │   ├── user.py        # User, roles, authentication
│   │   ├── assessment.py  # Teacher assessments and rubrics
│   │   ├── gamification.py # XP, achievements, streaks
│   │   ├── learning_path.py # Adaptive learning paths
│   │   ├── quiz_attempt.py # Quiz attempts and responses
│   │   └── student_progress.py # Progress tracking
│   ├── schemas/       # Pydantic models for API serialization
│   ├── services/      # Business logic layer
│   │   ├── auth_service.py # Authentication logic
│   │   ├── assessment_service.py # Assessment management
│   │   ├── gamification_service.py # XP and achievement logic
│   │   ├── quiz/      # Quiz generation and management
│   │   ├── rag/       # RAG system implementation
│   │   ├── voice_service.py # Voice processing
│   │   └── websocket_manager.py # Real-time communication
│   └── utils/         # Utility functions
├── alembic/           # Database migration files
├── tests/             # Property-based tests with hypothesis
├── requirements.txt   # Python dependencies
├── run.py            # Development server entry point
└── pytest.ini       # Test configuration
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── components/    # Reusable React components
│   │   ├── chat/      # AI tutor chat interface
│   │   ├── common/    # Shared UI components
│   │   ├── dashboard/ # Dashboard components
│   │   ├── parent/    # Parent portal components
│   │   ├── quiz/      # Quiz interface components
│   │   ├── teacher/   # Teacher dashboard components
│   │   └── sync/      # Offline sync components
│   ├── hooks/         # Custom React hooks
│   │   ├── useAPI.ts      # API interaction hook
│   │   ├── useQuizState.ts # Quiz state management
│   │   ├── useSyncManager.ts # Offline sync management
│   │   └── useWebSocket.ts # WebSocket connection
│   ├── pages/         # Top-level page components
│   │   ├── StudentDashboard.tsx
│   │   ├── TeacherDashboard.tsx
│   │   ├── ParentDashboard.tsx
│   │   ├── QuizPage.tsx
│   │   └── AITutorChat.tsx
│   ├── services/      # Business logic and API clients
│   │   ├── apiClient.ts   # HTTP client configuration
│   │   ├── offlineStorage.ts # IndexedDB management
│   │   ├── syncManager.ts # Offline/online sync
│   │   ├── cacheManager.ts # Content caching
│   │   └── serviceWorkerManager.ts # PWA functionality
│   ├── types/         # TypeScript type definitions
│   │   ├── quiz.ts    # Quiz-related types
│   │   ├── dashboard.ts # Dashboard data types
│   │   ├── teacher.ts # Teacher-specific types
│   │   └── parent.ts  # Parent portal types
│   └── test/          # Component and integration tests
├── public/            # Static assets
├── package.json       # Dependencies and scripts
├── vite.config.ts     # Vite build configuration
├── tailwind.config.js # Tailwind CSS configuration
└── tsconfig.json      # TypeScript configuration
```

## Key Architectural Patterns

### Backend Patterns
- **Layered Architecture**: API → Services → Models → Database
- **Dependency Injection**: Core dependencies managed in `deps.py`
- **Repository Pattern**: Database access abstracted through services
- **Error Handling**: Centralized exception handling in `error_handlers.py`
- **Configuration Management**: Environment-based settings in `config.py`

### Frontend Patterns
- **Component Composition**: Reusable components with clear separation
- **Custom Hooks**: Business logic extracted into reusable hooks
- **Service Layer**: API calls and business logic in services directory
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Offline-First**: PWA with service workers and IndexedDB storage

### Database Organization
- **PostgreSQL**: Structured data (users, assessments, progress)
- **MongoDB**: Unstructured data (chat history, documents, content)
- **Redis**: Temporary data (sessions, cache, real-time features)

### Testing Structure
- **Backend**: Property-based testing with hypothesis in `tests/`
- **Frontend**: Component testing with Vitest and React Testing Library in `src/test/`
- **Integration**: End-to-end scenarios testing offline functionality

## File Naming Conventions
- **Backend**: Snake_case for Python files and functions
- **Frontend**: PascalCase for components, camelCase for utilities
- **Database**: Snake_case for table and column names
- **API Endpoints**: Kebab-case in URLs, camelCase in JSON responses