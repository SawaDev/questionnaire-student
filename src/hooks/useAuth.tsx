import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { examsApi } from '@/lib/api';

interface User {
  id: number;
  username: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (examId: string, studentId: number, otp: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keys for localStorage
const LS_USER_KEY = 'student_user';
const LS_EXAM_ID_KEY = 'current_exam_id';

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const raw = localStorage.getItem(LS_USER_KEY);
      if (raw) {
        setUser(JSON.parse(raw) as User);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (examId: string, studentId: number, otp: string) => {
    const response = await examsApi.verifyOtp(examId, studentId, otp);
    
    if (response.data.success) {
      const studentUser: User = {
        id: response.data.student.id,
        username: response.data.student.username,
      };

      setUser(studentUser);
      localStorage.setItem(LS_USER_KEY, JSON.stringify(studentUser));
      localStorage.setItem(LS_EXAM_ID_KEY, examId);
      
      return response.data;
    } else {
      throw new Error('Verification failed');
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_EXAM_ID_KEY);
    localStorage.removeItem('currentAttempt');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
