#!/bin/bash
echo "🚀 Starting ShikkhaSathi Backend (Optimized)..."

cd backend

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Virtual environment activated"
fi

# Check if AI dependencies are available
if python3 -c "import transformers, torch" 2>/dev/null; then
    echo "🤖 AI dependencies available - starting with AI features"
    python3 run_dev_with_ai.py
else
    echo "🔄 AI dependencies not available - starting with mock services"
    python3 run_dev.py
fi
