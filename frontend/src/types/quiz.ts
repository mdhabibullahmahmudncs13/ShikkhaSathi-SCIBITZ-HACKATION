// Quiz Types

export interface Question {
  id: string;
  question_text: string;
  question_text_bangla?: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_a_bangla?: string;
  option_b_bangla?: string;
  option_c_bangla?: string;
  option_d_bangla?: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  explanation_bangla?: string;
  subject: string;
  topic: string;
  grade: number;
  difficulty_level: number;
  bloom_level: number;
}

export interface Quiz {
  quiz_id: string;
  subject: string;
  topic?: string;
  grade: number;
  difficulty_level: number;
  bloom_level: number;
  question_count: number;
  time_limit_minutes?: number;
  questions: Array<{
    id: string;
    question_text: string;
    options: {
      A: string;
      B: string;
      C: string;
      D: string;
    };
    subject: string;
    topic: string;
    difficulty_level: number;
    bloom_level: number;
  }>;
  created_at: string;
  expires_at?: string;
}

export interface QuizSubmission {
  quiz_id: string;
  answers: Record<string, string>; // question_id -> answer (A/B/C/D)
  time_taken_seconds: number;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  time_taken_seconds?: number;
}

export interface QuizResult {
  attempt_id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  time_taken_seconds: number;
  xp_earned: number;
  total_xp: number;
  level: number;
  level_up: boolean;
  results: Array<{
    question_id: string;
    question_text: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    explanation: string;
    options: {
      A: string;
      B: string;
      C: string;
      D: string;
    };
  }>;
  performance_summary: {
    level: string;
    message: string;
    recommendations: string[];
  };
}

export interface QuizHistory {
  attempt_id: string;
  quiz_id: string;
  subject: string;
  topic?: string;
  score: number;
  max_score: number;
  percentage: number;
  xp_earned: number;
  time_taken_seconds: number;
  completed_at: string;
}

export interface Subject {
  subject: string;
  grades: Record<number, number>;
  total_questions: number;
}

export interface Topic {
  topic: string;
  question_count: number;
}
