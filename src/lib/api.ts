import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

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
  getActiveExams: () => api.get('/exams/public/active'),
  getAssignedStudents: (examId: string) => api.get(`/exams/${examId}/public/students`),
  verifyOtp: (examId: string, studentId: number, otp: string) => 
    api.post(`/exams/${examId}/verify-otp`, { studentId, otp }),
};

// Attempts API
export const attemptsApi = {
  startAttempt: (examId: number, studentId: number) => api.post('/exams/attempts/start', { examId, studentId }),
  getState: (attemptId: number) => api.get(`/exams/attempts/${attemptId}/state`),
  saveAnswer: (attemptId: number, questionId: number, selectedOption: any) =>
    api.post(`/exams/attempts/${attemptId}/answer`, { questionId, selectedOption }),
  submitAttempt: (attemptId: number) => api.post(`/exams/attempts/${attemptId}/submit`),
  logFocusEvent: (attemptId: number, eventType: string) =>
    api.post(`/exams/attempts/${attemptId}/focus-log`, { eventType }),
};

// Results API
export const resultsApi = {
  getResult: (attemptId: number) => api.get(`/exams/results/${attemptId}`),
};
