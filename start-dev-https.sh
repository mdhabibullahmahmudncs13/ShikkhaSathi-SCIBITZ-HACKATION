#!/bin/bash

# Enhanced Development Startup Script for ShikkhaSathi
# Supports both HTTP and HTTPS modes with WebRTC compatibility

echo "🚀 Starting ShikkhaSathi Development Environment..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the ShikkhaSathi root directory"
    exit 1
fi

# Function to check if certificates exist
check_certificates() {
    if [ -f "frontend/certs/key.pem" ] && [ -f "frontend/certs/cert.pem" ]; then
        return 0
    else
        return 1
    fi
}

# Function to setup HTTPS certificates
setup_https() {
    echo "🔐 Setting up HTTPS certificates for WebRTC compatibility..."
    ./setup-https-dev.sh
}

# Check for HTTPS certificates
if ! check_certificates; then
    echo "📋 HTTPS certificates not found."
    echo "For full WebRTC functionality (camera/microphone), HTTPS is required."
    echo ""
    read -p "Would you like to setup HTTPS now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_https
    else
        echo "⚠️  Continuing with HTTP mode - WebRTC will be limited to audio-only"
    fi
fi

# Start databases
echo "🗄️  Starting databases..."
if [ -f "start-databases.sh" ]; then
    ./start-databases.sh
else
    docker-compose up -d postgres mongodb redis
fi

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 5

# Start backend
echo "🔧 Starting backend server..."
cd backend
if [ -f "run_dev.py" ]; then
    python run_dev.py &
    BACKEND_PID=$!
else
    echo "❌ Backend startup script not found"
    exit 1
fi

# Wait for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd ../frontend

# Check if HTTPS is available
if check_certificates; then
    echo "✅ HTTPS enabled - Full WebRTC functionality available"
    echo "🌐 Access URLs:"
    echo "   • Local:   https://localhost:5173"
    echo "   • Network: https://192.168.0.109:5173"
    echo "   • Note: Accept certificate warning in browser"
else
    echo "⚠️  HTTP mode - Limited WebRTC functionality"
    echo "🌐 Access URLs:"
    echo "   • Local:   http://localhost:5173 (WebRTC works)"
    echo "   • Network: http://192.168.0.109:5173 (Audio-only mode)"
fi

npm run dev

# Cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    docker-compose down
}

trap cleanup EXIT