#!/bin/bash

# Quick HTTPS Frontend Startup for Camera Access
echo "🚀 Starting ShikkhaSathi Frontend with HTTPS..."

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the ShikkhaSathi root directory"
    exit 1
fi

# Check if certificates exist
if [ ! -f "frontend/certs/key.pem" ] || [ ! -f "frontend/certs/cert.pem" ]; then
    echo "🔐 HTTPS certificates not found. Generating..."
    ./setup-https-dev.sh
fi

# Start frontend with HTTPS
echo "🎨 Starting frontend with HTTPS support..."
echo ""
echo "✅ HTTPS enabled - Full camera/microphone access available!"
echo "🌐 Access URLs:"
echo "   • Local:   https://localhost:5173"
echo "   • Network: https://192.168.0.109:5173"
echo ""
echo "📋 Next steps:"
echo "1. Open https://192.168.0.109:5173 in your browser"
echo "2. Click 'Advanced' → 'Proceed to 192.168.0.109 (unsafe)'"
echo "3. Allow camera and microphone permissions"
echo "4. Camera access should now work!"
echo ""

cd frontend
npm run dev