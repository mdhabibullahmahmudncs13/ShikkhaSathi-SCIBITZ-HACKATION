#!/bin/bash

# Alternative database startup script using docker compose (v2 syntax)
echo "Starting database services with Docker Compose v2..."

# Try docker compose (v2) first
if docker compose version &> /dev/null; then
    echo "Using Docker Compose v2..."
    docker compose up -d postgres mongodb redis
else
    # Fallback to docker-compose (v1)
    echo "Using Docker Compose v1..."
    docker-compose up -d postgres mongodb redis
fi

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "Checking service status..."
if docker compose version &> /dev/null; then
    docker compose ps
else
    docker-compose ps
fi

echo ""
echo "✅ Database services started!"
echo "PostgreSQL: localhost:5432"
echo "MongoDB: localhost:27017"
echo "Redis: localhost:6379"
echo ""
echo "To start the backend: cd backend && python3 run.py"
echo "To start the frontend: cd frontend && npm run dev"
