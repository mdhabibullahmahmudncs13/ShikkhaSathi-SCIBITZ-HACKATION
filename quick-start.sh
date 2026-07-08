#!/bin/bash

# Quick start script for ShikkhaSathi development
# This script starts the application in development mode

set -e

echo "🎓 ShikkhaSathi - Quick Start (Development Mode)"
echo "==============================================="

# Check if Docker is available
if command -v docker &> /dev/null && (docker compose version &> /dev/null || docker-compose --version &> /dev/null); then
    echo "🐳 Docker detected - Starting with Docker..."
    
    # Determine Docker Compose command
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
    
    # Start databases only
    echo "🗄️  Starting databases..."
    $DOCKER_COMPOSE up -d postgres mongodb redis chromadb
    
    # Wait for databases
    echo "⏳ Waiting for databases to be ready..."
    sleep 15
    
    echo "✅ Databases are ready!"
    echo ""
    echo "🚀 Now start the application services:"
    echo "   Backend: cd backend && python3 run_dev.py"
    echo "   WebSocket: cd backend && python3 websocket_server.py"
    echo "   Frontend: cd frontend && npm run dev"
    echo ""
    echo "🛑 To stop databases: $DOCKER_COMPOSE down"
    
else
    echo "🔧 Docker not available - Manual setup required"
    echo ""
    echo "Please install Docker or start services manually:"
    echo "1. Install PostgreSQL, MongoDB, Redis"
    echo "2. Start backend: cd backend && python3 run_dev.py"
    echo "3. Start WebSocket: cd backend && python3 websocket_server.py"
    echo "4. Start frontend: cd frontend && npm run dev"
fi

echo ""
echo "📋 Test Accounts:"
echo "   Student: student1@example.com / password123"
echo "   Teacher: teacher1@example.com / password123"
echo "   Parent: parent1@example.com / password123"
echo "   Admin: admin@example.com / password123"