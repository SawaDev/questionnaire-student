import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle errors silently for auth checks
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 401 errors (unauthorized) as they're expected when not logged in
    if (error.response?.status === 401) {
      return Promise.reject(error);
    }
    // Log other errors for debugging
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (subjectId: number, username: string, password: string) =>
    api.post('/auth/login', { subjectId, username, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getSubjects: () => api.get('/auth/subjects'),
};

// Exams API
export const examsApi = {
  getExam: (examId: number) => api.get(`/exams/${examId}`),
  getQuestions: (examId: number) => api.get(`/exams/${examId}/questions`),
};

// Attempts API
export const attemptsApi = {
  startAttempt: (examId: number) => api.post('/attempts/start', { examId }),
  getState: (attemptId: number) => api.get(`/attempts/${attemptId}/state`),
  saveAnswer: (attemptId: number, questionId: number, selectedOption: string, isMarked?: boolean) =>
    api.post(`/attempts/${attemptId}/answer`, { questionId, selectedOption, isMarked }),
  submitAttempt: (attemptId: number) => api.post(`/attempts/${attemptId}/submit`),
  logFocusEvent: (attemptId: number, eventType: string) =>
    api.post(`/attempts/${attemptId}/focus-log`, { eventType }),
};

// Results API
export const resultsApi = {
  getResult: (attemptId: number) => api.get(`/results/${attemptId}`),
};
