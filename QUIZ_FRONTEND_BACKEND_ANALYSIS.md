# Quiz System - Frontend-Backend Analysis & Fix

**Date:** January 15, 2026  
**Issue:** Frontend quiz expectations don't match backend response

---

## 🔍 FRONTEND ANALYSIS

### Frontend Quiz Flow

1. **QuizPage.tsx** - Main container with 3 stages:
   - `selection` → `taking` → `results`

2. **SimpleQuizSelection.tsx** - Quiz configuration:
   - Loads subjects from `/api/v1/quiz/subjects`
   - Loads topics from `/api/v1/quiz/topics/{subject}`
   - Sends generation request with:
     ```typescript
     {
       subject: string,
       topic?: string,
       grade: 10,
       question_count: number (5/10/15/20),
       time_limit_minutes: question_count * 2,
       language: 'english'
     }
     ```

3. **QuizInterface.tsx** - Quiz taking:
   - Displays questions one by one
   - Timer countdown
   - Answer selection (A/B/C/D)
   - Navigation (Previous/Next)
   - Submit with confirmation

4. **QuizResults.tsx** - Results display:
   - Score and percentage
   - XP earned
   - Question-by-question review
   - Explanations for each answer

---

## 📋 FRONTEND EXPECTATIONS

### Quiz Generation Request
```typescript
POST /api/v1/quiz/generate
{
  subject: string,           // e.g., "mathematics"
  topic?: string,            // e.g., "algebra" (optional)
  grade: number,             // e.g., 10
  question_count: number,    // 5, 10, 15, or 20
  time_limit_minutes: number,// question_count * 2
  language: string           // "english" or "bengali"
}
```

### Quiz Response Expected
```typescript
{
  quiz_id: string,           // e.g., "quiz_mathematics_1234"
  subject: string,           // "mathematics"
  topic?: string,            // "algebra"
  grade: number,             // 10
  difficulty_level: number,  // 1, 2, or 3
  bloom_level: number,       // 1-6
  question_count: number,    // actual number of questions
  time_limit_minutes: number,// time limit
  questions: [
    {
      id: string,            // "0", "1", "2", etc.
      question_text: string, // The question
      options: {
        A: string,
        B: string,
        C: string,
        D: string
      },
      subject: string,
      topic: string,
      difficulty_level: number,
      bloom_level: number
    }
  ],
  created_at: string,        // ISO timestamp
  expires_at?: string        // ISO timestamp
}
```

### Quiz Submission Request
```typescript
POST /api/v1/quiz/submit
{
  quiz_id: string,
  answers: {
    "0": "A",
    "1": "C",
    "2": "B"
    // question_id: answer
  },
  time_taken_seconds: number
}
```

### Quiz Result Expected
```typescript
{
  attempt_id: string,
  quiz_id: string,
  score: number,             // e.g., 7
  max_score: number,         // e.g., 10
  percentage: number,        // e.g., 70.0
  correct_count: number,
  incorrect_count: number,
  time_taken_seconds: number,
  xp_earned: number,
  total_xp: number,
  level: number,
  level_up: boolean,
  results: [
    {
      question_id: string,
      question_text: string,
      student_answer: string,  // "A", "B", "C", "D", or ""
      correct_answer: string,  // "A", "B", "C", "D"
      is_correct: boolean,
      explanation: string,
      options: {
        A: string,
        B: string,
        C: string,
        D: string
      }
    }
  ],
  performance_summary: {
    level: string,           // "Outstanding", "Good", etc.
    message: string,
    recommendations: string[]
  }
}
```

---

## 🔧 CURRENT BACKEND ISSUES

### Issue 1: Request Parameter Names
**Frontend sends:** `question_count`  
**Backend expects:** `num_questions`

### Issue 2: Missing Parameters
**Frontend sends:** `grade`, `language`  
**Backend ignores:** These parameters

### Issue 3: Question Structure
**Frontend expects:** `options` as object with A/B/C/D keys  
**Backend sometimes returns:** Different structure

