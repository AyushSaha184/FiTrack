import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { logger } from '../utils/logger';

const { StepCounterModule } = NativeModules;
const stepCounterEmitter = StepCounterModule
  ? new NativeEventEmitter(StepCounterModule)
  : null;

export const stepCounterService = {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
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

  async startTracking(onStep: (delta: number) => void): Promise<() => void> {
    if (!StepCounterModule) return () => {};

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      logger.warn('[stepCounterService] Permission denied for ACTIVITY_RECOGNITION');
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
