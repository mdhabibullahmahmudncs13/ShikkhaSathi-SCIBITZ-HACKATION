import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Zap } from 'lucide-react';

interface SimpleQuizSelectionProps {
  onQuizStart: (quiz: any) => void;
}

const SimpleQuizSelection: React.FC<SimpleQuizSelectionProps> = ({ onQuizStart }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadTopics(selectedSubject);
    }
  }, [selectedSubject]);

  const loadSubjects = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/quiz/subjects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Direct API Response:', data);
      
      // Filter only available subjects
      const availableSubjects = data.subjects?.filter((s: any) => s.available) || [];
      setSubjects(availableSubjects);
      
      console.log('✅ Available subjects:', availableSubjects);
    } catch (err: any) {
      console.error('❌ Failed to load subjects:', err);
      setError(`Failed to load subjects: ${err.message}`);
    }
  };

  const loadTopics = async (subject: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/quiz/topics/${subject}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (err: any) {
      console.error('❌ Failed to load topics:', err);
      setTopics([]);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedSubject) {
      setError('Please select a subject');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/quiz/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: selectedSubject,
          topic: selectedTopic || undefined,
          grade: 10,
          question_count: questionCount,
          time_limit_minutes: questionCount * 2,
          language: 'english',
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const quiz = await response.json();
      console.log('✅ Quiz generated:', quiz);
      onQuizStart(quiz);
    } catch (err: any) {
      console.error('❌ Failed to generate quiz:', err);
      setError(err.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Start a Quiz</h1>
        <p className="text-gray-600 mb-8">
          Select a subject and topic to begin your practice session
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Debug Info */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📊 Available Subjects:</h3>
          {subjects.length > 0 ? (
            <ul className="text-sm text-blue-700">
              {subjects.map((subject, index) => (
                <li key={index}>
                  • {subject.subject}: {subject.total_questions} questions
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-blue-700">Loading subjects...</p>
          )}
        </div>

        {/* Subject Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <BookOpen className="w-4 h-4 inline mr-2" />
            Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedTopic('');
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject.subject} value={subject.subject}>
                {subject.subject} ({subject.total_questions} questions)
              </option>
            ))}
          </select>
        </div>

        {/* Topic Selection */}
        {selectedSubject && topics.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic (Optional)
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic.topic} value={topic.topic}>
                  {topic.topic} ({topic.question_count} questions)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Question Count */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Zap className="w-4 h-4 inline mr-2" />
            Number of Questions
          </label>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  questionCount === count
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Time Estimate */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              Estimated time: {questionCount * 2} minutes
            </span>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartQuiz}
          disabled={!selectedSubject || loading}
          className="w-full py-3 px-6 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating Quiz...' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
};

export default SimpleQuizSelection;