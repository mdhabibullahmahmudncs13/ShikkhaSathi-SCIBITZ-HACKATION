import apiClient from './apiClient';

export interface ClassInfo {
  name: string;
  subject: string;
  grade: number;
  section?: string;
  description?: string;
  teacher_name: string;
  students_count: number;
  max_students: number;
  can_join: boolean;
}

export interface ParentInfo {
  name: string;
  relationship_type: string;
  expires_at: string;
  can_connect: boolean;
}

export interface JoinClassResponse {
  success: boolean;
  message: string;
  class_info?: {
    id: string;
    name: string;
    subject: string;
    grade: number;
    teacher_name: string;
    students_count: number;
  };
}

export interface ConnectParentResponse {
  success: boolean;
  message: string;
  parent_info?: {
    name: string;
    email: string;
    relationship: string;
  };
}

export interface MyClass {
  id: string;
  name: string;
  subject: string;
  grade: number;
  section?: string;
  teacher_name?: string;
  class_code?: string;
  code_enabled?: boolean;
  students_count: number;
  max_students?: number;
  created_at?: string;
  joined_at?: string;
}

export interface MyConnection {
  id: string;
  name: string;
  email: string;
  grade?: number;
  school?: string;
  relationship_type: string;
  is_primary?: boolean;
  connected_at: string;
}

class CodeConnectionService {
  private baseUrl = '/connect';

  // Student methods
  async joinClassByCode(classCode: string): Promise<JoinClassResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/student/join-class`, {
        class_code: classCode
      });
      return response.data;
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        throw new Error('Connection blocked by ad blocker. Please disable your ad blocker or whitelist the backend server to join classes.');
      }
      throw new Error(error.response?.data?.detail || error.message || 'Failed to join class');
    }
  }

  async previewClassByCode(classCode: string): Promise<{ success: boolean; class_info?: ClassInfo; message?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/student/preview-class`, {
        class_code: classCode
      });
      return response.data;
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        throw new Error('Connection blocked by ad blocker. Please disable your ad blocker or whitelist the backend server to preview classes.');
      }
      throw new Error(error.response?.data?.detail || error.message || 'Failed to preview class');
    }
  }

  async connectToParentByCode(parentCode: string): Promise<ConnectParentResponse> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/student/connect-parent`, {
        parent_code: parentCode
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to connect to parent');
    }
  }

  async previewParentByCode(parentCode: string): Promise<{ success: boolean; parent_info?: ParentInfo; message?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/student/preview-parent`, {
        parent_code: parentCode
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to preview parent');
    }
  }

  // Teacher methods
  async createClassWithCode(classData: {
    class_name: string;
    subject: string;
    grade_level: number;
    section?: string;
    description?: string;
    academic_year?: string;
    max_students?: number;
  }): Promise<{ success: boolean; class_id: string; class_code: string; message: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/teacher/create-class`, classData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to create class');
    }
  }

  async disableClassCode(classId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/teacher/disable-class-code/${classId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to disable class code');
    }
  }

  async regenerateClassCode(classId: string): Promise<{ success: boolean; new_class_code: string; message: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/teacher/regenerate-class-code/${classId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to regenerate class code');
    }
  }

  // Parent methods
  async createParentConnectionCode(relationshipType: string = 'guardian'): Promise<{ 
    success: boolean; 
    parent_code: string; 
    expires_at: string; 
    message: string 
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/parent/create-connection-code`, {
        relationship_type: relationshipType
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to create parent code');
    }
  }

  // General methods
  async getMyClasses(): Promise<{ classes: MyClass[] }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/my-classes`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get classes');
    }
  }

  async getMyConnections(): Promise<{ children?: MyConnection[]; parents?: MyConnection[]; connections?: any[] }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/my-connections`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get connections');
    }
  }
}

export const codeConnectionService = new CodeConnectionService();