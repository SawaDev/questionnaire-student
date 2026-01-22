import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { mockQuestions } from '@/lib/mockExam';
import { useTranslation } from 'react-i18next';

type AnswerState = {
  selectedOption?: string; // single
  selectedOptions?: string[]; // multi
  isMarked?: boolean;
};
type AnswersMap = Record<number, AnswerState>;

interface ReviewAnswer {
  questionId: number;
  text: string;
  options: Array<{ id: string; text: string }>;
  type: 'single' | 'multi';
  correctOptionIds: string[];
  selectedOptionIds: string[];
  isCorrect: boolean;
  points: number;
  isMarked: boolean;
  images?: string[];
}

const NO_RESULT_TOAST_ID = 'no-result-found';
const FAILED_LOAD_TOAST_ID = 'result-failed-load';

function gradeFromPercentage(p: number) {
  if (p >= 90) return 'A';
  if (p >= 80) return 'B';
  if (p >= 70) return 'C';
  if (p >= 60) return 'D';
  return 'F';
}

// ✅ strict: ALL correct selected and no extras
function isMultiCorrect(selected: string[], correct: string[]) {
  const s = [...selected].sort();
  const c = [...correct].sort();
  if (s.length !== c.length) return false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== c[i]) return false;
  }
  return true;
}

