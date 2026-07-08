#!/bin/bash

# ShikkhaSathi Development Environment Setup
# Optimized for fast startup and reliable operation

echo "🎓 ShikkhaSathi - Setting up optimized development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    print_error "Please run this script from the ShikkhaSathi root directory"
    exit 1
fi

# 1. Check system dependencies
print_info "Checking system dependencies..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_status "Python found: $PYTHON_VERSION"
else
    print_error "Python3 not found. Please install Python 3.8+ first."
    exit 1
fi

# Check Ollama
if command -v ollama &> /dev/null; then
    print_status "Ollama found"
else
    print_warning "Ollama not found. AI features will use fallback mode."
fi

# 2. Setup frontend dependencies
print_info "Setting up frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
else
    print_status "Frontend dependencies already installed"
fi
cd ..

# 3. Setup backend dependencies (using system packages where possible)
print_info "Setting up backend dependencies..."

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    print_info "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    
    # Install basic requirements
    pip install --upgrade pip
    pip install fastapi uvicorn sqlalchemy sqlite3 requests
    
    # Try to install AI dependencies (optional)
    print_info "Installing AI dependencies (optional)..."
    pip install transformers torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu || print_warning "AI dependencies failed, will use fallback mode"
    pip install langchain langchain-ollama langchain-chroma || print_warning "LangChain dependencies failed, will use fallback mode"
    pip install chromadb || print_warning "ChromaDB failed, will use fallback mode"
    pip install openai || print_warning "OpenAI failed, will use fallback mode"
    pip install whisper || print_warning "Whisper failed, will use fallback mode"
    
    deactivate
    cd ..
    print_status "Python virtual environment created"
else
    print_status "Python virtual environment already exists"
fi

# 4. Check database
print_info "Checking database setup..."
if [ -f "backend/dev_database.db" ]; then
    DB_SIZE=$(stat -f%z "backend/dev_database.db" 2>/dev/null || stat -c%s "backend/dev_database.db" 2>/dev/null)
    if [ "$DB_SIZE" -gt 1000 ]; then
        print_status "Database exists and has data ($DB_SIZE bytes)"
    else
        print_warning "Database exists but appears empty"
    fi
else
    print_info "Database will be created on first run"
fi

# 5. Check Ollama models
if command -v ollama &> /dev/null; then
    print_info "Checking Ollama models..."
    
    # Check if Ollama server is running
    if ! pgrep -f "ollama serve" > /dev/null; then
        print_info "Starting Ollama server..."
        ollama serve &
        sleep 3
    fi
    
    # Check for required models
    MODELS=$(ollama list 2>/dev/null | grep -E "(llama3.2|phi)" | wc -l)
    if [ "$MODELS" -ge 2 ]; then
        print_status "Required Ollama models found"
    else
        print_warning "Some Ollama models missing. AI will use fallback responses."
        print_info "To install models, run: ollama pull llama3.2:latest && ollama pull phi:latest"
    fi
fi

# 6. Create optimized startup script
print_info "Creating optimized startup script..."

cat > start-optimized.sh << 'EOF'
#!/bin/bash

# ShikkhaSathi Optimized Startup Script
echo "🚀 Starting ShikkhaSathi (Optimized Mode)..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Kill existing processes on our ports
print_info "Cleaning up existing processes..."
pkill -f "uvicorn.*8000" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "websocket_server" 2>/dev/null || true
sleep 2

# Start Ollama if available
if command -v ollama &> /dev/null; then
    if ! pgrep -f "ollama serve" > /dev/null; then
        print_info "Starting Ollama server..."
        ollama serve > /dev/null 2>&1 &
        sleep 2
    fi
    print_status "Ollama server running"
fi

# Start backend (optimized mode - skip heavy AI loading initially)
print_info "Starting backend server..."
cd backend

# Use virtual environment if available
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start with lightweight mode first
python3 run_dev.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Check if backend started successfully
if check_port 8000; then
    print_status "Backend server running on http://localhost:8000"
else
    print_info "Lightweight backend failed, trying AI-enhanced mode..."
    kill $BACKEND_PID 2>/dev/null || true
    python3 run_dev_with_ai.py > ../logs/backend-ai.log 2>&1 &
    sleep 5
    if check_port 8000; then
        print_status "AI-enhanced backend running on http://localhost:8000"
    else
        echo "❌ Backend failed to start. Check logs/backend*.log"
        exit 1
    fi
fi

cd ..

# Start WebSocket server
print_info "Starting WebSocket server..."
cd backend
python3 websocket_server.py > ../logs/websocket.log 2>&1 &
sleep 2
if check_port 8001; then
    print_status "WebSocket server running on ws://localhost:8001"
else
    echo "⚠️  WebSocket server failed to start"
fi
cd ..

# Start frontend
print_info "Starting frontend server..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
sleep 3
if check_port 5174; then
    print_status "Frontend server running on https://localhost:5174"
