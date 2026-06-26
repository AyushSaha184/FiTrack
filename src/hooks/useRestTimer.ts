import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import notifee, { TimestampTrigger, TriggerType, AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import { useSettingsStore } from '../stores';

const CHANNEL_ID = 'rest-timer';

const ensureChannel = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Rest Timer',
      importance: AndroidImportance.HIGH,
    });
  }
};

export const useRestTimer = () => {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsStore = useSettingsStore();

  const defaultRestTime = settingsStore.workout?.defaultRestTime ?? 90;
  const autoStartRestTimer = settingsStore.workout?.autoStartRestTimer ?? false;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    setTimeRemaining(0);
    setIsVisible(false);
  }, []);

  const stopTimer = useCallback(async () => {
    await notifee.cancelTriggerNotification('rest-timer');
    clearTimer();
  }, [clearTimer]);

  const scheduleNotification = useCallback(async (seconds: number) => {
    await ensureChannel();

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + seconds * 1000,
    };

    const notificationConfig = {
      id: 'rest-timer',
      title: '⏰ Rest Complete',
      body: 'Time to get back to your workout!',
      ...(Platform.OS === 'android' ? {
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          sound: settingsStore.notifications?.restTimerSound ? 'default' : undefined,
          vibrationPattern: settingsStore.notifications?.restTimerVibration ? [0, 250, 250, 250] : undefined,
        },
      } : {
        ios: {
          sound: settingsStore.notifications?.restTimerSound ? 'default' : undefined,
        },
      }),
    };

    await notifee.createTriggerNotification(notificationConfig, trigger);
  }, [settingsStore.notifications]);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const settings = await notifee.requestPermission();
      return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
    }
    return true;
  };

  const startTimer = useCallback(async (duration?: number) => {
    const restTime = duration ?? defaultRestTime;

    if (autoStartRestTimer) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await scheduleNotification(restTime);
      }
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