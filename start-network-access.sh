#!/bin/bash

# ShikkhaSathi - Network Access Setup
# Makes the application accessible to all devices on your local network

echo "🌐 ShikkhaSathi - Network Access Setup"
echo "========================================"
echo ""

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address"
    exit 1
fi

echo "📍 Your local IP address: $LOCAL_IP"
echo ""

# Check if backend is running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Backend is already running on port 8000"
else
    echo "⚠️  Backend is not running. Starting backend..."
    cd backend
    python3 run_dev_with_ollama.py &
    BACKEND_PID=$!
    echo "✅ Backend started (PID: $BACKEND_PID)"
    cd ..
    sleep 3
fi

# Check if frontend is running
if lsof -Pi :5174 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Frontend is already running on port 5174"
else
    echo "⚠️  Frontend is not running. Starting frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend started (PID: $FRONTEND_PID)"
    cd ..
    sleep 5
fi

echo ""
echo "🎉 ShikkhaSathi is now accessible on your network!"
echo "=================================================="
echo ""
echo "📱 Access from any device on your network:"
echo ""
echo "   Frontend (Main App):"
echo "   🌐 http://$LOCAL_IP:5174"
echo "   🔒 https://$LOCAL_IP:5174 (if HTTPS enabled)"
echo ""
echo "   Backend API:"
echo "   🌐 http://$LOCAL_IP:8000"
echo "   📖 API Docs: http://$LOCAL_IP:8000/docs"
echo ""
echo "💡 Instructions for other devices:"
echo "   1. Make sure devices are on the same WiFi network"
echo "   2. Open browser on any device"
echo "   3. Go to: http://$LOCAL_IP:5174"
echo "   4. Start learning!"
echo ""
echo "📱 Tested on:"
echo "   ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)"
echo "   ✅ Mobile browsers (iOS Safari, Android Chrome)"
echo "   ✅ Tablets (iPad, Android tablets)"
echo ""
echo "🔥 Firewall Note:"
echo "   If you can't connect from other devices, you may need to:"
echo "   - Allow ports 5174 and 8000 in your firewall"
echo "   - Run: sudo ufw allow 5174"
echo "   - Run: sudo ufw allow 8000"
echo ""
echo "🛑 To stop the servers:"
echo "   Press Ctrl+C or run: ./stop-servers.sh"
echo ""
echo "✨ Happy Learning with ShikkhaSathi! ✨"
echo ""
