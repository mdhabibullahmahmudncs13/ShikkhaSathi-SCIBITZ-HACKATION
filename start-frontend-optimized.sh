#!/bin/bash
echo "🌐 Starting ShikkhaSathi Frontend (Optimized)..."

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start with optimized settings
echo "🚀 Starting Vite dev server on port 5174..."
npm run dev
