import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { logger } from '../utils/logger';
import { storage } from '../utils/storage';

const { StepCounterModule } = NativeModules;

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
                title: 'Physical Activity Permission',
                message: 'FiTrack requires activity recognition permission to count your steps in real time as you walk.',
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
              title: 'Notification Permission',
              message: 'FiTrack requires notification permission to show background tracking status.',
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
      await StepCounterModule.setInitialSteps(initialSteps);
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

  async getTodaySteps(): Promise<number> {
    if (!StepCounterModule) return 0;
    try {
      return await StepCounterModule.getTodaySteps();
    } catch (error) {
      logger.error('[stepCounterService] getTodaySteps error:', error);
      return 0;
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
