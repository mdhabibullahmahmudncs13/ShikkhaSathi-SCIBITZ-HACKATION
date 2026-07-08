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
