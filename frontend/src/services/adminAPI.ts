// Admin API Service
import { 
  AdminStats, 
  UserListResponse, 
  UserDetail, 
  ContentStats, 
  SystemHealth,
  UserGrowthAnalytics,
  LearningActivityAnalytics,
  BulkUserAction,
  UserCreateData,
  UserUpdateData
} from '../types/admin';
import { getApiBaseUrl } from '../utils/apiUrl';

const API_BASE_URL = import.meta.env.VITE_API_URL || getApiBaseUrl();

class AdminAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}/api/v1/admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Dashboard & Analytics
  async getDashboardStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/dashboard');
  }

  async getUserGrowthAnalytics(days: number = 30): Promise<UserGrowthAnalytics> {
    return this.request<UserGrowthAnalytics>(`/analytics/user-growth?days=${days}`);
  }

  async getLearningActivityAnalytics(days: number = 7): Promise<LearningActivityAnalytics> {
    return this.request<LearningActivityAnalytics>(`/analytics/learning-activity?days=${days}`);
  }

  // User Management
  async getUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    return this.request<UserListResponse>(`/users${queryString ? `?${queryString}` : ''}`);
  }

  async getUserDetail(userId: string): Promise<UserDetail> {
    return this.request<UserDetail>(`/users/${userId}`);
  }

  async createUser(userData: UserCreateData): Promise<{ message: string; user_id: string }> {
    return this.request<{ message: string; user_id: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: UserUpdateData): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async bulkUserAction(actionData: BulkUserAction): Promise<{ message: string; affected_users: number }> {
    return this.request<{ message: string; affected_users: number }>('/users/bulk-action', {
      method: 'POST',
      body: JSON.stringify(actionData),
    });
  }

  // Content Management
  async getContentStats(): Promise<ContentStats> {
    return this.request<ContentStats>('/content/stats');
  }

  // System Health
  async getSystemHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>('/system/health');
  }

  // Utility methods for mock data (development)
  async getMockDashboardStats(): Promise<AdminStats> {
    // Mock data for development
    return {
      total_users: 1250,
      active_users: 1180,
      students_count: 950,
      teachers_count: 180,
      parents_count: 120,
      recent_registrations: 45,
      total_quiz_attempts: 8750,
      completed_quizzes: 7200,
      total_textbooks: 6,
      total_learning_modules: 49,
      system_status: 'healthy',
      top_students: [
        { name: 'রাহুল আহমেদ', xp: 8500 },
        { name: 'ফাতিমা খান', xp: 7800 },
        { name: 'করিম উদ্দিন', xp: 7200 },
        { name: 'আয়েশা বেগম', xp: 6900 },
        { name: 'তানভীর হাসান', xp: 6500 }
      ]
    };
  }

  async getMockUsers(): Promise<UserListResponse> {
    // Mock data for development
    return {
      users: [
        {
          id: '1',
          email: 'rahul@example.com',
          full_name: 'রাহুল আহমেদ',
          school: 'ঢাকা কলেজিয়েট স্কুল',
          role: 'student',
          is_active: true,
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          email: 'fatima@example.com',
          full_name: 'ফাতিমা খান',
          school: 'ভিকারুননিসা নূন স্কুল',
          role: 'student',
          is_active: true,
          created_at: '2024-01-20T14:15:00Z'
        },
        {
          id: '3',
          email: 'teacher@example.com',
          full_name: 'মোহাম্মদ করিম',
          school: 'ঢাকা কলেজিয়েট স্কুল',
          role: 'teacher',
          is_active: true,
          created_at: '2024-01-10T09:00:00Z'
        }
      ],
      total: 1250,
      page: 1,
      limit: 20,
      total_pages: 63
    };
  }
}

export const adminAPI = new AdminAPI();