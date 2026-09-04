import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

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
  // The actual elapsed time is a Reanimated shared value updated on every
  // frame. We mirror it into React state at a 1Hz cadence so that consumers
  // (e.g. the dialog time text) re-render without us having to rebuild the
  // whole workout tree on every tick.
  const sharedElapsed = useSharedValue(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  // Refs that mirror the latest state values so the JS interval closure
  // always sees fresh values without needing to be torn down on every tick.
  const startTimeRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const accumulatedRef = useRef<number>(0);

  useAnimatedReaction(
    () => sharedElapsed.value,
    (current, previous) => {
      if (previous === null || Math.floor(current / 1000) !== Math.floor(previous / 1000)) {
        runOnJS(setElapsedTime)(current);
      }
    },
    []
  );

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const base = startTimeRef.current ?? Date.now() - accumulatedRef.current;
      sharedElapsed.value = Date.now() - base;
    }, 100);
    return () => clearInterval(id);
  }, [isRunning, sharedElapsed]);

  const stop = useCallback(() => {
    if (!isRunningRef.current) return;
    const base = startTimeRef.current ?? Date.now();
    const finalElapsed = Date.now() - base;
    accumulatedRef.current = finalElapsed;
    sharedElapsed.value = finalElapsed;
    setElapsedTime(finalElapsed);
    setEndTime(Date.now());
    setIsRunning(false);
    isRunningRef.current = false;
  }, [sharedElapsed]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    const base = Date.now() - accumulatedRef.current;
    startTimeRef.current = base;
    isRunningRef.current = true;
    sharedElapsed.value = accumulatedRef.current;
    setStartTime(base);
    setEndTime(null);
    setIsRunning(true);
  }, [sharedElapsed]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    isRunningRef.current = false;
    startTimeRef.current = null;
    sharedElapsed.value = 0;
    setElapsedTime(0);
    setStartTime(null);
    setEndTime(null);
    setIsRunning(false);
  }, [sharedElapsed]);

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
