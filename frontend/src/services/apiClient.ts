import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiCache, dashboardCache, quizCache, cacheKeys, withCache } from './cacheManager';
import { logger } from './logger';
import { getApiV1Url } from '../utils/apiUrl';

// API Configuration
const API_BASE_URL = getApiV1Url();
const API_VERSION = '';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
});

// Request interceptor to add auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for performance monitoring
    (config as any).metadata = { startTime: Date.now() };
    
    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response
    const config = response.config;
    const duration = Date.now() - ((config as any).metadata?.startTime || 0);
    
    logger.monitorAPICall(
      config.url || '',
      config.method?.toUpperCase() || 'GET',
      (config as any).metadata?.startTime || 0,
      Date.now(),
      true
    );
    
    logger.debug(`API Response: ${config.method?.toUpperCase()} ${config.url} (${duration}ms)`, {
      status: response.status,
      data: response.data
    });
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = Date.now() - (originalRequest?.metadata?.startTime || 0);

    // Log failed response
    logger.monitorAPICall(
      originalRequest?.url || '',
      originalRequest?.method?.toUpperCase() || 'GET',
      originalRequest?.metadata?.startTime || 0,
      Date.now(),
      false,
      error
    );

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          logger.info('Attempting token refresh');
          
          const response = await axios.post(`${API_BASE_URL}${API_VERSION}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          
          logger.info('Token refresh successful');
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        logger.error('Token refresh failed', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      logger.error('Network error', { message: error.message, duration });
      throw new Error('Network connection failed. Please check your internet connection.');
    }

    // Handle other HTTP errors
    const errorMessage = error.response.data?.detail || error.response.data?.message || 'An error occurred';
    logger.error(`API Error: ${error.response.status}`, {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response.status,
      message: errorMessage,
      duration
    });
    
    throw new Error(errorMessage);
  }
);

// Generic API methods
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config).then(response => response.data),
    
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config).then(response => response.data),
    
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put(url, data, config).then(response => response.data),
    
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.patch(url, data, config).then(response => response.data),
    
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config).then(response => response.data),
};

// Specific API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
    
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    date_of_birth?: string;
    school?: string;
    district?: string;
    grade?: number;
    medium?: string;
    role?: string;
  }) => api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
    
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
};

export const notificationAPI = {
  getNotifications: (params?: { limit?: number; offset?: number; unread_only?: boolean }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId: string) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
};

export const dashboardAPI = {
  getDashboardData: () => {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    return withCache(
      dashboardCache,
      cacheKeys.dashboardData(userId),
      () => api.get('/progress/dashboard'),
      2 * 60 * 1000 // 2 minutes cache
    );
  },
  getAnalytics: () => api.get('/progress/analytics'),
};

export const quizAPI = {
  // Get available subjects with question counts
  getSubjects: (grade?: number) =>
    // Temporarily disable caching for debugging
    api.get('/quiz/subjects', { params: { grade } }),
    // withCache(
    //   quizCache,
    //   cacheKeys.quizList('subjects', grade),
    //   () => api.get('/quiz/subjects', { params: { grade } }),
    //   10 * 60 * 1000 // 10 minutes cache
    // ),
  
  // Get available topics for a subject
  getTopics: (subject: string, grade?: number) =>
    // Temporarily disable caching for debugging
    api.get(`/quiz/topics/${subject}`, { params: { grade } }),
    // withCache(
    //   quizCache,
    //   cacheKeys.quizList(subject, grade),
    //   () => api.get(`/quiz/topics/${subject}`, { params: { grade } }),
    //   10 * 60 * 1000 // 10 minutes cache
    // ),
  
  // Generate a new quiz
  generateQuiz: (params: {
    subject: string;
    topic?: string;
    grade: number;
    difficulty_level?: number;
    bloom_level?: number;
    question_count: number;
    time_limit_minutes?: number;
    language?: 'english' | 'bangla';
  }) => api.post('/quiz/generate', params),
  
  // Submit quiz answers
  submitQuiz: (submission: {
    quiz_id: string;
    answers: Record<string, string>;
    time_taken_seconds: number;
  }) => api.post('/quiz/submit', submission),
  
  // Get quiz results
  getQuizResults: (attemptId: string) =>
    withCache(
      quizCache,
      cacheKeys.quizResults(attemptId),
      () => api.get(`/quiz/results/${attemptId}`),
      30 * 60 * 1000 // 30 minutes cache
    ),
  
  // Get quiz history
  getQuizHistory: (subject?: string, limit: number = 20) =>
    api.get('/quiz/history', { params: { subject, limit } }),
};

export const chatAPI = {
  sendMessage: (message: string, sessionId?: string, modelCategory?: string, aiMode?: string, conversationHistory?: any[]) =>
    api.post('/chat/chat', { 
      message, 
      session_id: sessionId,
      model_category: modelCategory,
      ai_mode: aiMode,
      conversation_history: conversationHistory,
      subject: null // Let the AI determine the subject
    }),
    
  getChatHistory: (sessionId: string) =>
    api.get(`/chat/history/${sessionId}`),
    
  processVoiceInput: (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    return api.post('/chat/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const gamificationAPI = {
  getGamificationData: async () => {
    // First get current user to get their ID
    const currentUser = await api.get('/users/me');
    const userId = currentUser.id;
    
    return withCache(
      apiCache,
      cacheKeys.gamificationData(userId),
      () => api.get(`/gamification/profile/${userId}`),
      3 * 60 * 1000 // 3 minutes cache
    );
  },
  getLeaderboard: (type: string = 'global', timeframe: string = 'weekly') =>
    withCache(
      apiCache,
      cacheKeys.leaderboard(type, timeframe),
      () => api.get('/gamification/leaderboard/xp', { params: { leaderboard_type: type, time_frame: timeframe } }),
      5 * 60 * 1000 // 5 minutes cache
    ),
  getAchievements: async () => {
    const currentUser = await api.get('/users/me');
    return api.get('/gamification/achievements', { params: { user_id: currentUser.id } });
  },
  useStreakFreeze: async () => {
    const currentUser = await api.get('/users/me');
    return api.post('/gamification/streak/freeze', null, { params: { user_id: currentUser.id } });
  },
  awardXP: (userId: string, activityType: string, amount?: number, metadata?: any) =>
    api.post('/gamification/award-xp', null, { 
      params: { user_id: userId, activity_type: activityType, amount, metadata } 
    }),
  getStreakInfo: async () => {
    const currentUser = await api.get('/users/me');
    return api.get('/gamification/streak', { params: { user_id: currentUser.id } });
  },
};

export const teacherAPI = {
  getClassOverview: () => api.get('/teacher/class-overview'),
  getStudentAnalytics: (studentId: string) =>
    api.get(`/teacher/student/${studentId}/analytics`),
  getClassPerformance: () => api.get('/teacher/class-performance'),
  
  // Analytics endpoints
  getClassPerformanceMetrics: (classId?: string, timeRange?: string) =>
    api.get('/teacher/analytics/performance', { 
      params: { class_id: classId, time_range: timeRange } 
    }),
  getWeaknessPatterns: (classId?: string, timeRange?: string) =>
    api.get('/teacher/analytics/weakness-patterns', { 
      params: { class_id: classId, time_range: timeRange } 
    }),
  getInterventionRecommendations: (classId?: string) =>
    api.get('/teacher/analytics/interventions', { 
      params: { class_id: classId } 
    }),
  updateInterventionRecommendation: (recommendationId: string, data: any) =>
    api.patch(`/teacher/analytics/interventions/${recommendationId}`, data),
  exportClassReport: (classId: string, options: any) =>
    api.post(`/teacher/analytics/export/${classId}`, options, {
      responseType: 'blob'
    }),
  
  // Assessment management endpoints
  createAssessment: (assessmentData: any) =>
    api.post('/teacher/assessment/create', assessmentData),
  updateAssessment: (assessmentId: string, assessmentData: any) =>
    api.put(`/teacher/assessment/${assessmentId}`, assessmentData),
  getAssessment: (assessmentId: string) =>
    api.get(`/teacher/assessment/${assessmentId}`),
  getAssessments: (filters?: any) => 
    api.get('/teacher/assessment/list', { params: filters }),
  deleteAssessment: (assessmentId: string) =>
    api.delete(`/teacher/assessment/${assessmentId}`),
  duplicateAssessment: (assessmentId: string) =>
    api.post(`/teacher/assessment/${assessmentId}/duplicate`),
  
  // Assessment publishing and assignment
  publishAssessment: (assessmentId: string, publishData: any) =>
    api.post(`/teacher/assessment/${assessmentId}/publish`, publishData),
  assignAssessment: (assessmentId: string, assignmentData: any) =>
    api.post(`/teacher/assessment/${assessmentId}/assign`, assignmentData),
  getAssignedClasses: (assessmentId: string) =>
    api.get(`/teacher/assessment/${assessmentId}/assignments`),
  
  // Assessment results and analytics
  getAssessmentResults: (assessmentId: string, filters?: any) =>
    api.get(`/teacher/assessment/${assessmentId}/results`, { params: filters }),
  getAssessmentAnalytics: (assessmentId: string) =>
    api.get(`/teacher/assessment/${assessmentId}/analytics`),
  getStudentAssessmentResult: (assessmentId: string, studentId: string) =>
    api.get(`/teacher/assessment/${assessmentId}/student/${studentId}/result`),
  
  // Question bank endpoints
  getQuestionBank: (filters?: any) =>
    api.get('/teacher/question-bank', { params: filters }),
  createQuestion: (questionData: any) =>
    api.post('/teacher/question-bank/create', questionData),
  updateQuestion: (questionId: string, questionData: any) =>
    api.put(`/teacher/question-bank/${questionId}`, questionData),
  deleteQuestion: (questionId: string) =>
    api.delete(`/teacher/question-bank/${questionId}`),
  getQuestionUsageStats: (questionId: string) =>
    api.get(`/teacher/question-bank/${questionId}/stats`),
  
  // AI-powered question generation
  generateQuestionSuggestions: (criteria: any) =>
    api.post('/teacher/question-bank/generate', criteria),
  improveQuestion: (questionId: string, improvementCriteria: any) =>
    api.post(`/teacher/question-bank/${questionId}/improve`, improvementCriteria),
  
  // Rubric management
  createRubric: (rubricData: any) =>
    api.post('/teacher/rubric/create', rubricData),
  getRubrics: (filters?: any) =>
    api.get('/teacher/rubric/list', { params: filters }),
  getRubric: (rubricId: string) =>
    api.get(`/teacher/rubric/${rubricId}`),
  updateRubric: (rubricId: string, rubricData: any) =>
    api.put(`/teacher/rubric/${rubricId}`, rubricData),
  deleteRubric: (rubricId: string) =>
    api.delete(`/teacher/rubric/${rubricId}`),
  
  // Assessment templates
  getAssessmentTemplates: (filters?: any) =>
    api.get('/teacher/assessment/templates', { params: filters }),
  createAssessmentFromTemplate: (templateId: string, customizations: any) =>
    api.post(`/teacher/assessment/templates/${templateId}/create`, customizations),
  saveAsTemplate: (assessmentId: string, templateData: any) =>
    api.post(`/teacher/assessment/${assessmentId}/save-as-template`, templateData),

  // Learning Path Management
  getLearningPathRecommendations: (request: any) =>
    api.post('/learning-paths/recommendations', request),
  assignLearningPath: (request: any) =>
    api.post('/learning-paths/assign', request),
  bulkAssignLearningPath: (request: any) =>
    api.post('/learning-paths/bulk-assign', request),
  updateLearningPathProgress: (assignmentId: string, progress: any) =>
    api.put(`/learning-paths/progress/${assignmentId}`, progress),
  adjustLearningPathDifficulty: (request: any) =>
    api.put('/learning-paths/adjust-difficulty', request),
  getLearningPathAnalytics: (pathId: string) =>
    api.get(`/learning-paths/analytics/${pathId}`),
  updateTopicMastery: (masteryUpdate: any) =>
    api.post('/learning-paths/topic-mastery', masteryUpdate),
  createCustomLearningPath: (request: any) =>
    api.post('/learning-paths/create-custom', request),
  getLearningPathTemplates: (filters?: any) =>
    api.get('/learning-paths/templates', { params: filters }),
  getStudentAssignments: (studentId: string, filters?: any) =>
    api.get(`/learning-paths/student/${studentId}/assignments`, { params: filters }),
  getClassAssignments: (classId: string, filters?: any) =>
    api.get(`/learning-paths/class/${classId}/assignments`, { params: filters }),
};

export const learningAPI = {
  getArenas: () => api.get('/learning/arenas'),
  getArenaDetail: (arenaId: string) => api.get(`/learning/arena/${arenaId}`),
  getAdventureDetail: (adventureId: string) => api.get(`/learning/adventure/${adventureId}`),
  getTopicDetail: (topicId: string) => api.get(`/learning/topic/${topicId}`),
  submitTopicQuiz: (topicId: string, quizData: any) => 
    api.post(`/learning/topic/${topicId}/submit-quiz`, quizData),
};

export const parentAPI = {
  getDashboard: () => api.get('/parent/dashboard'),
  getChildren: () => api.get('/parent/children'),
  getChildProgress: (childId: string) =>
    api.get(`/parent/child/${childId}/progress`),
  getChildAnalytics: (childId: string, timeRangeDays?: number) =>
    api.get(`/parent/child/${childId}/analytics`, { params: { time_range_days: timeRangeDays } }),
  getWeeklyReport: (childId: string, weekStart: string) =>
    api.get(`/parent/child/${childId}/report`, { params: { week_start: weekStart } }),
  getWeeklyReports: (childId?: string, limit?: number, offset?: number) =>
    api.get('/parent/weekly-reports', { params: { child_id: childId, limit, offset } }),
  generateWeeklyReport: (childId: string, weekStart?: string) =>
    api.post(`/parent/child/${childId}/weekly-report`, { week_start: weekStart }),
  getNotifications: (limit?: number, offset?: number, unreadOnly?: boolean) =>
    api.get('/parent/notifications', { params: { limit, offset, unread_only: unreadOnly } }),
  markNotificationRead: (notificationId: string) =>
    api.post(`/parent/notifications/${notificationId}/mark-read`),
  getNotificationPreferences: () => api.get('/parent/notification-preferences'),
  updateNotificationPreferences: (preferences: any) =>
    api.put('/parent/notification-preferences', preferences),
  createAchievementNotification: (notificationData: any) =>
    api.post('/parent/notifications/achievement', notificationData),
  createPerformanceAlert: (alertData: any) =>
    api.post('/parent/notifications/performance-alert', alertData),
  createStreakMilestoneNotification: (milestoneData: any) =>
    api.post('/parent/notifications/streak-milestone', milestoneData),
  sendWeeklyReports: () => api.post('/parent/send-weekly-reports'),
};

// Error handling utilities
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Loading state management
export const createLoadingState = () => {
  let loadingCount = 0;
  const listeners: ((loading: boolean) => void)[] = [];
  
  return {
    increment: () => {
      loadingCount++;
      listeners.forEach(listener => listener(true));
    },
    decrement: () => {
      loadingCount = Math.max(0, loadingCount - 1);
      if (loadingCount === 0) {
        listeners.forEach(listener => listener(false));
      }
    },
    subscribe: (listener: (loading: boolean) => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
    isLoading: () => loadingCount > 0,
  };
};

export const globalLoadingState = createLoadingState();

export default apiClient;