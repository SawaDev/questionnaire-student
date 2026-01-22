import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Clock, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NO_EXAM_TOAST_ID = 'dashboard-no-exam';
const INVALID_EXAM_TOAST_ID = 'dashboard-invalid-exam';

export function DashboardPage() {
  const { t } = useTranslation();

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ StrictMode guard: do not run "load exam" logic twice
  const didInitRef = useRef(false);

  // ✅ Lock browser back button on dashboard (prevents returning to Result/Exam)
  const dashLockRef = useRef(false);
  useEffect(() => {
    if (location.pathname !== '/dashboard') return;
    if (dashLockRef.current) return;
    dashLockRef.current = true;

    // push one state so Back triggers popstate inside dashboard
    window.history.pushState({ dashboardLock: true }, '', window.location.href);

    const onPopState = () => {
      // stay on dashboard
      navigate('/dashboard', { replace: true });

      // push again so another Back still stays here
      window.history.pushState({ dashboardLock: true }, '', window.location.href);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      dashLockRef.current = false;
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const storedExam = localStorage.getItem('currentExam');
    if (!storedExam) {
      toast.error(t('errors.noExam'), { id: NO_EXAM_TOAST_ID });
      navigate('/login', { replace: true });
      return;
    }

    try {
      const examData = JSON.parse(storedExam);
      setExam(examData);
    } catch {
      toast.error(t('errors.invalidExam'), { id: INVALID_EXAM_TOAST_ID });
      navigate('/login', { replace: true });
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate, t]);

  const handleStartExam = async () => {
    if (!exam) return;

    setStarting(true);

    try {
      const attemptId = crypto.randomUUID();

      const durationMinutes =
        typeof exam?.duration_seconds === 'number'
          ? Math.floor(exam.duration_seconds / 60)
          : typeof exam?.durationMinutes === 'number'
          ? exam.durationMinutes
          : 60;

      const questionCount =
        typeof exam?.question_count === 'number'
          ? exam.question_count
          : typeof exam?.totalQuestions === 'number'
          ? exam.totalQuestions
          : 9;

      const attemptData = {
        attemptId,
        examId: exam.id ?? 1,
        examTitle: exam.title ?? t('dashboard.mockExamTitle'),
        durationMinutes,
        totalQuestions: questionCount,
        startedAt: new Date().toISOString(),
      };

      localStorage.setItem('currentAttempt', JSON.stringify(attemptData));

      // ✅ replace so dashboard isn't reachable by browser back during exam
      navigate(`/exam/${attemptId}`, { replace: true });
    } catch (error: any) {
      toast.error(error?.message || t('errors.startExamFailed'), { id: 'start-exam-failed' });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const durationMinutes =
    typeof exam?.duration_seconds === 'number'
      ? Math.floor(exam.duration_seconds / 60)
      : typeof exam?.durationMinutes === 'number'
      ? exam.durationMinutes
      : 60;

  const questionCount =
    typeof exam?.question_count === 'number'
      ? exam.question_count
      : typeof exam?.totalQuestions === 'number'
      ? exam.totalQuestions
      : 9;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{exam.title ?? t('dashboard.mockExamTitle')}</CardTitle>
            <CardDescription>{t('dashboard.title')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('dashboard.duration')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.minutes', { count: durationMinutes })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="mt-1 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('dashboard.questions')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.questionsCount', { count: questionCount })}
                  </p>
                </div>
              </div>

              {exam.instructions && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-1 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('dashboard.instructions')}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {exam.instructions}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">{t('dashboard.rulesTitle')}</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>{t('dashboard.rule1')}</li>
                  <li>{t('dashboard.rule2')}</li>
                  <li>{t('dashboard.rule3')}</li>
                  <li>{t('dashboard.rule4')}</li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleStartExam}
                disabled={starting}
                className="w-full sm:w-auto"
                size="lg"
              >
                {starting ? t('dashboard.startingExam') : t('dashboard.startExam')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
