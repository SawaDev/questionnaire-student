import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { examsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [examId, setExamId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [otp, setOtp] = useState('');

  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await examsApi.getActiveExams();
        setExams(response.data);
      } catch (error) {
        toast.error('Failed to load active exams');
      } finally {
        setExamsLoading(false);
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (examId) {
      const fetchStudents = async () => {
        setStudentsLoading(true);
        try {
          const response = await examsApi.getAssignedStudents(examId);
          setStudents(response.data);
        } catch (error) {
          toast.error('Failed to load students for this exam');
        } finally {
          setStudentsLoading(false);
        }
      };
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [examId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examId || !studentId || !otp) {
      toast.error(t('login.fillAll'));
      return;
    }

    setLoading(true);
    try {
      const response = await login(examId, Number(studentId), otp);
      toast.success(t('login.success'));

      // Ensure the user state is updated before navigating
      setTimeout(() => {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }, 100);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-muted/30 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">{t('login.title')}</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam">{t('login.subject') || 'Exam'}</Label>
                <Select
                  value={examId}
                  onValueChange={setExamId}
                  required
                  disabled={examsLoading}
                >
                  <SelectTrigger id="exam" className="w-full">
                    <SelectValue
                      placeholder={
                        examsLoading
                          ? t('login.loadingSubjects')
                          : t('login.subjectPlaceholder')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={String(exam.id)}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student">{t('login.student') || 'Student'}</Label>
                <Select
                  value={studentId}
                  onValueChange={setStudentId}
                  required
                  disabled={studentsLoading || !examId}
                >
                  <SelectTrigger id="student" className="w-full">
                    <SelectValue
                      placeholder={
                        studentsLoading
                          ? 'Loading students...'
                          : 'Select your name'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={String(student.id)}>
                        {student.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">{t('login.otp') || 'OTP Code'}</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="text-center text-lg tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('login.loggingIn') : t('login.login')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
