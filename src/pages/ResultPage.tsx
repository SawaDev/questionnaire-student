import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resultsApi } from '@/lib/api';
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
import { useTranslation } from 'react-i18next';
import { formatNewTab } from '@/lib/utils';

interface ReviewAnswer {
  questionId: number;
  text: string;
  description?: string;
  options: Array<{ id: string; text: string; is_correct?: boolean }>;
  type: 'single' | 'multi';
  selectedOptionIds: string[];
  isCorrect: boolean;
  isMarked: boolean;
  images?: string[];
}

const NO_RESULT_TOAST_ID = 'no-result-found';
const FAILED_LOAD_TOAST_ID = 'result-failed-load';

export function ResultPage() {
  const { t } = useTranslation();
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resultMeta, setResultMeta] = useState<{
    examTitle: string;
    scoreNumerator: number;
    scoreDenominator: number;
    percentage: number;
    grade: string;
    submittedAt?: string;
    violationCount?: number;
  } | null>(null);

  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);

  useEffect(() => {
    if (!attemptId) {
      toast.dismiss(NO_RESULT_TOAST_ID);
      toast.dismiss(FAILED_LOAD_TOAST_ID);
      navigate('/login', { replace: true });
      return;
    }

    const fetchResult = async () => {
      try {
        const resultRes = await resultsApi.getResult(Number(attemptId));
        const resultData = resultRes.data;

        // Use the exam and questions from the backend result (which now includes snapshots)
        const exam = resultData.exam;
        const questions = exam.questions || [];

        const review: ReviewAnswer[] = questions.map((q: any) => {
          const qResult = resultData.questionResults?.find((r: any) => r.questionId === q.id);
          const isCorrect = qResult ? qResult.isCorrect : false;

          const studentAnswer = resultData.answers?.[q.id];
          const selectedOptionIds = Array.isArray(studentAnswer)
            ? studentAnswer.map(String)
            : studentAnswer !== undefined && studentAnswer !== null ? [String(studentAnswer)] : [];

          return {
            questionId: q.id,
            text: q.title,
            description: q.description,
            options: q.options.map((o: any) => ({ 
              id: String(o.id), 
              text: o.text,
              is_correct: o.is_correct // Ensure this is passed through
            })),
            type: q.options.filter((o: any) => o.is_correct).length > 1 ? 'multi' : 'single',
            correctOptionIds: [],
            selectedOptionIds,
            isCorrect,
            isMarked: false,
            images: q.assets || [],
          };
        });

        const sd = resultData.scoreDisplay as
          | { numerator?: number; denominator?: number }
          | undefined;
        const correct = resultData.correctAnswersCount ?? 0;
        const totalQ = resultData.totalQuestionsCount ?? 0;
        const scoreNumerator = sd?.numerator ?? resultData.score ?? correct;
        const scoreDenominator =
          sd?.denominator ??
          (totalQ > 0 ? totalQ : Math.max(1, review.length));

        let percentage: number;
        if (
          typeof resultData.percentage === 'number' &&
          !Number.isNaN(resultData.percentage)
        ) {
          percentage = Math.round(resultData.percentage);
        } else if (totalQ > 0) {
          percentage = Math.round((correct / totalQ) * 100);
        } else {
          percentage = 0;
        }

        setAnswers(review);
        setResultMeta({
          examTitle: exam.title,
          scoreNumerator,
          scoreDenominator,
          percentage,
          grade: resultData.grade,
          submittedAt: resultData.finishedAt,
          violationCount: resultData.violations?.length || 0,
        });
      } catch (error) {
        toast.dismiss(FAILED_LOAD_TOAST_ID);
        toast.error(t('result.failedLoad'), { id: FAILED_LOAD_TOAST_ID });
        navigate('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId, navigate, t]);

  const handleLogout = () => {
    localStorage.removeItem('currentAttempt');
    localStorage.removeItem('current_exam_id');
    localStorage.removeItem('student_user');

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

  const percentage = resultMeta.percentage;
  const grade = resultMeta.grade;

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
                  {resultMeta.scoreNumerator} / {resultMeta.scoreDenominator}
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
                className={`p-4 rounded-lg border-2 ${answer.isCorrect
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
                    </div>

                    <p className="font-medium mb-1 whitespace-pre-wrap">{answer.text}</p>
                    {answer.description && (
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                        {formatNewTab(answer.description)}
                      </p>
                    )}

                    {answer.type === 'multi' && (
                      <p className="text-xs text-muted-foreground">
                        {t('result.multiSelectHint')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 ml-8">
                    {answer.options.map((option: any) => {
                      const isSelected = answer.selectedOptionIds.includes(String(option.id));
                      const isCorrect = option.is_correct;

                      let bgColor = 'bg-background';
                      let borderColor = 'border-border';
                      let showCheck = false;
                      let showX = false;

                      if (isCorrect) {
                        if (isSelected) {
                          bgColor = 'bg-green-100 dark:bg-green-900/30';
                          borderColor = 'border-green-500';
                          showCheck = true;
                        }
                      } else if (isSelected) {
                        bgColor = 'bg-destructive/10';
                        borderColor = 'border-destructive';
                        showX = true;
                      }

                    return (
                      <div
                        key={option.id}
                        className={`p-3 rounded border ${bgColor} ${borderColor}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {String.fromCharCode(65 + answer.options.indexOf(option))}.
                          </span>
                          <span className="whitespace-pre-wrap">{formatNewTab(option.text)}</span>

                          {showCheck && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                          )}
                          {showX && (
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
