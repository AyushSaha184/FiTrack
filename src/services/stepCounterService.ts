import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { logger } from '../utils/logger';
import { storage } from '../utils/storage';

const { StepCounterModule } = NativeModules;
const stepCounterEmitter = StepCounterModule
  ? new NativeEventEmitter(StepCounterModule)
  : null;

export const stepCounterService = {
  async requestPermission(userId?: string): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 29) {
        const perm = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;

        // 1. If already granted, return true without prompting
        const alreadyGranted = await PermissionsAndroid.check(perm);
        if (alreadyGranted) return true;

        // 2. Prompt only ONCE per user
        const storageKey = userId ? `asked_activity_perm_${userId}` : 'asked_activity_perm';
        const alreadyAsked = storage.get<boolean>(storageKey);

        if (alreadyAsked) {
          // Already prompted once for this user; do not prompt again
          return false;
        }

        // Remember that we prompted the user
        storage.set(storageKey, true);

        const granted = await PermissionsAndroid.request(
          perm,
          {
            title: 'Physical Activity Permission',
            message: 'FiTrack requires activity recognition permission to count your steps in real time as you walk.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      logger.error('[stepCounterService] requestPermission error:', error);
      return false;
    }
  },

  async isSensorAvailable(): Promise<boolean> {
    if (!StepCounterModule) return false;
    try {
      return await StepCounterModule.isSensorAvailable();
    } catch {
      return false;
    }
  },

  async startTracking(userId: string, onStep: (delta: number) => void): Promise<() => void> {
    if (!StepCounterModule) return () => {};

    const hasPermission = await this.requestPermission(userId);
    if (!hasPermission) {
      logger.warn('[stepCounterService] Activity recognition permission not granted');
      return () => {};
    }

    try {
      const started = await StepCounterModule.startStepCounter();
      if (!started) {
        logger.warn('[stepCounterService] Hardware step sensor not available on this device');
        return () => {};
      }

      const subscription = stepCounterEmitter?.addListener(
        'onStepDetected',
        (event: { stepDelta?: number }) => {
          const delta = event?.stepDelta ?? 1;
          onStep(delta);
        },
      );

      return () => {
        subscription?.remove();
        StepCounterModule.stopStepCounter().catch(() => {});
      };
    } catch (error) {
      logger.error('[stepCounterService] startTracking error:', error);
      return () => {};
    }
  },
};
