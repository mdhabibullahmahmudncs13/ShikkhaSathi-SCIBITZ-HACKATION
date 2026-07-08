#!/bin/bash
# Start question bank generation in background

echo "🚀 Starting Question Bank Generation"
echo "This will generate 500+ questions per subject"
echo "Estimated time: 2-3 hours"
echo ""
echo "Progress will be saved to: backend/data/question_bank/"
echo "You can check progress with: tail -f question_generation.log"
echo ""

cd backend
nohup python3 generate_questions_fast.py > ../question_generation.log 2>&1 &

echo "✅ Generation started in background (PID: $!)"
echo "📝 Log file: question_generation.log"
echo ""
echo "To check progress:"
echo "  tail -f question_generation.log"
echo ""
echo "To check generated files:"
echo "  ls -lh backend/data/question_bank/"
