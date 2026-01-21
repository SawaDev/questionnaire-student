import { useState, useEffect, useCallback } from 'react';
import { attemptsApi } from '@/lib/api';

interface AttemptState {
  status: 'active' | 'completed' | 'expired';
  remainingSeconds: number;
  answers: Record<number, { selectedOption: string; isMarked: boolean }>;
  currentQuestionIndex: number;
  questionCount: number;
}

export function useAttemptState(attemptId: number | null, pollInterval = 5000) {
  const [state, setState] = useState<AttemptState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!attemptId) return;

    try {
      const response = await attemptsApi.getState(attemptId);
      setState(response.data);
      setError(null);

      // If completed, stop polling
      if (response.data.status === 'completed') {
        return true; // Signal to stop polling
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch attempt state');
    } finally {
      setLoading(false);
    }
    return false;
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) return;

    fetchState();

    const interval = setInterval(async () => {
      const shouldStop = await fetchState();
      if (shouldStop) {
        clearInterval(interval);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [attemptId, fetchState, pollInterval]);

  const saveAnswer = async (questionId: number, selectedOption: string, isMarked?: boolean) => {
    if (!attemptId) return;

    try {
      await attemptsApi.saveAnswer(attemptId, questionId, selectedOption, isMarked);
      // Optimistically update local state
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: { selectedOption, isMarked: isMarked || false },
          },
        };
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save answer');
      throw err;
    }
  };

  const submitAttempt = async () => {
    if (!attemptId) return;

    try {
      await attemptsApi.submitAttempt(attemptId);
      await fetchState();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit attempt');
      throw err;
    }
  };

  return {
    state,
    loading,
    error,
    saveAnswer,
    submitAttempt,
    refreshState: fetchState,
  };
}
