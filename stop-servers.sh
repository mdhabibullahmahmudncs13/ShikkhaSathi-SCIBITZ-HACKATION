#!/bin/bash

# ShikkhaSathi - Stop All Servers

echo "🛑 Stopping ShikkhaSathi servers..."
echo ""

# Stop backend
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "Stopping backend (port 8000)..."
    kill $(lsof -t -i:8000) 2>/dev/null
    echo "✅ Backend stopped"
else
    echo "ℹ️  Backend was not running"
fi

# Stop frontend
if lsof -Pi :5174 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "Stopping frontend (port 5174)..."
    kill $(lsof -t -i:5174) 2>/dev/null
    echo "✅ Frontend stopped"
else
    echo "ℹ️  Frontend was not running"
fi

echo ""
echo "✅ All servers stopped"
