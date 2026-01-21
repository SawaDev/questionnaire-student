import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockQuestions } from '@/lib/mockExam';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type AnswerState = { selectedOption?: string; isMarked?: boolean };
type AnswersMap = Record<number, AnswerState>;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExamPage() {
  const { t } = useTranslation();

  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const questions = useMemo(() => mockQuestions, []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [examTitle, setExamTitle] = useState('Mock Exam');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [violationCount, setViolationCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswersMap>({});

  // timer persistence (frontend-only “server-like”)
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const displayTime = formatTime(Math.max(0, remainingSeconds));
  const isWarning = remainingSeconds <= 5 * 60;
  const isExpired = remainingSeconds <= 0;

  // Load exam + attempt info
  useEffect(() => {
    if (!attemptId) {
      toast.error(t('errors.missingAttemptId'));
      navigate('/dashboard');
      return;
    }

    // Load exam title + duration from localStorage
    let durationSeconds = 60 * 60; // default 60 minutes
    const storedExam = localStorage.getItem('currentExam');
    if (storedExam) {
      try {
        const exam = JSON.parse(storedExam);
        if (exam?.title) setExamTitle(exam.title);
        durationSeconds =
          Number(exam?.duration_seconds) ||
          (Number(exam?.durationMinutes) ? Number(exam.durationMinutes) * 60 : durationSeconds);
      } catch {
        // ignore
      }
    }

    // Ensure attempt meta exists (for resume logic)
    const attemptKey = `attempt_${attemptId}`;
    const existing = localStorage.getItem(attemptKey);

    if (!existing) {
      const startedAt = Date.now();
      const meta = { startedAt, durationSeconds };
      localStorage.setItem(attemptKey, JSON.stringify(meta));
    }

    // Restore answers
    try {
      const raw = localStorage.getItem(`answers_${attemptId}`);
      if (raw) setAnswers(JSON.parse(raw));
    } catch {
      // ignore
    }

    setLoading(false);
  }, [attemptId, navigate, t]);

  // Persist answers
  useEffect(() => {
    if (!attemptId) return;
    localStorage.setItem(`answers_${attemptId}`, JSON.stringify(answers));
  }, [answers, attemptId]);

  // Compute remaining time from startedAt + durationSeconds (resume after refresh)
  useEffect(() => {
    if (!attemptId || loading) return;

    const attemptKey = `attempt_${attemptId}`;
    const raw = localStorage.getItem(attemptKey);
    if (!raw) return;

    let startedAt = Date.now();
    let durationSeconds = 60 * 60;

    try {
      const meta = JSON.parse(raw);
      startedAt = Number(meta.startedAt) || startedAt;
      durationSeconds = Number(meta.durationSeconds) || durationSeconds;
    } catch {
      // ignore
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, durationSeconds - elapsed);
      setRemainingSeconds(left);

      if (left === 0) {
        // auto submit once
        const doneKey = `completed_${attemptId}`;
        if (localStorage.getItem(doneKey) !== 'true') {
          toast.info(t('exam.timesUpAutoSubmitting'));
          doSubmit(true);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, loading, t]);

  // Online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Anti-cheat (UI-only)
  useEffect(() => {
    const logViolation = (type: string) => {
      setViolationCount((prev) => {
        const next = prev + 1;
        if (next === 1) toast.warning(t('exam.monitoringActive'));
        if (type === 'blur') toast.warning(t('exam.noSwitchTabs'));
        return next;
      });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logViolation('contextmenu');
    };
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('copy');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('paste');
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('cut');
    };
    const handleBlur = () => logViolation('blur');

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      window.removeEventListener('blur', handleBlur);
    };
  }, [t]);

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  const handleAnswerChange = (optionId: string) => {
    const q = questions[currentIndex];
    if (!q) return;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...(prev[q.id] || {}), selectedOption: optionId },
    }));
  };

  const handleMarkForReview = () => {
    const q = questions[currentIndex];
    if (!q) return;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...(prev[q.id] || {}), isMarked: !(prev[q.id]?.isMarked ?? false) },
    }));
  };

  const answeredCount = questions.filter((q) => answers[q.id]?.selectedOption).length;

  const handleSubmit = () => {
    const unanswered = questions.filter((q) => !answers[q.id]?.selectedOption);
    if (unanswered.length > 0) {
      setShowSubmitDialog(true);
      return;
    }
    doSubmit(false);
  };

  const doSubmit = (auto: boolean) => {
    if (!attemptId) return;

    const result = {
      attemptId,
      examTitle,
      submittedAt: new Date().toISOString(),
      autoSubmitted: auto,
      answers,
      violationCount,
      totalQuestions: questions.length,
      answeredCount,
    };

    localStorage.setItem(`result_${attemptId}`, JSON.stringify(result));
    localStorage.setItem(`completed_${attemptId}`, 'true');

    toast.success(auto ? t('exam.autoSubmitted') : t('exam.submitted'));
    navigate(`/result/${attemptId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('exam.loadingExam')}</p>
        </div>
      </div>
    );
  }

  if (attemptId && localStorage.getItem(`completed_${attemptId}`) === 'true') {
    navigate(`/result/${attemptId}`);
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className={`border-b sticky top-0 z-10 bg-background ${isWarning ? 'bg-destructive/10' : ''}`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg">{examTitle}</h1>

            {!isOnline ? (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <WifiOff className="h-4 w-4" />
                <span>{t('common.offline')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Wifi className="h-4 w-4" />
                <span>{t('common.online')}</span>
              </div>
            )}
          </div>

          <div className={`text-2xl font-mono font-bold ${isWarning ? 'text-destructive' : ''}`}>
            {displayTime}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentQuestion && (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('exam.questionOf', { current: currentIndex + 1, total: questions.length })}
                    </span>

                    <Button variant="outline" size="sm" onClick={handleMarkForReview}>
                      {currentAnswer?.isMarked ? t('exam.unmark') : t('exam.mark')} {t('exam.forReview')}
                    </Button>
                  </div>

                  {/* DO NOT translate question text (backend later) */}
                  <h2 className="text-xl font-semibold">{currentQuestion.text}</h2>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleAnswerChange(option.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          currentAnswer?.selectedOption === option.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              currentAnswer?.selectedOption === option.id
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {currentAnswer?.selectedOption === option.id && (
                              <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>

                          <span className="font-medium">{option.id}.</span>
                          {/* DO NOT translate option text */}
                          <span>{option.text}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleNavigate(currentIndex - 1)}
                      disabled={currentIndex === 0}
                    >
                      {t('exam.previous')}
                    </Button>

                    <Button
                      onClick={() => handleNavigate(currentIndex + 1)}
                      disabled={currentIndex === questions.length - 1}
                    >
                      {t('exam.next')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Navigation Palette */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">{t('exam.navigation')}</h3>

                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => {
                    const a = answers[q.id];
                    const isAnswered = !!a?.selectedOption;
                    const isMarked = !!a?.isMarked;
                    const isCurrent = index === currentIndex;

                    let classes = 'bg-muted text-foreground';
                    if (isCurrent) classes = 'bg-yellow-500 text-white';
                    else if (isMarked) classes = 'bg-orange-500 text-white';
                    else if (isAnswered) classes = 'bg-green-500 text-white';

                    return (
                      <button
                        key={q.id}
                        onClick={() => handleNavigate(index)}
                        className={`aspect-square rounded-md font-medium text-sm transition-all ${classes} ${
                          isCurrent ? 'ring-2 ring-ring' : ''
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-muted" />
                    <span>{t('exam.unanswered')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>{t('exam.answered')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-500" />
                    <span>{t('exam.marked')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span>{t('exam.current')}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {t('exam.progress', { answered: answeredCount, total: questions.length })}
                  </p>
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={handleSubmit}
                  disabled={answeredCount < questions.length || isExpired}
                >
                  {t('exam.finish')}
                </Button>

                {isExpired && (
                  <p className="text-xs text-destructive mt-2">{t('exam.timeUpSubmitting')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exam.unansweredDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('exam.unansweredDialogDesc', { count: questions.length - answeredCount })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              {t('exam.cancel')}
            </Button>
            <Button onClick={() => doSubmit(false)}>{t('exam.submitAnyway')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