export function ResultPage() {
  const { t } = useTranslation();
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resultMeta, setResultMeta] = useState<{
    examTitle: string;
    score: number;
    totalPoints: number;
    submittedAt?: string;
    violationCount?: number;
  } | null>(null);

  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);

  useEffect(() => {
    if (!attemptId) {
      // ✅ avoid double toasts in dev StrictMode
      toast.dismiss(NO_RESULT_TOAST_ID);
      toast.dismiss(FAILED_LOAD_TOAST_ID);
      navigate('/login', { replace: true });
      return;
    }

    // ✅ If logged out (no session), don't even try to show errors/toasts
    // Prevents: user logs out -> presses Back -> old /result/:id mounts -> toasts appear
    const hasSession = !!localStorage.getItem('currentExam') && !!localStorage.getItem('currentAttempt');
    if (!hasSession) {
      toast.dismiss(NO_RESULT_TOAST_ID);
      toast.dismiss(FAILED_LOAD_TOAST_ID);
      navigate('/login', { replace: true });
      return;
    }

    try {
      const rawResult = localStorage.getItem(`result_${attemptId}`);

      if (!rawResult) {
        // ✅ only one toast (id) + also dismiss first to be safe in StrictMode
        toast.dismiss(NO_RESULT_TOAST_ID);
        toast.error(t('result.noResult'), { id: NO_RESULT_TOAST_ID });
        navigate('/login', { replace: true });
        return;
      }

      const stored = JSON.parse(rawResult);

      let answersMap: AnswersMap = {};
      try {
        const rawAnswers = localStorage.getItem(`answers_${attemptId}`);
        if (rawAnswers) answersMap = JSON.parse(rawAnswers);
      } catch {
        // ignore
      }

      const examTitle = stored?.examTitle || t('dashboard.mockExamTitle');
      const submittedAt = stored?.submittedAt;
      const violationCount = stored?.violationCount ?? 0;

      const review: ReviewAnswer[] = mockQuestions.map((q) => {
        const type = (q.type ?? 'single') as 'single' | 'multi';

        const correctOptionIds =
          type === 'multi'
            ? (q.correctOptionIds ?? [])
            : q.correctOptionId
            ? [q.correctOptionId]
            : [];

        const selectedOptionIds =
          type === 'multi'
            ? (answersMap[q.id]?.selectedOptions ?? [])
            : answersMap[q.id]?.selectedOption
            ? [answersMap[q.id]!.selectedOption!]
            : [];

        const isCorrect =
          type === 'multi'
            ? isMultiCorrect(selectedOptionIds, correctOptionIds)
            : selectedOptionIds.length === 1 &&
              correctOptionIds.length === 1 &&
              selectedOptionIds[0] === correctOptionIds[0];

        return {
          questionId: q.id,
          text: q.text,
          options: q.options,
          type,
          correctOptionIds,
          selectedOptionIds,
          isCorrect,
          points: 1,
          isMarked: !!answersMap[q.id]?.isMarked,
          images: q.images,
        };
      });

      const totalPoints = review.reduce((sum, a) => sum + a.points, 0);
      const score = review.reduce((sum, a) => sum + (a.isCorrect ? a.points : 0), 0);

      setAnswers(review);
      setResultMeta({ examTitle, score, totalPoints, submittedAt, violationCount });
    } catch {
      toast.dismiss(FAILED_LOAD_TOAST_ID);
      toast.error(t('result.failedLoad'), { id: FAILED_LOAD_TOAST_ID });
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [attemptId, navigate, t]);

  const handleLogout = () => {
    // ✅ clear session keys so Back can't reopen exam/result
    localStorage.removeItem('currentAttempt');
    localStorage.removeItem('currentExam');

    // optional auth keys
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // ✅ also dismiss any toasts from result page
    toast.dismiss(NO_RESULT_TOAST_ID);
    toast.dismiss(FAILED_LOAD_TOAST_ID);

    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('result.loading')}</p>
        </div>
      </div>
    );
  }

  if (!resultMeta) return null;

  const percentage = Math.round((resultMeta.score / resultMeta.totalPoints) * 100);
  const grade = gradeFromPercentage(percentage);

  // ✅ 24-hour format
  const submittedAtText = resultMeta.submittedAt
    ? new Date(resultMeta.submittedAt).toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '-';

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-muted/30">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{resultMeta.examTitle}</CardTitle>
            <CardDescription>
              {t('result.title')}
              {resultMeta.submittedAt ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  • {t('result.submitted', { date: submittedAtText })}
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('result.score')}</p>
                <p className="text-3xl font-bold">
                  {resultMeta.score} / {resultMeta.totalPoints}
                </p>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('result.percentage')}</p>
                <p className="text-3xl font-bold">{percentage}%</p>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('result.grade')}</p>
                <p className="text-3xl font-bold">{grade}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('result.violations')}</p>
                <p className="text-xl font-semibold">{resultMeta.violationCount ?? 0}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('result.notes')}</p>
                <p className="text-sm text-muted-foreground">{t('result.mockNote')}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={handleLogout} className="w-full sm:w-auto">
                {t('result.logout')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Answers */}
        <Card>
          <CardHeader>
            <CardTitle>{t('result.reviewTitle')}</CardTitle>
            <CardDescription>{t('result.reviewDesc')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {answers.map((answer, index) => (
              <div
                key={answer.questionId}
                className={`p-4 rounded-lg border-2 ${
                  answer.isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-destructive bg-destructive/10'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {answer.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive mt-1" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">
                        {t('result.questionNumber', { number: index + 1 })}
                      </span>

                      {answer.isMarked && (
                        <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                          {t('result.markedForReview')}
                        </span>
                      )}

                      <span className="text-sm text-muted-foreground ml-auto">
                        {t('result.points', { count: answer.points })}
                      </span>
                    </div>

                    <p className="font-medium mb-3">{answer.text}</p>

                    {answer.type === 'multi' && (
                      <p className="text-xs text-muted-foreground">
                        {t('result.multiSelectHint')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 ml-8">
                  {answer.options.map((option) => {
                    const isCorrect = answer.correctOptionIds.includes(option.id);
                    const isSelected = answer.selectedOptionIds.includes(option.id);

                    let bgColor = 'bg-background';
                    if (isCorrect) bgColor = 'bg-green-100 dark:bg-green-900';
                    if (isSelected && !isCorrect) bgColor = 'bg-destructive/20';

                    return (
                      <div
                        key={option.id}
                        className={`p-3 rounded border ${bgColor} ${isCorrect ? 'border-green-500' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.id}.</span>
                          <span>{option.text}</span>

                          {isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                          )}
                          {isSelected && !isCorrect && (
                            <XCircle className="h-4 w-4 text-destructive ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {answer.selectedOptionIds.length === 0 && (
                  <div className="mt-3 ml-8 flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{t('result.noAnswer')}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
