# Generate 500+ Questions Per Subject

## Quick Start

To generate 500+ questions per subject from NCTB textbooks:

```bash
./start_question_generation.sh
```

This will:
- Generate 500+ questions for each of 7 subjects
- Run in the background (takes 2-3 hours)
- Save to `backend/data/question_bank/`
- Log progress to `question_generation.log`

## Monitor Progress

```bash
# Watch live progress
tail -f question_generation.log

# Check generated files
ls -lh backend/data/question_bank/

# Count questions in a file
cat backend/data/question_bank/mathematics_questions.json | grep '"question"' | wc -l
```

## What Gets Generated

For each subject:
- **File**: `backend/data/question_bank/{subject}_questions.json`
- **Questions**: 500+ per subject
- **Format**: JSON with question, options, answer, explanation
- **Source**: NCTB textbooks via RAG system

### Example Output Structure
```json
{
  "subject": "mathematics",
  "total_questions": 500,
  "generated_at": "2026-01-15 12:00:00",
  "questions": [
    {
      "question": "What is the Pythagorean theorem?",
      "options": {
        "A": "a + b = c",
        "B": "a² + b² = c²",
        "C": "a - b = c",
        "D": "ab = c"
      },
      "correct_answer": "B",
      "explanation": "The Pythagorean theorem states...",
      "topic": "geometry",
      "difficulty": "medium"
    }
  ]
}
```

## Subjects Being Generated

1. **Mathematics** (গণিত) - 500+ questions
2. **ICT** (তথ্য ও যোগাযোগ প্রযুক্তি) - 500+ questions
3. **Physics** (পদার্থবিজ্ঞান) - 500+ questions
4. **Chemistry** (রসায়ন) - 500+ questions
5. **Biology** (জীববিজ্ঞান) - 500+ questions
6. **Bangla** (বাংলা) - 500+ questions
7. **English** (ইংরেজি) - 500+ questions

**Total**: 3,500+ questions

## Generation Process

### How It Works
1. **RAG Retrieval**: Searches 3,482 NCTB document chunks
2. **Content Selection**: Gets relevant textbook sections
3. **AI Generation**: Ollama (llama3.2:3b) creates questions
4. **Batch Processing**: 50 batches × 10 questions = 500 per subject
5. **JSON Storage**: Saves to question bank files

### Timeline
- **Per Batch**: ~2-3 seconds (10 questions)
- **Per Subject**: ~2-3 minutes (500 questions)
- **All Subjects**: ~20-25 minutes (3,500 questions)

## After Generation

### 1. Verify Questions Generated
```bash
# Check all generated files
ls -lh backend/data/question_bank/

# Should see:
# mathematics_questions.json
# ict_questions.json
# physics_questions.json
# chemistry_questions.json
# biology_questions.json
# bangla_questions.json
# english_questions.json
```

### 2. Restart Backend
The backend will automatically load the question bank on startup:

```bash
# Restart backend to load questions
# (Stop current backend and restart)
```

### 3. Test Quiz Generation
Questions will now load instantly (no 15-30 second wait):

```bash
# Test with curl
curl -X POST http://localhost:8000/api/v1/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{"subject":"mathematics","num_questions":5}'

# Should return instantly with 5 questions
```

## Benefits After Generation

### Before (Current)
- ⏱️ Quiz generation: 15-30 seconds
- 🤖 Requires Ollama running
- 📊 Limited concurrent users

### After (With Question Bank)
- ⚡ Quiz generation: <100ms (instant)
- 💾 No Ollama needed for quizzes
- 📈 Unlimited concurrent users
- ✅ Pre-verified question quality

## Troubleshooting

### Generation Stopped?
```bash
# Check if process is running
ps aux | grep generate_questions_fast

# Check log for errors
tail -50 question_generation.log

# Restart generation
./start_question_generation.sh
```

### Not Enough Questions?
```bash
# Check question count
cat backend/data/question_bank/mathematics_questions.json | grep '"question"' | wc -l

# If less than 500, regenerate that subject
cd backend
python3 -c "
import asyncio
from generate_questions_fast import generate_for_subject, get_rag_service

async def regen():
    rag = get_rag_service()
    await generate_for_subject('mathematics', rag)

asyncio.run(regen())
"
```

### Ollama Not Responding?
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama if needed
# Then restart generation
```

## Manual Generation (Alternative)

If you prefer to run manually and see progress:

```bash
cd backend
python3 generate_questions_fast.py
```

This will show live progress in your terminal.

## Question Quality

All generated questions:
- ✅ Based on NCTB textbook content
- ✅ Include textbook references in explanations
- ✅ Have 4 options (A, B, C, D)
- ✅ Marked with difficulty level
- ✅ Tagged with topic
- ✅ Verified format (JSON)

## Next Steps

1. **Start Generation**: `./start_question_generation.sh`
2. **Monitor Progress**: `tail -f question_generation.log`
3. **Wait 20-25 minutes**: Let it complete
4. **Restart Backend**: Load question bank
5. **Test Quizzes**: Instant generation!

---

**Status**: Ready to generate 3,500+ questions from NCTB textbooks!

Run: `./start_question_generation.sh` to begin.
