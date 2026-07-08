import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SimpleQuizSelection from '../components/quiz/SimpleQuizSelection';
import QuizInterface from '../components/quiz/QuizInterface';
import QuizResults from '../components/quiz/QuizResults';
import { Quiz, QuizResult } from '../types/quiz';

type QuizStage = 'selection' | 'taking' | 'results';

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<QuizStage>('selection');
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const handleQuizStart = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setStage('taking');
  };

  const handleQuizComplete = (result: QuizResult) => {
    setQuizResult(result);
    setStage('results');
  };

  const handleRetakeQuiz = () => {
    setCurrentQuiz(null);
    setQuizResult(null);
    setStage('selection');
  };

  const handleBackToDashboard = () => {
    navigate('/student');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {stage === 'selection' && (
          <SimpleQuizSelection onQuizStart={handleQuizStart} />
        )}
        
        {stage === 'taking' && currentQuiz && (
          <QuizInterface
            quiz={currentQuiz}
            onComplete={handleQuizComplete}
          />
        )}
        
        {stage === 'results' && quizResult && (
          <QuizResults
            result={quizResult}
            onRetake={handleRetakeQuiz}
            onBackToDashboard={handleBackToDashboard}
          />
        )}
      </div>
    </div>
  );
};

export default QuizPage;
