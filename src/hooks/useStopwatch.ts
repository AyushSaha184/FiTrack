import { useState, useCallback, useRef, useEffect } from 'react';

interface UseStopwatchResult {
  isRunning: boolean;
  elapsedTime: number;
  startTime: number | null;
  endTime: number | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getFormattedTime: () => string;
}

export const useStopwatch = (): UseStopwatchResult => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (startTimeRef.current !== null) {
      setEndTime(Date.now());
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    
    setIsRunning(true);
    startTimeRef.current = Date.now() - elapsedTime;
    setStartTime(startTimeRef.current);
    setEndTime(null);

    intervalRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current!);
    }, 1000);
  }, [isRunning, elapsedTime]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setEndTime(null);
    startTimeRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getFormattedTime = useCallback((): string => {
    if (!isRunning && elapsedTime === 0) {
      return 'Start';
    }
    
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }, [elapsedTime, isRunning]);

  return {
    isRunning,
    elapsedTime,
    startTime,
    endTime,
    start,
    stop,
    reset,
    getFormattedTime,
  };
};