else
    echo "❌ Frontend failed to start. Check logs/frontend.log"
    exit 1
fi
cd ..

echo ""
echo "🎉 ShikkhaSathi is now running!"
echo ""
echo "📱 Frontend: https://localhost:5174"
echo "🔧 Backend API: http://localhost:8000"
echo "📡 WebSocket: ws://localhost:8001"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Logs are available in the logs/ directory"
echo "🛑 To stop all services, run: pkill -f 'uvicorn|npm run dev|websocket_server|ollama serve'"
echo ""
EOF

chmod +x start-optimized.sh

# 7. Create logs directory
mkdir -p logs

# 8. Create a lightweight backend runner (fallback)
print_info "Creating lightweight backend configuration..."

cat > backend/run_dev_lightweight.py << 'EOF'
#!/usr/bin/env python3
"""
Lightweight development server for ShikkhaSathi
Fast startup with minimal dependencies
"""

import sys
import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import random

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import development configuration
try:
    from app.core.config_dev import dev_settings
    from app.db.session_dev import create_tables
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    print("⚠️  Configuration not available, using minimal setup")

# Create FastAPI app
app = FastAPI(
    title="ShikkhaSathi Lightweight API",
    description="Fast-loading development server for ShikkhaSathi",
    version="1.0.0-lightweight",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
if CONFIG_AVAILABLE:
    cors_origins = dev_settings.BACKEND_CORS_ORIGINS
else:
    cors_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5173",
        "https://localhost:5174",
        "*"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting ShikkhaSathi Lightweight Server...")
    if CONFIG_AVAILABLE:
        try:
            create_tables()
            print("✅ Database initialized")
        except Exception as e:
            print(f"⚠️  Database initialization warning: {e}")
    print("🌐 Lightweight server ready!")

# Health check endpoints
@app.get("/")
async def root():
    return {
        "message": "ShikkhaSathi Lightweight API",
        "version": "1.0.0-lightweight",
        "status": "running",
        "mode": "lightweight",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mode": "lightweight"
    }

@app.get("/api/v1/health")
async def health_check_v1():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mode": "lightweight"
    }

# Mock authentication
@app.post("/api/v1/auth/login")
async def login(credentials: dict):
    email = credentials.get("email", "")
    password = credentials.get("password", "")
    
    # Simple mock authentication
    if email and password:
        return {
            "access_token": f"mock_token_{hash(email) % 10000}",
            "token_type": "bearer",
            "user": {
                "id": hash(email) % 1000,
                "email": email,
                "name": "Test User",
                "role": "student",
                "is_active": True
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

# Mock AI chat (lightweight)
@app.post("/api/v1/chat/chat")
async def ai_chat(request: dict):
    message = request.get("message", "")
    model_category = request.get("model_category", "general")
    ai_mode = request.get("ai_mode", "tutor")
    
    # Simple mock responses
    responses = {
        "bangla": f"আপনার প্রশ্ন '{message}' সম্পর্কে: এটি বাংলা ভাষা ও সাহিত্যের একটি গুরুত্বপূর্ণ বিষয়। আরও জানতে চাইলে নির্দিষ্ট প্রশ্ন করুন।",
        "math": f"For the math question '{message}': Let me help you solve this step by step. This is an important mathematical concept.",
        "general": f"Regarding '{message}': This is an interesting topic in science. Let me explain the key concepts clearly."
    }
    
    response_text = responses.get(model_category, responses["general"])
    
    return {
        "response": response_text,
        "session_id": request.get("session_id", "lightweight_session"),
        "message_id": f"msg_{random.randint(1000, 9999)}",
        "sources": ["Educational content"],
        "confidence": 0.8,
        "model": f"{model_category}-lightweight",
        "mode": "lightweight"
    }

# Mock dashboard endpoints
@app.get("/api/v1/connect/student/dashboard")
async def student_dashboard():
    return {
        "user": {"id": 1, "name": "Student", "role": "student"},
        "stats": {"total_xp": 500, "current_streak": 3, "completed_quizzes": 5},
        "recent_activities": [],
        "available_quizzes": [
            {"id": 1, "title": "Basic Math", "subject": "Mathematics"},
            {"id": 2, "title": "English Grammar", "subject": "English"}
        ]
    }

if __name__ == "__main__":
    print("🎓 ShikkhaSathi - Lightweight Development Server")
    uvicorn.run(
        "run_dev_lightweight:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
EOF

chmod +x backend/run_dev_lightweight.py

print_status "Development environment setup complete!"
print_info "To start the optimized server, run: ./start-optimized.sh"
print_info "For manual control, check the individual service scripts in logs/"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Run: ./start-optimized.sh"
echo "2. Open: https://localhost:5174"
echo "3. Check logs in: logs/ directory"
echo ""