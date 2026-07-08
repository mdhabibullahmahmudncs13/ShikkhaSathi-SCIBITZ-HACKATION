#!/bin/bash

echo "🌐 ShikkhaSathi Network Access Status"
echo "========================================"
echo ""

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "📍 Your Local IP: $LOCAL_IP"
echo ""

# Check backend
echo "🔧 Backend Status:"
if lsof -i :8000 > /dev/null 2>&1; then
    echo "   ✅ Backend running on port 8000"
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "   ✅ Backend responding to requests"
    else
        echo "   ⚠️  Backend not responding"
    fi
else
    echo "   ❌ Backend not running"
fi
echo ""

# Check frontend
echo "🎨 Frontend Status:"
if lsof -i :5174 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on port 5174"
elif lsof -i :5173 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on port 5173"
else
    echo "   ❌ Frontend not running"
fi
echo ""

# Network access URLs
echo "📱 Access from any device on your network:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Frontend (Main App):"
if lsof -i :5174 > /dev/null 2>&1; then
    echo "   🌐 http://$LOCAL_IP:5174"
elif lsof -i :5173 > /dev/null 2>&1; then
    echo "   🌐 http://$LOCAL_IP:5173"
fi
echo ""
echo "Backend API:"
echo "   🌐 http://$LOCAL_IP:8000"
echo "   📖 API Docs: http://$LOCAL_IP:8000/docs"
echo ""

# Instructions
echo "💡 How to access from other devices:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Make sure your device is on the same WiFi network"
echo "2. Open a web browser on any device"
echo "3. Enter the Frontend URL above"
echo "4. Start learning!"
echo ""

# Firewall check
echo "🔥 Firewall Status:"
if command -v ufw > /dev/null 2>&1; then
    if sudo ufw status 2>/dev/null | grep -q "Status: active"; then
        echo "   ⚠️  UFW firewall is active"
        echo "   Run: sudo ufw allow 8000"
        echo "   Run: sudo ufw allow 5174"
    else
        echo "   ✅ UFW firewall not blocking"
    fi
elif command -v firewall-cmd > /dev/null 2>&1; then
    echo "   ℹ️  Firewalld detected (check if ports are open)"
else
    echo "   ✅ No common firewall detected"
fi
echo ""

# Test connectivity
echo "🧪 Testing Network Connectivity:"
if curl -s --max-time 2 http://$LOCAL_IP:8000/health > /dev/null 2>&1; then
    echo "   ✅ Backend accessible from network"
else
    echo "   ⚠️  Backend may not be accessible from network"
    echo "   Check firewall settings"
fi
echo ""

echo "✨ ShikkhaSathi is ready for network access!"
echo ""
