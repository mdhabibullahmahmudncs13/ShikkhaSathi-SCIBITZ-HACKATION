# 07 - Frontend Development Guide

**Complete Frontend Implementation Reference**

---

## 📖 Table of Contents

1. [Frontend Overview](#frontend-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [Routing](#routing)
7. [Styling](#styling)
8. [PWA Features](#pwa-features)
9. [Best Practices](#best-practices)

---

## 🎯 Frontend Overview

### Technology Stack

**Core Framework:**
- **React 18.2+** - UI library with hooks
- **TypeScript 5.0+** - Type-safe JavaScript
- **Vite 4.0+** - Fast build tool

**UI & Styling:**
- **Tailwind CSS 3.3+** - Utility-first CSS
- **Headless UI** - Accessible components
- **Heroicons** - SVG icons

**Key Features:**
- Component-based architecture
- Type safety with TypeScript
- Responsive design
- PWA capabilities
- Offline-first approach

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── quiz/
│   │   │   ├── QuizSelection.tsx
│   │   │   ├── QuizInterface.tsx
│   │   │   └── QuizResults.tsx
│   │   ├── dashboard/
│   │   │   ├── ProgressCard.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   └── ActivityFeed.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   ├── pages/
│   │   ├── StudentDashboard.tsx
│   │   ├── QuizPage.tsx
│   │   ├── AITutorChat.tsx
│   │   └── LoginPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAPI.ts
│   │   └── useQuiz.ts
│   ├── services/
│   │   ├── apiClient.ts
│   │   ├── authService.ts
│   │   └── quizService.ts
│   ├── types/
│   │   ├── user.ts
│   │   ├── quiz.ts
│   │   └── api.ts
│   └── utils/
│       ├── apiUrl.ts
│       └── helpers.ts
├── public/
│   ├── manifest.json
│   └── service-worker.js
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 🧩 Core Components

### App Component (App.tsx)


```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import QuizPage from './pages/QuizPage';
import AITutorChat from './pages/AITutorChat';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected routes */}
          <Route path="/" element={<PrivateRoute />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/chat" element={<AITutorChat />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
```

### Dashboard Component

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAPI } from '../hooks/useAPI';
import ProgressCard from '../components/dashboard/ProgressCard';
import StatsCard from '../components/dashboard/StatsCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';

interface DashboardData {
  xp: number;
  level: number;
  streak: number;
  recentQuizzes: Quiz[];
  achievements: Achievement[];
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { get } = useAPI();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await get('/api/v1/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.full_name}!
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="XP & Level"
            value={`Level ${data?.level}`}
            subtitle={`${data?.xp} XP`}
            icon="⚡"
          />
          <StatsCard
            title="Current Streak"
            value={`${data?.streak} days`}
            subtitle="Keep it up!"
            icon="🔥"
          />
          <StatsCard
            title="Quizzes This Week"
            value={data?.recentQuizzes.length}
            subtitle="Great progress"
            icon="📝"
          />
        </div>

        {/* Progress Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProgressCard data={data} />
          <ActivityFeed activities={data?.recentQuizzes} />
        </div>
      </main>
    </div>
  );
}
```

### Quiz Component

```typescript
import { useState, useEffect } from 'react';
import { useAPI } from '../hooks/useAPI';
import QuizSelection from '../components/quiz/QuizSelection';
import QuizInterface from '../components/quiz/QuizInterface';
import QuizResults from '../components/quiz/QuizResults';

type QuizState = 'selection' | 'taking' | 'results';

export default function QuizPage() {
  const { post } = useAPI();
  const [state, setState] = useState<QuizState>('selection');
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState(null);

  const handleStartQuiz = async (params: QuizParams) => {
    try {
      const response = await post('/api/v1/quiz/generate', params);
      setQuiz(response.data);
      setState('taking');
    } catch (error) {
      console.error('Failed to generate quiz:', error);
    }
  };

  const handleSubmitQuiz = async (answers: Record<string, string>) => {
    try {
      const response = await post('/api/v1/quiz/submit', {
        quiz_id: quiz.quiz_id,
        answers
      });
      setResults(response.data);
      setState('results');
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  const handleRetry = () => {
    setState('selection');
    setQuiz(null);
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {state === 'selection' && (
          <QuizSelection onStart={handleStartQuiz} />
        )}
        
        {state === 'taking' && quiz && (
          <QuizInterface
            quiz={quiz}
            onSubmit={handleSubmitQuiz}
          />
        )}
        
        {state === 'results' && results && (
          <QuizResults
            results={results}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  );
}
```

---

## 🔄 State Management

### Auth Context

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { token, user } = await authService.login(email, password);
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Custom Hooks

```typescript
// useAPI.ts - API interaction hook
import { useState } from 'react';
import { apiClient } from '../services/apiClient';

export function useAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const get = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(url);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const post = async (url: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(url, data);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { get, post, loading, error };
}

// useQuiz.ts - Quiz state management
import { useState } from 'react';

export function useQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);

  const selectAnswer = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const nextQuestion = () => {
    setCurrentQuestion(prev => prev + 1);
  };

  const previousQuestion = () => {
    setCurrentQuestion(prev => Math.max(0, prev - 1));
  };

  return {
    currentQuestion,
    answers,
    timeRemaining,
    selectAnswer,
    nextQuestion,
    previousQuestion
  };
}
```

---

## 🌐 API Integration

### API Client

```typescript
// services/apiClient.ts
import axios from 'axios';
import { getApiUrl } from '../utils/apiUrl';

const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient };
```

### Service Layer

```typescript
// services/quizService.ts
import { apiClient } from './apiClient';

export const quizService = {
  async getSubjects() {
    const response = await apiClient.get('/api/v1/quiz/subjects');
    return response.data;
  },

  async getTopics(subject: string) {
    const response = await apiClient.get(`/api/v1/quiz/topics/${subject}`);
    return response.data;
  },

  async generateQuiz(params: QuizParams) {
    const response = await apiClient.post('/api/v1/quiz/generate', params);
    return response.data;
  },

  async submitQuiz(quizId: number, answers: Record<string, string>) {
    const response = await apiClient.post('/api/v1/quiz/submit', {
      quiz_id: quizId,
      answers
    });
    return response.data;
  },

  async getHistory() {
    const response = await apiClient.get('/api/v1/quiz/history');
    return response.data;
  }
};
```

---

## 🎨 Styling with Tailwind

### Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
```

### Component Styling

```typescript
// Reusable Button component
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors';
  
  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

---

## 📱 PWA Features

### Service Worker

```javascript
// public/service-worker.js
const CACHE_NAME = 'shikkhasathi-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/main.js',
  '/assets/main.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
```

### Manifest

```json
{
  "name": "ShikkhaSathi",
  "short_name": "ShikkhaSathi",
  "description": "AI-powered adaptive learning platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## ✅ Best Practices

### 1. Type Safety

```typescript
// Define clear interfaces
interface Quiz {
  quiz_id: number;
  questions: Question[];
  subject: string;
  topic: string;
}

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

// Use types in components
function QuizInterface({ quiz }: { quiz: Quiz }) {
  // TypeScript ensures type safety
}
```

### 2. Error Handling

```typescript
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <button onClick={() => setHasError(false)}>Try again</button>
      </div>
    );
  }

  return children;
}
```

### 3. Performance Optimization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive computations
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => /* expensive operation */);
  }, [data]);

  const handleClick = useCallback(() => {
    // Handle click
  }, []);

  return <div>{/* render */}</div>;
});
```

---

**Next:** [[08-AI-Integration]] - AI and RAG system implementation

**শিক্ষাসাথী** - Built with React & TypeScript 🇧🇩
