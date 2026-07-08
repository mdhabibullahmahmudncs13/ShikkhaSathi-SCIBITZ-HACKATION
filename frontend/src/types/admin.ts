// Admin Panel TypeScript Types

export interface AdminStats {
  total_users: number;
  active_users: number;
  students_count: number;
  teachers_count: number;
  parents_count: number;
  recent_registrations: number;
  total_quiz_attempts: number;
  completed_quizzes: number;
  total_textbooks: number;
  total_learning_modules: number;
  system_status: string;
  top_students: Array<{
    name: string;
    xp: number;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  school?: string;
  district?: string;
  grade?: number;
  medium?: 'bangla' | 'english';
  role: 'student' | 'teacher' | 'parent' | 'admin';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface UserDetail {
  user: AdminUser;
  total_progress_entries: number;
  total_xp: number;
  current_level: number;
  quiz_attempts: number;
  last_activity?: string;
}

export interface ContentStats {
  total_textbooks: number;
  subjects: Record<string, {
    textbooks: number;
    chapters: number;
  }>;
  total_chapters: number;
  textbook_details: Array<{
    filename: string;
    subject: string;
    grade: string;
    chapters: number;
    total_pages: number;
  }>;
}

export interface SystemHealth {
  database_status: string;
  database_response_time: string;
  content_service_status: string;
  total_textbooks: number;
  system_uptime: string;
  memory_usage: string;
  cpu_usage: string;
}

export interface UserGrowthAnalytics {
  daily_registrations: Array<{
    date: string;
    count: number;
  }>;
  role_distribution: Array<{
    role: string;
    count: number;
  }>;
}

export interface LearningActivityAnalytics {
  quiz_activity: Array<{
    date: string;
    attempts: number;
    completed: number;
  }>;
  subject_activity: Array<{
    subject: string;
    attempts: number;
  }>;
}

export interface BulkUserAction {
  user_ids: string[];
  action: 'activate' | 'deactivate' | 'delete';
}

export interface UserCreateData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  school?: string;
  district?: string;
  grade?: number;
  medium?: 'bangla' | 'english';
  role: 'student' | 'teacher' | 'parent' | 'admin';
  is_active?: boolean;
}

export interface UserUpdateData {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  school?: string;
  district?: string;
  grade?: number;
  medium?: 'bangla' | 'english';
  role?: 'student' | 'teacher' | 'parent' | 'admin';
  is_active?: boolean;
}