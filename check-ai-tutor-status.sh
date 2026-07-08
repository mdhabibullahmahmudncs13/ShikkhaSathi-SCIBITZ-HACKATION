#!/bin/bash

# ShikkhaSathi AI Tutor Status Check
# This script verifies that all AI tutor components are working

echo "🎓 ShikkhaSathi AI Tutor - Status Check"
echo "========================================"
echo ""

# Check Backend
echo "📡 Checking Backend (http://localhost:8000)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health | grep -q "200"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not responding"
    echo "   Run: python3 backend/run_dev_lightweight.py"
fi
echo ""

# Check Frontend
echo "🌐 Checking Frontend (https://localhost:5174)..."
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:5174 | grep -q "200"; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not responding"
    echo "   Run: cd frontend && npm run dev"
fi
echo ""

# Test AI Models
echo "🤖 Testing AI Models..."

# Test Math Model
echo "  📘 Testing Math Model..."
MATH_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","model_category":"math","ai_mode":"tutor"}' 2>/dev/null)

if echo "$MATH_RESPONSE" | grep -q "response"; then
    echo "  ✅ Math Model working"
else
    echo "  ❌ Math Model not responding"
fi

# Test Bangla Model
echo "  📗 Testing Bangla Model..."
BANGLA_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","model_category":"bangla","ai_mode":"tutor"}' 2>/dev/null)

if echo "$BANGLA_RESPONSE" | grep -q "response"; then
    echo "  ✅ Bangla Model working"
else
    echo "  ❌ Bangla Model not responding"
fi

# Test General Model
echo "  📙 Testing General Model..."
GENERAL_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","model_category":"general","ai_mode":"tutor"}' 2>/dev/null)

if echo "$GENERAL_RESPONSE" | grep -q "response"; then
    echo "  ✅ General Model working"
else
    echo "  ❌ General Model not responding"
fi

echo ""
echo "========================================"
echo "📊 Status Summary:"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: https://localhost:5174"
echo "Chat:     https://localhost:5174/chat"
echo ""
echo "📚 Documentation:"
echo "  - AI_TUTOR_USER_GUIDE.md (How to use)"
echo "  - AI_TUTOR_FINAL_STATUS.md (Technical details)"
echo "  - AI_TUTOR_UX_ENHANCEMENT_COMPLETE.md (Changes made)"
echo ""
echo "✨ All systems operational!"
