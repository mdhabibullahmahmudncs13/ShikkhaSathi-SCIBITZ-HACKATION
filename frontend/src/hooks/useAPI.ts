import { useState, useEffect, useCallback } from 'react';
import { globalLoadingState, dashboardAPI, quizAPI, chatAPI, authAPI } from '../services/apiClient';

// Generic API hook for handling loading, error, and data states
export function useAPI<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      globalLoadingState.increment();
      
      const result = await apiCall();
      setData(result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
      
      throw error;
    } finally {
      setLoading(false);
      globalLoadingState.decrement();
    }
  }, dependencies);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, dependencies);

  const refetch = useCallback(() => execute(), [execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
  };
}

// Mutation hook for POST/PUT/DELETE operations
export function useMutation<T, P = any>(
  apiCall: (params: P) => Promise<T>,
  options: {
    onSuccess?: (data: T, params: P) => void;
    onError?: (error: Error, params: P) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (params: P) => {
    try {
      setLoading(true);
      setError(null);
      globalLoadingState.increment();
      
      const result = await apiCall(params);
      
      if (options.onSuccess) {
        options.onSuccess(result, params);
      }
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      
      if (options.onError) {
        options.onError(error, params);
      }
      
      throw error;
    } finally {
      setLoading(false);
      globalLoadingState.decrement();
    }
  }, [apiCall, options]);

  return {
    mutate,
    loading,
    error,
  };
}

// Global loading state hook
export function useGlobalLoading() {
  const [loading, setLoading] = useState(globalLoadingState.isLoading());

  useEffect(() => {
    const unsubscribe = globalLoadingState.subscribe(setLoading);
    return unsubscribe;
  }, []);

  return loading;
}

// Specific hooks for common operations
export function useDashboardData() {
  return useAPI(
    () => dashboardAPI.getDashboardData(),
    [],
    {
      onError: (error) => {
        console.error('Failed to load dashboard data:', error);
      }
    }
  );
}

export function useQuizData(subject?: string, grade?: number) {
  return useAPI(
    () => quizAPI.getSubjects(grade),
    [subject, grade],
    {
      immediate: true,
      onError: (error) => {
        console.error('Failed to load quiz data:', error);
      }
    }
  );
}

export function useQuizSubmission() {
  return useMutation(
    (submission: { quiz_id: string; answers: Record<string, string>; time_taken_seconds: number }) =>
      quizAPI.submitQuiz(submission),
    {
      onSuccess: (result) => {
        console.log('Quiz submitted successfully:', result);
      },
      onError: (error) => {
        console.error('Failed to submit quiz:', error);
      }
    }
  );
}

export function useChatMessage() {
  return useMutation(
    ({ message, sessionId }: { message: string; sessionId?: string }) =>
      chatAPI.sendMessage(message, sessionId),
    {
      onError: (error) => {
        console.error('Failed to send message:', error);
      }
    }
  );
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useMutation(
    ({ email, password }: { email: string; password: string }) =>
      authAPI.login(email, password),
    {
      onSuccess: async (data) => {
        localStorage.setItem('access_token', (data as any).access_token);
        if ((data as any).refresh_token) {
          localStorage.setItem('refresh_token', (data as any).refresh_token);
        }
        
        // Get user info after successful login
        try {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to get user data after login:', error);
          // Still set as authenticated since login was successful
          setIsAuthenticated(true);
        }
      }
    }
  );

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const userData = await authAPI.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated,
    login: login.mutate,
    logout,
    loginLoading: login.loading,
    loginError: login.error,
  };
}

// Error boundary hook
export function useErrorHandler() {
  const [errors, setErrors] = useState<Error[]>([]);

  const addError = useCallback((error: Error) => {
    setErrors(prev => [...prev, error]);
  }, []);

  const removeError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
  };
}