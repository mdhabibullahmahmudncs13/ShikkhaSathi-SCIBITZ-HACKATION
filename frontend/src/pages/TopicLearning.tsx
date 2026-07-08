import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Clock, Trophy, 
  RotateCcw, BookOpen, Brain, Target
} from 'lucide-react';
import { Topic, BloomQuestion, BloomLevel, QuizSubmissionRequest } from '../types/learning';
import { useTopicLearning } from '../hooks/useTopicLearning';

const TopicLearning: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { topic, loading, error, submitQuiz } = useTopicLearning(topicId!);
  
  const [currentPhase, setCurrentPhase] = useState<'learning' | 'quiz' | 'results'>('learning');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string | string[] }>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [startTime] = useState(Date.now());

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Loading topic...</p>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Topic Not Found</h2>
          <p className="text-gray-300 mb-4">{error || 'This topic does not exist'}</p>
          <button 
            onClick={() => navigate('/learning')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Back to Learning
          </button>
        </div>
      </div>
    );
  }

  const handleStartQuiz = () => {
    setCurrentPhase('quiz');
    setCurrentQuestionIndex(0);
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < topic.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmitQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    const submission: QuizSubmissionRequest = {
      topicId: topic.id,
      answers: Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      })),
      timeSpent
    };

    try {
      const results = await submitQuiz(submission);
      setQuizResults(results);
      setCurrentPhase('results');
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBloomLevelInfo = (level: BloomLevel) => {
    const bloomInfo = {
      [BloomLevel.REMEMBER]: { name: 'Remember', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: '🧠' },
      [BloomLevel.UNDERSTAND]: { name: 'Understand', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: '💡' },
      [BloomLevel.APPLY]: { name: 'Apply', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: '⚡' },
      [BloomLevel.ANALYZE]: { name: 'Analyze', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: '🔍' },
      [BloomLevel.EVALUATE]: { name: 'Evaluate', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: '⚖️' },
      [BloomLevel.CREATE]: { name: 'Create', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: '✨' }
    };
    return bloomInfo[level] || bloomInfo[BloomLevel.REMEMBER];
  };

  if (currentPhase === 'learning') {
    return <LearningPhase topic={topic} onStartQuiz={handleStartQuiz} timeSpent={timeSpent} />;
  }

  if (currentPhase === 'quiz') {
    const currentQuestion = topic.questions[currentQuestionIndex];
    return (
      <QuizPhase
        topic={topic}
        question={currentQuestion}
        questionIndex={currentQuestionIndex}
        totalQuestions={topic.questions.length}
        answer={answers[currentQuestion.id]}
        onAnswerChange={handleAnswerChange}
        onNext={handleNextQuestion}
        onPrevious={handlePreviousQuestion}
        timeSpent={timeSpent}
        canGoNext={!!answers[currentQuestion.id]}
        isLastQuestion={currentQuestionIndex === topic.questions.length - 1}
      />
    );
  }

  if (currentPhase === 'results' && quizResults) {
    return (
      <ResultsPhase
        topic={topic}
        results={quizResults}
        timeSpent={timeSpent}
        onRetry={() => {
          setCurrentPhase('quiz');
          setCurrentQuestionIndex(0);
          setAnswers({});
        }}
        onContinue={() => {
          if (quizResults.nextTopic) {
            navigate(`/learning/topic/${quizResults.nextTopic.id}`);
          } else {
            navigate(`/learning/adventure/${topic.adventureId}`);
          }
        }}
      />
    );
  }

  return null;
};

interface LearningPhaseProps {
  topic: Topic;
  onStartQuiz: () => void;
  timeSpent: number;
}

