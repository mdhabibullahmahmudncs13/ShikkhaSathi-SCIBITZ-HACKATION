#!/bin/bash

# Start WebSocket Server with HTTPS Support
# This script starts the WebSocket signaling server with SSL certificates

echo "🚀 Starting WebSocket Signaling Server with HTTPS Support..."
echo ""

# Check if SSL certificates exist
if [ ! -f "frontend/certs/cert.pem" ] || [ ! -f "frontend/certs/key.pem" ]; then
    echo "❌ SSL certificates not found!"
    echo "Please run setup-https-dev.sh first to generate certificates."
    exit 1
fi

echo "✅ SSL certificates found"
echo "📁 Certificate: frontend/certs/cert.pem"
echo "🔑 Private Key: frontend/certs/key.pem"
echo ""

# Start the WebSocket server
echo "🌐 Starting WebSocket server on wss://0.0.0.0:8001..."
cd backend
python websocket_server.py

echo ""
echo "🎯 WebSocket server started successfully!"
echo ""
echo "🔗 Connection URLs:"
echo "   • Local:   wss://localhost:8001"
echo "   • Network: wss://192.168.0.109:8001"
echo ""
echo "📋 Usage:"
echo "   • Frontend will automatically connect to secure WebSocket"
echo "   • Supports real-time video conferencing signaling"
echo "   • Health check: wss://192.168.0.109:8001/health"
echo ""
echo "⚠️  Note: Accept certificate warnings in browser for self-signed certificates"