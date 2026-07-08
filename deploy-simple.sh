#!/bin/bash

# Simple deployment script for ShikkhaSathi
# This script sets up and runs the entire application using Docker

set -e

echo "🎓 ShikkhaSathi - Simple Deployment Script"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Run: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Determine Docker Compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "✅ Docker and Docker Compose are available"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running in production!"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads backend/data backend/logs nginx/ssl nginx/logs

# Pull latest images
echo "📥 Pulling latest Docker images..."
$DOCKER_COMPOSE pull

# Build custom images
echo "🔨 Building application images..."
$DOCKER_COMPOSE build

# Start the application
echo "🚀 Starting ShikkhaSathi application..."
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
$DOCKER_COMPOSE ps

# Show service URLs
echo ""
echo "✅ ShikkhaSathi is now running!"
echo "================================"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "🔌 WebSocket: ws://localhost:8002"
echo "🗄️  Database Admin (Adminer): http://localhost:8080"
echo "🍃 MongoDB Admin: http://localhost:8081"
echo ""
echo "📋 Test Accounts:"
echo "   Student: student1@example.com / password123"
echo "   Teacher: teacher1@example.com / password123"
echo "   Parent: parent1@example.com / password123"
echo "   Admin: admin@example.com / password123"
echo ""
echo "🛑 To stop: $DOCKER_COMPOSE down"
echo "🔄 To restart: $DOCKER_COMPOSE restart"
echo "📊 To view logs: $DOCKER_COMPOSE logs -f [service_name]"
echo ""

# Check if AI models need to be downloaded
echo "🤖 Checking AI models..."
if $DOCKER_COMPOSE exec -T ollama ollama list | grep -q "llama3.2:1b"; then
    echo "✅ AI models are ready"
else
    echo "📥 Downloading AI models (this may take a while)..."
    $DOCKER_COMPOSE exec -T ollama ollama pull llama3.2:1b
    echo "✅ AI models downloaded"
fi

echo ""
echo "🎉 Deployment complete! ShikkhaSathi is ready to use."