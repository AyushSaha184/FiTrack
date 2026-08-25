import { useCallback, useEffect, useState } from 'react';
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

  // Mirror the shared value into React state at 1Hz so text that depends on
  // `elapsedTime` re-renders without us paying the cost of a full tree
  // re-render every frame.
  useAnimatedReaction(
    () => sharedElapsed.value,
    (current, previous) => {
      if (previous === null || Math.floor(current / 1000) !== Math.floor(previous / 1000)) {
        runOnJS(setElapsedTime)(current);
      }
    },
    []
  );

  // Drive a 100ms interval on the JS thread. We don't need 1ms granularity
  // (the displayed value only changes per second), but a 100ms tick keeps the
  // shared value moving smoothly between integer seconds.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const start = startTime ?? Date.now();
      sharedElapsed.value = Date.now() - start;
    }, 100);
    return () => clearInterval(id);
  }, [isRunning, startTime, sharedElapsed]);

  const stop = useCallback(() => {
    setEndTime(Date.now());
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    setStartTime((prev) => {
      const base = prev ?? Date.now() - elapsedTime;
      sharedElapsed.value = Date.now() - base;
      return base;
    });
    setEndTime(null);
    setIsRunning(true);
  }, [isRunning, elapsedTime, sharedElapsed]);

  const reset = useCallback(() => {
    setIsRunning(false);
    sharedElapsed.value = 0;
    setElapsedTime(0);
    setStartTime(null);
    setEndTime(null);
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