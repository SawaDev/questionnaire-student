import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsApi, attemptsApi } from '@/lib/api';
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
import { CheckCircle2, Wifi, WifiOff, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type AnswerState = {
  selectedOption?: string; // single
  selectedOptions?: string[]; // multi
  isMarked?: boolean;
};
type AnswersMap = Record<number, AnswerState>;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const NO_EXAM_TOAST_ID = 'exam-no-exam';
const MISSING_ATTEMPT_TOAST_ID = 'missing-attempt-id';

export function ExamPage() {
  const { t } = useTranslation();
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [examTitle, setExamTitle] = useState('Loading...');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [violationCount, setViolationCount] = useState(0);

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

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [openImage, setOpenImage] = useState<string | null>(null);
  const [sessionOk, setSessionOk] = useState(false);

  // ✅ StrictMode guards
  const didInitRef = useRef(false);

  const displayTime = formatTime(Math.max(0, remainingSeconds));
  const isWarning = remainingSeconds <= 5 * 60;
  const isExpired = remainingSeconds <= 0;

  // ✅ Session/auth guard (prevents opening exam after logout via Back)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (!attemptId) {
      toast.error(t('errors.missingAttemptId'), { id: MISSING_ATTEMPT_TOAST_ID });
      navigate('/login', { replace: true });
      return;
    }

    const storedAttempt = localStorage.getItem('currentAttempt');
    if (!storedAttempt) {
      toast.error(t('errors.noExam'), { id: NO_EXAM_TOAST_ID });
      setSessionOk(false);
      navigate('/login', { replace: true });
      return;
    }

    const fetchExamData = async () => {
      try {
        const attempt = JSON.parse(storedAttempt);
        const examId = attempt.exam?.id || attempt.examId;
        
        if (!examId) {
          throw new Error("Missing exam ID in attempt data");
        }
        
        const [examRes, questionsRes, stateRes] = await Promise.all([
          examsApi.getExam(examId),
          examsApi.getQuestions(examId),
          attemptsApi.getState(Number(attemptId))
        ]);

        setExamTitle(examRes.data.title);
        setQuestions(questionsRes.data);
        
        // Map backend state to frontend answers map
        const backendAnswers = stateRes.data.answers || {};
        const mappedAnswers: AnswersMap = {};
        Object.entries(backendAnswers).forEach(([qId, val]: [string, any]) => {
          mappedAnswers[Number(qId)] = {
            selectedOptions: Array.isArray(val) ? val : undefined,
            selectedOption: !Array.isArray(val) ? val : undefined,
          };
        });
        setAnswers(mappedAnswers);

        // Timer setup
        const durationSeconds = examRes.data.duration * 60;
        const startedAt = new Date(stateRes.data.startedAt).getTime();
        
        const updateTimer = () => {
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          const left = Math.max(0, durationSeconds - elapsed);
          setRemainingSeconds(left);
          
          if (left === 0) {
            doSubmit(true);
          }
        };

        updateTimer();
        const timerId = setInterval(updateTimer, 1000);

        setSessionOk(true);
        return () => clearInterval(timerId);
      } catch (error) {
        toast.error(t('errors.invalidExam'), { id: 'exam-invalid-exam' });
        setSessionOk(false);
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchExamData();
  }, [attemptId, navigate, t]);

  const handleSingleAnswerChange = async (optionId: string) => {
    const q = questions[currentIndex];
    if (!q) return;

    try {
      await attemptsApi.saveAnswer(Number(attemptId), q.id, optionId);
      setAnswers((prev) => ({
        ...prev,
        [q.id]: { ...(prev[q.id] || {}), selectedOption: optionId },
      }));
    } catch (error) {
      toast.error('Failed to save answer');
    }
  };

  const handleMultiAnswerToggle = async (optionId: string) => {
    const q = questions[currentIndex];
    if (!q) return;

    const existing = answers[q.id]?.selectedOptions ?? [];
    const nextSelected = existing.includes(optionId)
      ? existing.filter((x) => x !== optionId)
      : [...existing, optionId];

    try {
      // Assuming backend supports array for multi-select
      await attemptsApi.saveAnswer(Number(attemptId), q.id, nextSelected as any);
      setAnswers((prev) => ({
        ...prev,
        [q.id]: { ...(prev[q.id] || {}), selectedOptions: nextSelected },
      }));
    } catch (error) {
      toast.error('Failed to save answer');
    }
  };

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  const handleMarkForReview = () => {
    const q = questions[currentIndex];
    if (!q) return;

    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...(prev[q.id] || {}), isMarked: !(prev[q.id]?.isMarked ?? false) },
    }));
  };

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    const isMulti = (q.type ?? 'single') === 'multi';
    if (isMulti) return (a?.selectedOptions?.length ?? 0) > 0;
    return !!a?.selectedOption;
  }).length;

  const handleSubmit = () => {
    const unansweredNotFlagged = questions.filter((q) => {
      const a = answers[q.id];
      const isMulti = (q.type ?? 'single') === 'multi';

      const unanswered = isMulti
        ? (a?.selectedOptions?.length ?? 0) === 0
        : !a?.selectedOption;

      const flagged = !!a?.isMarked;
      return unanswered && !flagged;
    });

    if (unansweredNotFlagged.length > 0) {
      setShowSubmitDialog(true);
      return;
    }

    doSubmit(false);
  };

  const doSubmit = async (auto: boolean) => {
    if (!attemptId) return;

    try {
      await attemptsApi.submitAttempt(Number(attemptId));
      localStorage.setItem(`completed_${attemptId}`, 'true');

      toast.success(auto ? t('exam.autoSubmitted') : t('exam.submitted'), {
        id: auto ? 'exam-auto-submitted' : 'exam-submitted',
      });

      navigate(`/result/${attemptId}`, { replace: true });
    } catch (error) {
      toast.error('Failed to submit exam');
    }
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

  // ✅ If completed, never show exam again
  if (attemptId && localStorage.getItem(`completed_${attemptId}`) === 'true') {
    navigate(`/result/${attemptId}`, { replace: true });
    return null;
  }

  // ✅ If session became invalid (logout + back), redirect immediately (no flashes)
  if (!sessionOk) {
    navigate('/login', { replace: true });
    return null;
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const unansweredNotFlaggedCount = questions.filter((q) => {
    const a = answers[q.id];
    const isMulti = (q.type ?? 'single') === 'multi';

    const unanswered = isMulti
      ? (a?.selectedOptions?.length ?? 0) === 0
      : !a?.selectedOption;

    const flagged = !!a?.isMarked;
    return unanswered && !flagged;
  }).length;

  const isMulti = (currentQuestion?.type ?? 'single') === 'multi';
  const selectedSingle = currentAnswer?.selectedOption;
  const selectedMulti = currentAnswer?.selectedOptions ?? [];

  return (
    <div className="min-h-screen bg-background">
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

                  <h2 className="text-xl font-semibold whitespace-pre-wrap">
                    {currentQuestion.title}
                  </h2>

                  {currentQuestion.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {currentQuestion.description.split('\\n').join('\n')}
                    </p>
                  )}

                  {currentQuestion.images?.length ? (
                    <div className="flex flex-wrap gap-3">
                      {currentQuestion.images.map((src: string) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setOpenImage(src)}
                          className="border rounded-lg overflow-hidden hover:opacity-90"
                        >
                          <img src={src} alt="Question" className="h-28 w-auto object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {currentQuestion.options.map((option: { id: string; text: string }) => {
                      const isSelected = isMulti
                        ? selectedMulti.includes(option.id)
                        : selectedSingle === option.id;

                      const onPick = () => {
                        if (isMulti) handleMultiAnswerToggle(option.id);
                        else handleSingleAnswerChange(option.id);
                      };

                      return (
                        <button
                          key={option.id}
                          onClick={onPick}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                            </div>

                            <span className="font-medium">{option.id}.</span>
                            <span>{option.text}</span>
                          </div>
                        </button>
                      );
                    })}
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

          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">{t('exam.navigation')}</h3>

                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q: any, index: number) => {
                    const a = answers[q.id];
                    const qIsMulti = (q.type ?? 'single') === 'multi';

                    const isAnswered = qIsMulti
                      ? (a?.selectedOptions?.length ?? 0) > 0
                      : !!a?.selectedOption;

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
                        className={`relative aspect-square rounded-md font-medium text-sm transition-all ${classes} ${
                          isCurrent ? 'ring-2 ring-ring' : ''
                        }`}
                      >
                        {index + 1}
                        {isMarked && (
                          <Flag className="absolute top-1 right-1 h-3.5 w-3.5 text-white/90" />
                        )}
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
                    <div className="w-4 h-4 rounded bg-orange-500 flex items-center justify-center">
                      <Flag className="h-3 w-3 text-white" />
                    </div>
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

                  {unansweredNotFlaggedCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {unansweredNotFlaggedCount} unanswered (not flagged)
                    </p>
                  )}
                </div>

                <Button className="w-full mt-4" onClick={handleSubmit} disabled={isExpired}>
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

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exam.unansweredDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('exam.unansweredDialogDesc', { count: unansweredNotFlaggedCount })}
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

      <Dialog open={!!openImage} onOpenChange={(v) => !v && setOpenImage(null)}>
        <DialogContent className="max-w-4xl">
          {openImage && (
            <img
              src={openImage}
              alt="Full"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
