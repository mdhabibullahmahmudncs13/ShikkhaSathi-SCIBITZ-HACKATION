// Quiz service for API interactions
import { Quiz, QuizGenerationRequest, QuizSubmissionRequest, QuizResult } from '../types/quiz';
import { getApiBaseUrl } from '../utils/apiUrl';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getApiBaseUrl();

class QuizService {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async generateQuiz(request: QuizGenerationRequest): Promise<Quiz> {
    return this.fetchWithAuth('/api/v1/quiz/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async submitQuiz(submission: QuizSubmissionRequest): Promise<QuizResult> {
    return this.fetchWithAuth('/api/v1/quiz/submit', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async getQuizHistory(subject?: string, limit: number = 20) {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    params.append('limit', limit.toString());

    return this.fetchWithAuth(`/api/v1/quiz/history?${params}`);
  }

  async getQuizAnalytics(subject?: string, daysBack: number = 30) {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    params.append('days_back', daysBack.toString());

    return this.fetchWithAuth(`/api/v1/quiz/analytics?${params}`);
  }

  async getTopicPerformance(subject: string, topic: string) {
    return this.fetchWithAuth(`/api/v1/quiz/performance/${subject}/${topic}`);
  }
}

export const quizService = new QuizService();