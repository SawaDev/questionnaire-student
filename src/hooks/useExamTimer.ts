import { useState, useEffect } from 'react';

export function useExamTimer(remainingSeconds: number | null) {
  const [displayTime, setDisplayTime] = useState<string>('00:00');
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (remainingSeconds === null) {
      setDisplayTime('00:00');
      return;
    }

    const updateTimer = () => {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setDisplayTime(formatted);
      setIsWarning(remainingSeconds < 300); // Warning when less than 5 minutes
    };

    updateTimer();

    if (remainingSeconds > 0) {
      const interval = setInterval(() => {
        const newSeconds = remainingSeconds - 1;
        const minutes = Math.floor(newSeconds / 60);
        const secs = newSeconds % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        setDisplayTime(formatted);
        setIsWarning(newSeconds < 300);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [remainingSeconds]);

  return { displayTime, isWarning, isExpired: remainingSeconds === 0 };
}
