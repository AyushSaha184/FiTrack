import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import notifee, { TimestampTrigger, TriggerType, AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import {
  useSharedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
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
  // Mirror the seconds-remaining counter into a Reanimated shared value so
  // that the per-second setInterval doesn't trigger a WorkoutScreen tree
  // re-render. We only fan out to React state once per second via an
  // animated reaction.
  const sharedRemaining = useSharedValue(0);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsStore = useSettingsStore();

  const defaultRestTime = settingsStore.workout?.defaultRestTime ?? 90;
  const autoStartRestTimer = settingsStore.workout?.autoStartRestTimer ?? false;
  const restTimerSound = settingsStore.notifications?.restTimerSound;
  const restTimerVibration = settingsStore.notifications?.restTimerVibration;

  // Push the shared value into React state at 1Hz so the rest banner text
  // re-renders without forcing a full WorkoutScreen render.
  useAnimatedReaction(
    () => sharedRemaining.value,
    (current, previous) => {
      if (previous === null || Math.floor(current) !== Math.floor(previous)) {
        runOnJS(setTimeRemaining)(current);
      }
    },
    []
  );

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    sharedRemaining.value = 0;
    setTimeRemaining(0);
    setIsVisible(false);
  }, [sharedRemaining]);

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
          sound: restTimerSound ? 'default' : undefined,
          vibrationPattern: restTimerVibration ? [0, 250, 250, 250] : undefined,
        },
      } : {
        ios: {
          sound: restTimerSound ? 'default' : undefined,
        },
      }),
    };

    await notifee.createTriggerNotification(notificationConfig, trigger);
  }, [restTimerSound, restTimerVibration]);

  const requestNotificationPermission = async (): Promise<boolean> => {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  };

  const startTimer = useCallback(async (duration?: number) => {
    const restTime = duration ?? defaultRestTime;

    if (autoStartRestTimer) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await scheduleNotification(restTime);
      }
    }

    sharedRemaining.value = restTime;
    setIsActive(true);
    setIsVisible(true);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const next = sharedRemaining.value - 1;
      if (next <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        sharedRemaining.value = 0;
        setIsActive(false);
        return;
      }
      sharedRemaining.value = next;
    }, 1000);
  }, [defaultRestTime, autoStartRestTimer, scheduleNotification, sharedRemaining]);

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
