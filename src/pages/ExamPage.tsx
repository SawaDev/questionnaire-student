import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import { formatNewTab } from '@/lib/utils';
import alertSound from '@/assets/alert.ogg';
import { Input } from '@/components/ui/input';

type AnswerState = {
  selectedOption?: string; // single -> option.id (string)
  selectedOptions?: string[]; // multi -> option.id[] (string[])
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

// ✅ TEMP (long-term: move to backend)
const TEACHER_PASSWORD = '307988079+';

function toStrId(v: unknown): string {
  // Normalize any id (number|string) -> string
  if (v === null || v === undefined) return '';
  return String(v);
}

function normalizeBackendAnswer(val: any): { single?: string; multi?: string[] } {
  if (Array.isArray(val)) {
    return { multi: val.map(toStrId).filter(Boolean) };
  }
  if (val === null || val === undefined) return {};
  return { single: toStrId(val) };
}

// Determine question type safely even if backend doesn't send it
function isQuestionMulti(q: any): boolean {
  const explicit = String(q?.type ?? '').toLowerCase();
  if (explicit === 'multi') return true;
  if (explicit === 'single') return false;

  // Fallback: if backend sends "allowMultipleCorrect" or "correctOptionIds"
  if (q?.allowMultipleCorrect === true) return true;

  const correctIds = q?.correctOptionIds;
  if (Array.isArray(correctIds) && correctIds.length > 1) return true;

  // Default
  return false;
}

export function ExamPage() {
  const { t } = useTranslation();
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const LOCK_KEY = useMemo(() => (attemptId ? `exam_lock_${attemptId}` : ''), [attemptId]);
  const LOCK_REASON_KEY = useMemo(() => (attemptId ? `exam_lock_reason_${attemptId}` : ''), [attemptId]);

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [examTitle, setExamTitle] = useState('Loading...');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [openImage, setOpenImage] = useState<string | null>(null);
  const [sessionOk, setSessionOk] = useState(false);

  // ✅ LOCK state
  const [isLocked, setIsLocked] = useState(false);
  const [teacherPass, setTeacherPass] = useState('');
  const [lockReason, setLockReason] = useState<string>('');

  // prevents multiple lock triggers in a row
  const lockOnceRef = useRef(false);

  const didInitRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  const displayTime = formatTime(Math.max(0, remainingSeconds));
  const isWarning = remainingSeconds <= 5 * 60;
  const isExpired = remainingSeconds <= 0;

  // ✅ Restore LOCK after refresh (must be BEFORE anti-cheat listeners)
  useEffect(() => {
    if (!attemptId) return;

    const locked = localStorage.getItem(LOCK_KEY) === '1';
    const reason = localStorage.getItem(LOCK_REASON_KEY) || '';

    if (locked) {
      setIsLocked(true);
      setLockReason(reason);
      lockOnceRef.current = true;
    }
  }, [attemptId, LOCK_KEY, LOCK_REASON_KEY]);

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

  const doSubmit = useCallback(
    async (auto: boolean) => {
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
    },
    [attemptId, navigate, t],
  );

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

        if (!examId) throw new Error('Missing exam ID in attempt data');

        const [examRes, questionsRes, stateRes] = await Promise.all([
          examsApi.getExam(examId),
          examsApi.getQuestions(examId, Number(attemptId)),
          attemptsApi.getState(Number(attemptId)),
        ]);

        setExamTitle(examRes.data.title);

        // ✅ Normalize question + option ids to string to avoid mismatch bugs
        const normalizedQuestions = (questionsRes.data ?? []).map((q: any) => ({
          ...q,
          id: Number(q.id),
          options: (q.options ?? []).map((o: any) => ({
            ...o,
            id: toStrId(o.id),
          })),
        }));

        setQuestions(normalizedQuestions);

        // ✅ Map backend state to frontend answers map (normalize ids -> string)
        const backendAnswers = stateRes.data.answers || {};
        const mappedAnswers: AnswersMap = {};
        Object.entries(backendAnswers).forEach(([qId, val]: [string, any]) => {
          const n = normalizeBackendAnswer(val);
          mappedAnswers[Number(qId)] = {
            selectedOptions: n.multi,
            selectedOption: n.single,
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

          if (left === 0) doSubmit(true);
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
  }, [attemptId, navigate, t, doSubmit]);

  // ✅ lock helper (persists to localStorage)
  const lockExam = useCallback(
    async (reason: string) => {
      if (!attemptId) return;
      if (lockOnceRef.current) return;

      lockOnceRef.current = true;

      setLockReason(reason);
      setIsLocked(true);

      localStorage.setItem(LOCK_KEY, '1');
      localStorage.setItem(LOCK_REASON_KEY, reason);

      // Play alert sound
      try {
        const audio = new Audio(alertSound);
        audio.play().catch(() => {});
      } catch {}

      // setViolationCount((prev) => {
      //   const next = prev + 1;
      //   toast.warning(t('exam.violationWarning', { count: next }), { id: 'anti-cheat-violation' });
      //   return next;
      // });

      attemptsApi.recordViolation(Number(attemptId), reason).catch(console.error);
    },
    [attemptId, LOCK_KEY, LOCK_REASON_KEY, t],
  );

  // ✅ Anti-cheat: Prevent back navigation, copy/paste, inspect element + LOCK ON TAB SWITCH/BLUR
  useEffect(() => {
    if (!sessionOk) return;

    // 1. Prevent Back Navigation
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
      toast.error(t('exam.backDisabled'), { id: 'anti-cheat-back' });
    };

    // 2. Prevent Copy/Cut/Paste
    const onCopyPaste = (e: Event) => {
      e.preventDefault();
      toast.error(t('exam.copyDisabled'), { id: 'anti-cheat-copy' });
      attemptsApi.recordViolation(Number(attemptId), 'COPY_PASTE').catch(console.error);
    };

    // 3. Prevent Right Click (Context Menu)
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      attemptsApi.recordViolation(Number(attemptId), 'CONTEXT_MENU').catch(console.error);
    };

    // 4. Prevent Inspect Element Shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'u')
      ) {
        e.preventDefault();
        toast.error(t('exam.inspectDisabled'), { id: 'anti-cheat-inspect' });
        attemptsApi.recordViolation(Number(attemptId), 'DEV_TOOLS').catch(console.error);
      }
    };

    // 5. Detect Tab Switching (LOCK)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lockExam('TAB_SWITCH');
      }
    };

    // 6. Detect leaving window (ALT+TAB / click another app) (LOCK)
    const onBlur = () => {
      lockExam('WINDOW_BLUR');
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('copy', onCopyPaste);
    window.addEventListener('cut', onCopyPaste);
    window.addEventListener('paste', onCopyPaste);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('copy', onCopyPaste);
      window.removeEventListener('cut', onCopyPaste);
      window.removeEventListener('paste', onCopyPaste);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [sessionOk, t, attemptId, lockExam]);

  const handleSingleAnswerChange = async (rawOptionId: string) => {
    const q = questions[currentIndex];
    if (!q || !attemptId) return;

    const optionId = toStrId(rawOptionId);

    try {
      // ✅ always send option.id (string) to backend
      await attemptsApi.saveAnswer(Number(attemptId), q.id, optionId);

      setAnswers((prev) => ({
        ...prev,
        [q.id]: { ...(prev[q.id] || {}), selectedOption: optionId, selectedOptions: undefined },
      }));
    } catch (error) {
      toast.error('Failed to save answer');
    }
  };

  const handleMultiAnswerToggle = async (rawOptionId: string) => {
    const q = questions[currentIndex];
    if (!q || !attemptId) return;

    const optionId = toStrId(rawOptionId);

    const existing = answers[q.id]?.selectedOptions ?? [];
    const nextSelected = existing.includes(optionId)
      ? existing.filter((x) => x !== optionId)
      : [...existing, optionId];

    try {
      // ✅ always send option.id[] (string[]) to backend
      await attemptsApi.saveAnswer(Number(attemptId), q.id, nextSelected);

      setAnswers((prev) => ({
        ...prev,
        [q.id]: { ...(prev[q.id] || {}), selectedOptions: nextSelected, selectedOption: undefined },
      }));
    } catch (error) {
      toast.error('Failed to save answer');
    }
  };

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    const multi = isQuestionMulti(q);
    if (multi) return (a?.selectedOptions?.length ?? 0) > 0;
    return !!a?.selectedOption;
  }).length;

  const handleSubmit = () => {
    const unansweredNotFlagged = questions.filter((q) => {
      const a = answers[q.id];
      const multi = isQuestionMulti(q);

      const unanswered = multi ? (a?.selectedOptions?.length ?? 0) === 0 : !a?.selectedOption;
      const flagged = !!a?.isMarked;
      return unanswered && !flagged;
    });

    if (unansweredNotFlagged.length > 0) {
      setShowSubmitDialog(true);
      return;
    }

    doSubmit(false);
  };

  // ✅ Teacher unlock (removes localStorage lock so refresh won’t unlock again)
  const handleUnlock = () => {
    const entered = teacherPass.trim();
    if (!entered) {
      toast.error('Enter teacher password');
      return;
    }

    if (entered !== TEACHER_PASSWORD) {
      toast.error('Wrong password');
      return;
    }

    setTeacherPass('');
    setIsLocked(false);
    setLockReason('');

    localStorage.removeItem(LOCK_KEY);
    localStorage.removeItem(LOCK_REASON_KEY);

    lockOnceRef.current = false;
    toast.success('Unlocked. Continue exam.');
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

  // ✅ If session became invalid (logout + back), redirect immediately
  if (!sessionOk) {
    navigate('/login', { replace: true });
    return null;
  }

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const unansweredNotFlaggedCount = questions.filter((q) => {
    const a = answers[q.id];
    const multi = isQuestionMulti(q);
    const unanswered = multi ? (a?.selectedOptions?.length ?? 0) === 0 : !a?.selectedOption;
    const flagged = !!a?.isMarked;
    return unanswered && !flagged;
  }).length;

  const isMulti = currentQuestion ? isQuestionMulti(currentQuestion) : false;

  const selectedSingle = currentAnswer?.selectedOption ? toStrId(currentAnswer.selectedOption) : undefined;
  const selectedMulti = (currentAnswer?.selectedOptions ?? []).map(toStrId);

  return (
    <div className="min-h-screen bg-background">
      <div className={`border-b sticky top-0 z-10 bg-background ${isWarning ? 'bg-destructive/10' : ''}`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Logo" className="h-10 w-auto" />
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
                  </div>

                  <h2 className="text-xl font-semibold whitespace-pre-wrap">{currentQuestion.title}</h2>

                  {currentQuestion.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {formatNewTab(currentQuestion.description)}
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
                    {(currentQuestion.options ?? []).map((option: { id: string; text: string }) => {
                      const optId = toStrId(option.id);
                      const isSelected = isMulti ? selectedMulti.includes(optId) : selectedSingle === optId;

                      const onPick = () => {
                        if (isMulti) handleMultiAnswerToggle(optId);
                        else handleSingleAnswerChange(optId);
                      };

                      return (
                        <button
                          key={optId}
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

                            <span className="whitespace-pre-wrap">{formatNewTab(option.text)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => handleNavigate(currentIndex - 1)} disabled={currentIndex === 0}>
                      {t('exam.previous')}
                    </Button>

                    <Button onClick={() => handleNavigate(currentIndex + 1)} disabled={currentIndex === questions.length - 1}>
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
                <div className="flex justify-center mb-4">
                  <img src="/images/logo.png" alt="Logo" className="h-16 w-auto" />
                </div>
                <h3 className="font-semibold mb-4">{t('exam.navigation')}</h3>

                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q: any, index: number) => {
                    const a = answers[q.id];
                    const qIsMulti = isQuestionMulti(q);

                    const isAnswered = qIsMulti ? (a?.selectedOptions?.length ?? 0) > 0 : !!a?.selectedOption;
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
                        {isMarked && <Flag className="absolute top-1 right-1 h-3.5 w-3.5 text-white/90" />}
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
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span>{t('exam.current')}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {t('exam.progress', { answered: answeredCount, total: questions.length })}
                  </p>
                </div>

                <Button className="w-full mt-4" onClick={handleSubmit} disabled={isExpired}>
                  {t('exam.finish')}
                </Button>

                {isExpired && <p className="text-xs text-destructive mt-2">{t('exam.timeUpSubmitting')}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ✅ LOCK MODAL (persists after refresh, cannot close) */}
      <Dialog open={isLocked}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Exam paused</DialogTitle>
            <DialogDescription>
              You left the exam tab/window. Ask your teacher to enter the password to continue.
              {lockReason ? <span className="block mt-2 text-xs text-muted-foreground">Reason: {lockReason}</span> : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Teacher password"
              value={teacherPass}
              onChange={(e) => setTeacherPass(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button onClick={handleUnlock} className="w-full">
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exam.unansweredDialogTitle')}</DialogTitle>
            <DialogDescription>{t('exam.unansweredDialogDesc', { count: unansweredNotFlaggedCount })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              {t('exam.cancel')}
            </Button>
            <Button onClick={() => doSubmit(false)}>{t('exam.submitAnyway')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image dialog */}
      <Dialog open={!!openImage} onOpenChange={(v) => !v && setOpenImage(null)}>
        <DialogContent className="max-w-4xl">
          {openImage && <img src={openImage} alt="Full" className="w-full h-auto max-h-[80vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}