const LearningPhase: React.FC<LearningPhaseProps> = ({ topic, onStartQuiz, timeSpent }) => {
  const navigate = useNavigate();
  const bloomInfo = {
    [BloomLevel.REMEMBER]: { name: 'Remember', color: 'text-green-400', icon: '🧠' },
    [BloomLevel.UNDERSTAND]: { name: 'Understand', color: 'text-blue-400', icon: '💡' },
    [BloomLevel.APPLY]: { name: 'Apply', color: 'text-yellow-400', icon: '⚡' },
    [BloomLevel.ANALYZE]: { name: 'Analyze', color: 'text-orange-400', icon: '🔍' },
    [BloomLevel.EVALUATE]: { name: 'Evaluate', color: 'text-red-400', icon: '⚖️' },
    [BloomLevel.CREATE]: { name: 'Create', color: 'text-purple-400', icon: '✨' }
  }[topic.bloomLevel];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/learning/adventure/${topic.adventureId}`)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{topic.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bloomInfo.color}`}>
                    <span>{bloomInfo.icon}</span>
                    {bloomInfo.name}
                  </div>
                  <div className="text-sm text-blue-200">+{topic.xpReward} XP</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Learning Content */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8 mb-8">
          <div className="prose prose-invert max-w-none">
            <div className="text-white leading-relaxed text-lg">
              {topic.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Quiz Preview */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Ready for the Challenge?</h2>
              <p className="text-blue-200">Test your understanding with {topic.questions.length} questions</p>
            </div>
            <Brain className="w-12 h-12 text-blue-400" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{topic.questions.length}</div>
              <div className="text-sm text-blue-200">Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">+{topic.xpReward}</div>
              <div className="text-sm text-blue-200">XP Reward</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl ${bloomInfo.color}`}>{bloomInfo.icon}</div>
              <div className={`text-sm ${bloomInfo.color}`}>{bloomInfo.name}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">~5</div>
              <div className="text-sm text-blue-200">Minutes</div>
            </div>
          </div>

          <button
            onClick={onStartQuiz}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Target className="w-6 h-6" />
            Start Quiz Challenge
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuizPhaseProps {
  topic: Topic;
  question: BloomQuestion;
  questionIndex: number;
  totalQuestions: number;
  answer: string | string[] | undefined;
  onAnswerChange: (questionId: string, answer: string | string[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  timeSpent: number;
  canGoNext: boolean;
  isLastQuestion: boolean;
}

const QuizPhase: React.FC<QuizPhaseProps> = ({
  topic, question, questionIndex, totalQuestions, answer, onAnswerChange,
  onNext, onPrevious, timeSpent, canGoNext, isLastQuestion
}) => {
  const navigate = useNavigate();
  const bloomInfo = {
    [BloomLevel.REMEMBER]: { name: 'Remember', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: '🧠' },
    [BloomLevel.UNDERSTAND]: { name: 'Understand', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: '💡' },
    [BloomLevel.APPLY]: { name: 'Apply', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: '⚡' },
    [BloomLevel.ANALYZE]: { name: 'Analyze', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: '🔍' },
    [BloomLevel.EVALUATE]: { name: 'Evaluate', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: '⚖️' },
    [BloomLevel.CREATE]: { name: 'Create', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: '✨' }
  }[question.bloomLevel];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/learning/adventure/${topic.adventureId}`)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{topic.name} - Quiz</h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className="text-sm text-blue-200">
                    Question {questionIndex + 1} of {totalQuestions}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bloomInfo.color}`}>
                    <span>{bloomInfo.icon}</span>
                    {bloomInfo.name}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-white/70 mb-2">
            <span>Quiz Progress</span>
            <span>{questionIndex + 1}/{totalQuestions}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8 mb-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-4 ${bloomInfo.color} ${bloomInfo.bgColor}`}>
            <span>{bloomInfo.icon}</span>
            {bloomInfo.name} Level
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-6">{question.question}</h2>

          {/* Answer Options */}
          <div className="space-y-3">
            {question.type === 'multiple_choice' && question.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                  answer === option
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answer === option}
                  onChange={(e) => onAnswerChange(question.id, e.target.value)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  answer === option ? 'border-blue-400' : 'border-white/40'
                }`}>
                  {answer === option && <div className="w-2 h-2 bg-blue-400 rounded-full" />}
                </div>
                <span className="text-lg">{option}</span>
              </label>
            ))}

            {question.type === 'true_false' && (
              <>
                <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                  answer === 'true'
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                }`}>
                  <input
                    type="radio"
                    name={question.id}
                    value="true"
                    checked={answer === 'true'}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    answer === 'true' ? 'border-green-400' : 'border-white/40'
                  }`}>
                    {answer === 'true' && <div className="w-2 h-2 bg-green-400 rounded-full" />}
                  </div>
                  <span className="text-lg">True</span>
                </label>
                <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                  answer === 'false'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                }`}>
                  <input
                    type="radio"
                    name={question.id}
                    value="false"
                    checked={answer === 'false'}
                    onChange={(e) => onAnswerChange(question.id, e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    answer === 'false' ? 'border-red-400' : 'border-white/40'
                  }`}>
                    {answer === 'false' && <div className="w-2 h-2 bg-red-400 rounded-full" />}
                  </div>
                  <span className="text-lg">False</span>
                </label>
              </>
            )}

            {question.type === 'short_answer' && (
              <textarea
                value={answer as string || ''}
                onChange={(e) => onAnswerChange(question.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all"
                rows={4}
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={questionIndex === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              questionIndex === 0
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              !canGoNext
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLastQuestion ? 'Submit Quiz' : 'Next'}
            {!isLastQuestion && <ChevronRight className="w-5 h-5" />}
            {isLastQuestion && <Trophy className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResultsPhaseProps {
  topic: Topic;
  results: any;
  timeSpent: number;
  onRetry: () => void;
  onContinue: () => void;
}

const ResultsPhase: React.FC<ResultsPhaseProps> = ({ topic, results, timeSpent, onRetry, onContinue }) => {
  const navigate = useNavigate();
  const scorePercentage = Math.round((results.score / results.totalPoints) * 100);
  const isPassed = scorePercentage >= 70;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/learning/adventure/${topic.adventureId}`)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{topic.name} - Results</h1>
                <div className="text-sm text-blue-200">Quiz completed!</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Card */}
        <div className={`bg-gradient-to-r ${
          isPassed 
            ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' 
            : 'from-orange-500/20 to-red-500/20 border-orange-500/30'
        } backdrop-blur-sm border rounded-xl p-8 mb-8 text-center`}>
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isPassed ? 'bg-green-500/20' : 'bg-orange-500/20'
          }`}>
            {isPassed ? (
              <Trophy className="w-10 h-10 text-green-400" />
            ) : (
              <RotateCcw className="w-10 h-10 text-orange-400" />
            )}
          </div>
          
          <h2 className={`text-4xl font-bold mb-2 ${isPassed ? 'text-green-400' : 'text-orange-400'}`}>
            {scorePercentage}%
          </h2>
          <p className="text-xl text-white mb-4">
            {isPassed ? 'Excellent Work!' : 'Keep Practicing!'}
          </p>
          <p className="text-white/70">
            You scored {results.score} out of {results.totalPoints} points
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">+{results.xpEarned}</div>
            <div className="text-sm text-white/70">XP Earned</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</div>
            <div className="text-sm text-white/70">Time Taken</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{topic.questions.length}</div>
            <div className="text-sm text-white/70">Questions</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${isPassed ? 'text-green-400' : 'text-orange-400'}`}>
              {isPassed ? 'PASSED' : 'RETRY'}
            </div>
            <div className="text-sm text-white/70">Status</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          {!isPassed && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Retry Quiz
            </button>
          )}
          
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {results.nextTopic ? 'Next Topic' : 'Back to Adventure'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopicLearning;