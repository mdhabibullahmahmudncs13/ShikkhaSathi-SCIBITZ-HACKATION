#!/bin/bash
echo "🔌 Starting ShikkhaSathi WebSocket Server (Optimized)..."

cd backend

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

echo "🚀 Starting WebSocket server on port 8001..."
python3 websocket_server.py
