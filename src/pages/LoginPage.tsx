import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

  const [subjectId, setSubjectId] = useState<string>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [subjects, setSubjects] = useState<
    Array<{ id: number; name: string; code: string }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // UI-only: no backend, just use local subjects
    setSubjects([
      { id: 1, name: 'Mathematics', code: 'MATH101' },
      { id: 2, name: 'Computer Science', code: 'CS101' },
      { id: 3, name: 'Physics', code: 'PHYS101' },
      { id: 4, name: 'Chemistry', code: 'CHEM101' },
      { id: 5, name: 'Biology', code: 'BIO101' },
    ]);
    setSubjectsLoading(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectId || !username || !password) {
      toast.error(t('login.fillAll'));
      return;
    }

    setLoading(true);
    try {
      const response = await login(Number(subjectId), username, password);
      toast.success(t('login.success'));

      // Store exam info for dashboard
      localStorage.setItem('currentExam', JSON.stringify(response.exam));

      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from);
    } catch (error: any) {
      toast.error(error?.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-muted/30 relative">
      {/* Language switcher */}
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
                <Label htmlFor="subject">{t('login.subject')}</Label>

                <Select
                  value={subjectId}
                  onValueChange={setSubjectId}
                  required
                  disabled={subjectsLoading}
                >
                  <SelectTrigger id="subject" className="w-full">
                    <SelectValue
                      placeholder={
                        subjectsLoading
                          ? t('login.loadingSubjects')
                          : t('login.subjectPlaceholder')
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {subjects.length === 0 && !subjectsLoading ? (
                      <SelectItem value="none" disabled>
                        {t('login.noSubjects')}
                      </SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={String(subject.id)}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {subjects.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('login.subjectsAvailable', { count: subjects.length })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t('login.studentId')}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('login.studentIdPlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
