#!/bin/bash

# Start frontend with HTTP only (no HTTPS) for network access
# This avoids mixed content issues when calling HTTP backend from HTTPS frontend

echo "🚀 Starting ShikkhaSathi Frontend (HTTP Mode)"
echo "=============================================="
echo ""
echo "📡 Network Access URLs:"
echo "   Local:   http://localhost:5174/"
echo "   Network: http://192.168.1.161:5174/"
echo ""
echo "⚠️  Note: Using HTTP to avoid mixed content issues with HTTP backend"
echo "🔒 For camera access, you may need to enable insecure localhost in Chrome:"
echo "   chrome://flags/#unsafely-treat-insecure-origin-as-secure"
echo "   Add: http://192.168.1.161:5174"
echo ""

cd frontend
npm run dev -- --port 5174 --host 0.0.0.0 --https false