### Issue 4: Result Structure
**Frontend expects:** `student_answer` field  
**Backend returns:** `selected_answer` field (mismatch)

---

## ✅ FIXES NEEDED

### Fix 1: Update Quiz Generation Endpoint
```python
@app.post("/api/v1/quiz/generate")
async def generate_quiz(request: dict):
    # Accept both parameter names
    subject = request.get("subject", "mathematics")
    topic = request.get("topic", "")
    grade = request.get("grade", 10)  # NEW
    question_count = request.get("question_count") or request.get("num_questions", 5)  # BOTH
    time_limit_minutes = request.get("time_limit_minutes", question_count * 2)  # NEW
    language = request.get("language", "english")  # NEW
    difficulty = request.get("difficulty", "medium")
```

### Fix 2: Ensure Consistent Question Structure
```python
def transform_questions_for_frontend(questions: list, subject: str, topic: str, difficulty: str) -> list:
    transformed = []
    for idx, q in enumerate(questions):
        transformed.append({
            "id": str(idx),  # String ID as frontend expects
            "question_text": q.get('question_text') or q.get('question', ''),
            "options": {
                "A": str(q.get('options', {}).get('A', '')),
                "B": str(q.get('options', {}).get('B', '')),
                "C": str(q.get('options', {}).get('C', '')),
                "D": str(q.get('options', {}).get('D', ''))
            },
            "subject": subject,
            "topic": topic,
            "difficulty_level": {"easy": 1, "medium": 2, "hard": 3}.get(difficulty, 2),
            "bloom_level": 2
        })
    return transformed
```

### Fix 3: Update Quiz Submission Response
```python
results.append({
    "question_id": question_id,
    "question_text": question.get("question_text", ""),
    "student_answer": user_answer,  # NOT selected_answer
    "correct_answer": correct_answer,
    "is_correct": is_correct,
    "explanation": question.get("explanation", ""),
    "options": question.get("options", {})
})
```

---

## 🎯 COMPLETE FIXED IMPLEMENTATION

See the updated `backend/run_dev_with_ollama.py` with all fixes applied.

---

## ✅ TESTING CHECKLIST

### Frontend Flow Test
1. [ ] Load quiz page
2. [ ] See all 7 subjects in dropdown
3. [ ] Select a subject (e.g., Mathematics)
4. [ ] See topics load (e.g., Algebra, Geometry)
5. [ ] Select question count (5, 10, 15, or 20)
6. [ ] Click "Start Quiz"
7. [ ] See quiz generation (30-45 seconds)
8. [ ] See first question with 4 options
9. [ ] Select an answer
10. [ ] Navigate to next question
11. [ ] Complete all questions
12. [ ] Submit quiz
13. [ ] See results with score, XP, and review
14. [ ] See correct/incorrect indicators
15. [ ] See explanations for each question

### API Test
```bash
# Test quiz generation
curl -X POST http://localhost:8000/api/v1/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "mathematics",
    "topic": "algebra",
    "grade": 10,
    "question_count": 5,
    "time_limit_minutes": 10,
    "language": "english"
  }'

# Test quiz submission
curl -X POST http://localhost:8000/api/v1/quiz/submit \
  -H "Content-Type: application/json" \
  -d '{
    "quiz_id": "quiz_mathematics_1234",
    "answers": {"0": "A", "1": "B", "2": "C", "3": "D", "4": "A"},
    "time_taken_seconds": 300
  }'
```

---

## 📊 EXPECTED BEHAVIOR

### Before Fix
- ❌ Frontend sends `question_count`, backend expects `num_questions`
- ❌ Frontend sends `grade` and `language`, backend ignores them
- ❌ Results use `selected_answer` instead of `student_answer`
- ❌ Inconsistent question structure

### After Fix
- ✅ Backend accepts both `question_count` and `num_questions`
- ✅ Backend uses `grade` and `language` parameters
- ✅ Results use `student_answer` consistently
- ✅ All question structures match frontend expectations
- ✅ Complete quiz flow works end-to-end

---

**Status:** Ready to implement fixes
