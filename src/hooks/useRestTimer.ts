import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import notifee, { TimestampTrigger, TriggerType, AndroidImportance } from '@notifee/react-native';
import { useSettingsStore } from '../stores';

export const useRestTimer = () => {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsStore = useSettingsStore();

  const defaultRestTime = settingsStore.preferences.workout?.defaultRestTime ?? 90;
  const autoStartRestTimer = settingsStore.preferences.workout?.autoStartRestTimer ?? false;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    setTimeRemaining(0);
    setIsVisible(false);
  }, []);

  const stopTimer = useCallback(() => {
    notifee.cancelTriggerNotification('rest-timer');
    clearTimer();
  }, [clearTimer]);

  const scheduleNotification = useCallback((seconds: number) => {
    if (Platform.OS === 'android') {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + seconds * 1000,
      };

      notifee.createTriggerNotification(
        {
          id: 'rest-timer',
          title: '⏰ Rest Complete',
          body: 'Time to get back to your workout!',
          android: {
            channelId: 'rest-timer',
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            sound: settingsStore.preferences.notifications?.restTimerSound ? 'default' : undefined,
            vibrationPattern: settingsStore.preferences.notifications?.restTimerVibration ? [0, 250, 250, 250] : undefined,
          },
        },
        trigger
      );
    }
  }, [settingsStore.preferences.notifications]);

  const startTimer = useCallback((duration?: number) => {
    const restTime = duration ?? defaultRestTime;

    if (autoStartRestTimer) {
      scheduleNotification(restTime);
    }

    setTimeRemaining(restTime);
    setIsActive(true);
    setIsVisible(true);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [defaultRestTime, autoStartRestTimer, scheduleNotification]);

  const dismissTimer = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isActive,
    timeRemaining,
    isVisible,
    autoStartRestTimer,
    startTimer,
    stopTimer,
    dismissTimer,
  };
};