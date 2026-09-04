import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { logger } from '../utils/logger';
import { storage } from '../utils/storage';

const { StepCounterModule } = NativeModules;

export interface PendingStepLog {
  date: string;
  steps: number;
}

export const stepCounterService = {
  async requestPermission(userId?: string): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      let activityGranted = true;
      if (Platform.Version >= 29) {
        const perm = PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION;
        const alreadyGranted = await PermissionsAndroid.check(perm);
        
        if (!alreadyGranted) {
          const storageKey = userId ? `asked_activity_perm_${userId}` : 'asked_activity_perm';
          const alreadyAsked = storage.get<boolean>(storageKey);

          if (alreadyAsked) {
            activityGranted = false;
          } else {
            storage.set(storageKey, true);
            const granted = await PermissionsAndroid.request(
              perm,
              {
                title: 'Physical Activity Tracking',
                message:
                  'FiTrack uses your device step sensor and physical activity data to accurately track your daily walking steps and workout progress. This data is stored locally and securely synced with your personal account.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              },
            );
            activityGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
          }
        }
      }

      // Only request notifications permission on Android 13+ if Activity Recognition is already granted
      if (activityGranted && Platform.Version >= 33) {
        const notifPerm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
        const alreadyGrantedNotif = await PermissionsAndroid.check(notifPerm);
        if (!alreadyGrantedNotif) {
          await PermissionsAndroid.request(
            notifPerm,
            {
              title: 'Step Counter Notifications',
              message:
                'FiTrack displays an ongoing notification while background step tracking is active to keep you updated on your daily progress.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            }
          );
        }
      }

      return activityGranted;
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

  async startForegroundService(initialSteps: number, goal: number): Promise<boolean> {
    if (!StepCounterModule) return false;
    try {
      if (initialSteps > 0) {
        await StepCounterModule.setInitialSteps(initialSteps);
      }
      await StepCounterModule.setGoal(goal);
      const started = await StepCounterModule.startStepCounter();
      return !!started;
    } catch (error) {
      logger.error('[stepCounterService] startForegroundService error:', error);
      return false;
    }
  },

  async stopForegroundService(): Promise<boolean> {
    if (!StepCounterModule) return false;
    try {
      await StepCounterModule.stopStepCounter();
      return true;
    } catch (error) {
      logger.error('[stepCounterService] stopForegroundService error:', error);
      return false;
    }
  },

  async updateAppVisibility(isForeground: boolean): Promise<boolean> {
    if (!StepCounterModule) return false;
    try {
      await StepCounterModule.updateAppVisibility(isForeground);
      return true;
    } catch (error) {
      logger.error('[stepCounterService] updateAppVisibility error:', error);
      return false;
    }
  },

  async getTodaySteps(): Promise<number> {
    if (!StepCounterModule) return 0;
    try {
      return await StepCounterModule.getTodaySteps();
    } catch (error) {
      logger.error('[stepCounterService] getTodaySteps error:', error);
      return 0;
    }
  },

  async getPendingStepLogs(): Promise<PendingStepLog[]> {
    if (!StepCounterModule || typeof StepCounterModule.getPendingStepLogs !== 'function') {
      return [];
    }
    try {
      return await StepCounterModule.getPendingStepLogs();
    } catch (error) {
      logger.error('[stepCounterService] getPendingStepLogs error:', error);
      return [];
    }
  },

  async clearPendingStepLogs(): Promise<boolean> {
    if (!StepCounterModule || typeof StepCounterModule.clearPendingStepLogs !== 'function') {
      return false;
    }
    try {
      await StepCounterModule.clearPendingStepLogs();
      return true;
    } catch (error) {
      logger.error('[stepCounterService] clearPendingStepLogs error:', error);
      return false;
    }
  },

  async setGoal(goal: number): Promise<boolean> {
    if (!StepCounterModule) return false;
    try {
      await StepCounterModule.setGoal(goal);
      return true;
    } catch (error) {
      logger.error('[stepCounterService] setGoal error:', error);
      return false;
    }
  },

  async setInitialSteps(steps: number): Promise<boolean> {
    if (!StepCounterModule) return false;
    try {
      await StepCounterModule.setInitialSteps(steps);
      return true;
    } catch (error) {
      logger.error('[stepCounterService] setInitialSteps error:', error);
      return false;
    }
  },
};
