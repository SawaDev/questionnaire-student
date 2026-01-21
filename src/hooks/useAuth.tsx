import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (subjectId: number, username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keys for localStorage (so refresh keeps you logged in)
const LS_USER_KEY = 'mock_user';
const LS_EXAM_KEY = 'currentExam';

function getMockSubjects() {
  return [
    { id: 1, name: 'Mathematics', code: 'MATH101' },
    { id: 2, name: 'Computer Science', code: 'CS101' },
    { id: 3, name: 'Physics', code: 'PHYS101' },
    { id: 4, name: 'Chemistry', code: 'CHEM101' },
    { id: 5, name: 'Biology', code: 'BIO101' },
  ];
}

function buildMockExam(subjectId: number) {
  const subject = getMockSubjects().find((s) => s.id === subjectId) ?? getMockSubjects()[0];

  return {
    id: subject.id,
    title: `${subject.name} Exam`,
    description: `This is a mock exam for ${subject.name} (${subject.code}).`,
    durationMinutes: 60,
    totalQuestions: 10,
    subject,
  };
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    // FRONTEND-ONLY: restore from localStorage
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

  const login = async (subjectId: number, username: string, password: string) => {
    // FRONTEND-ONLY MOCK RULES:
    // Accept student1/password123 or student2/password123
    const okUser =
      (username === 'student1' || username === 'student2') && password === 'password123';

    if (!okUser) {
      // Shape matches what your LoginPage expects (error.message is enough)
      throw new Error('Invalid credentials (mock). Try student1/password123.');
    }

    const mockUser: User = {
      id: username === 'student1' ? 1 : 2,
      username,
      full_name: username === 'student1' ? 'Student One' : 'Student Two',
    };

    const mockExam = buildMockExam(subjectId);

    setUser(mockUser);
    localStorage.setItem(LS_USER_KEY, JSON.stringify(mockUser));
    localStorage.setItem(LS_EXAM_KEY, JSON.stringify(mockExam));

    // Return structure similar to backend response
    return {
      user: mockUser,
      exam: mockExam,
    };
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_EXAM_KEY);
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
