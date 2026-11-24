import { AppState } from 'react-native';
import { makeAutoObservable, runInAction } from 'mobx';
import type { StepEntry, StepSource } from '../models';
import { stepsService } from '../services/local/stepsService';
import { stepCounterService } from '../services/stepCounterService';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, DEFAULT_STEP_GOAL, getLast7Days, dateKey } from '../utils/helpers';
import { logger } from '../utils/logger';
import { stepsToCalories } from '../utils/calculations';

export class StepsStore {
  todaySteps = 0;
  dailyGoal: number = DEFAULT_STEP_GOAL;
  weeklyEntries: StepEntry[] = [];
  todayEntry: StepEntry | null = null;
  isLoading = false;
  isLiveTracking = false;
  error: string | null = null;
  source: StepSource = 'manual';
  currentDate: string = dateKey(new Date());

  private currentUserId: string | null = null;
  private unsubscribeStepCounter: (() => void) | null = null;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private midnightTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable(this);
    this.dailyGoal = storage.get<number>(STORAGE_KEYS.STEP_DAILY_GOAL) || DEFAULT_STEP_GOAL;
    this.currentDate = dateKey(new Date());
    this.restoreCachedSteps();
    this.scheduleMidnightCheck();

    // Listen to AppState changes to show/hide the foreground notification and handle day rollover
    AppState.addEventListener('change', (nextAppState) => {
      const isForeground = nextAppState === 'active';
      if (this.isLiveTracking) {
        stepCounterService.updateAppVisibility(isForeground).catch(() => {});
      }
      if (isForeground) {
        if (this.currentUserId) {
          this.checkDateRollover(this.currentUserId)
            .then(() => this.syncFromBackgroundService(this.currentUserId!))
            .catch((err) => {
              logger.error('[StepsStore] AppState active sync error:', err);
            });
        } else {
          this.checkDateRollover().catch(() => {});
        }
      }
    });
  }

  private scheduleMidnightCheck() {
    if (this.midnightTimer) {
      clearTimeout(this.midnightTimer);
    }
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msToMidnight = Math.max(1000, midnight.getTime() - now.getTime());
    this.midnightTimer = setTimeout(async () => {
      try {
        await this.checkDateRollover(this.currentUserId ?? undefined);
        if (this.currentUserId) {
          await this.syncFromBackgroundService(this.currentUserId);
        }
      } catch (e) {
        logger.error('[StepsStore] Midnight rollover check error:', e);
      } finally {
        this.scheduleMidnightCheck();
      }
    }, msToMidnight);
  }

  async checkDateRollover(targetUserId?: string): Promise<boolean> {
    const todayStr = dateKey(new Date());
    if (this.currentDate !== todayStr) {
      const previousDate = this.currentDate;
      const userId = targetUserId || this.currentUserId;

      // 1. If steps were logged for the previous date, ensure they are stored in history
      if (userId && this.todaySteps > 0) {
        try {
          const existing = await stepsService.getStepLogs(userId, previousDate);
          const maxSteps = Math.max(existing?.stepCount ?? 0, this.todaySteps);
          await stepsService.saveStepLog(userId, maxSteps, this.dailyGoal, previousDate);
        } catch (e) {
          logger.error('[StepsStore] Failed to save previous day log on rollover:', e);
        }
      }

      // 2. Reset in-memory today's steps and cache for the new day
      runInAction(() => {
        this.currentDate = todayStr;
        this.todaySteps = 0;
        this.todayEntry = null;
        this.persistTodayCache(0);
      });

      // 3. Reload weekly entries so previous day shows up in history immediately
      if (userId) {
        await this.loadWeeklySteps(userId);
      }
      return true;
    }
    return false;
  }

  private upsertWeeklyEntry(entry: StepEntry) {
    const entryDateStr = dateKey(new Date(entry.date));
    const existingIdx = this.weeklyEntries.findIndex((e) => dateKey(new Date(e.date)) === entryDateStr);
    if (existingIdx !== -1) {
      this.weeklyEntries[existingIdx] = entry;
    } else {
      this.weeklyEntries = [entry, ...this.weeklyEntries];
    }
    storage.set('steps_weekly_cache', this.weeklyEntries);
  }

  private persistTodayCache(steps: number) {
    const todayStr = dateKey(new Date());
    storage.set('steps_today_cache_v2', { date: todayStr, steps });
  }

  private restoreCachedSteps() {
    try {
      const todayStr = dateKey(new Date());
      this.currentDate = todayStr;
      const cachedToday = storage.get<{ date: string; steps: number }>('steps_today_cache_v2');
      if (cachedToday && cachedToday.date === todayStr && typeof cachedToday.steps === 'number') {
        this.todaySteps = cachedToday.steps;
      } else {
        // Stale or legacy cache from a previous day -> reset to 0 for today
        this.todaySteps = 0;
        this.persistTodayCache(0);
      }
      const cachedWeekly = storage.get<any[]>('steps_weekly_cache');
      if (cachedWeekly && Array.isArray(cachedWeekly) && cachedWeekly.length > 0) {
        this.weeklyEntries = cachedWeekly.map((e: any) => ({
          ...e,
          date: new Date(e.date),
        }));
      }
    } catch (e) {
      logger.error('[StepsStore] restoreCachedSteps error:', e);
    }
  }

  get todayProgress(): number {
    return this.dailyGoal > 0 ? Math.min(100, (this.todaySteps / this.dailyGoal) * 100) : 0;
  }

  get weeklyTotal(): number {
    const cutOff = new Date();
    cutOff.setDate(cutOff.getDate() - 7);
    return this.weeklyEntries
      .filter((e) => new Date(e.date) >= cutOff)
      .reduce((sum, e) => sum + e.steps, 0);
  }

  get weeklyAverage(): number {
    const cutOff = new Date();
    cutOff.setDate(cutOff.getDate() - 7);
    const last7 = this.weeklyEntries.filter((e) => new Date(e.date) >= cutOff);
    const total = last7.reduce((sum, e) => sum + e.steps, 0);
    return last7.length > 0 ? total / last7.length : 0;
  }

  get weeklyBest(): StepEntry | null {
    const cutOff = new Date();
    cutOff.setDate(cutOff.getDate() - 7);
    const last7 = this.weeklyEntries.filter((e) => new Date(e.date) >= cutOff);
    if (last7.length === 0) return null;
    return last7.reduce((max, e) => (e.steps > max.steps ? e : max));
  }

  get todayCalories(): number {
    return stepsToCalories(this.todaySteps);
  }

  async loadTodaySteps(userId: string) {
    if (!userId) {
      if (__DEV__) logger.warn('[StepsStore] Skipping loadTodaySteps: invalid userId', userId);
      return;
    }
    this.currentUserId = userId;
    await this.checkDateRollover(userId);
    try {
      this.isLoading = true;
      const todayStr = dateKey(new Date());
      const log = await stepsService.getStepLogs(userId, todayStr);
      const nativeSteps = await stepCounterService.getTodaySteps().catch(() => 0);

      runInAction(() => {
        if (log) {
          this.todaySteps = Math.max(log.stepCount, nativeSteps);
          this.dailyGoal = log.targetGoal || this.dailyGoal;
          this.todayEntry = {
            id: log.id,
            userId: log.userId,
            steps: this.todaySteps,
            date: log.date,
            source: 'manual',
            createdAt: log.createdAt,
            updatedAt: log.updatedAt,
          };
          this.upsertWeeklyEntry(this.todayEntry);
        } else {
          // No log yet for today -> only native steps recorded today
          this.todaySteps = nativeSteps;
          this.todayEntry = null;
        }
        this.persistTodayCache(this.todaySteps);
      });
    } catch (error: any) {
      logger.error('[StepsStore] loadTodaySteps error:', error);
      runInAction(() => {
        this.error = error.message;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async loadWeeklySteps(userId: string, days = 30) {
    if (!userId) return;
    try {
      const logs = await stepsService.getStepHistory(userId, days);
      runInAction(() => {
        this.weeklyEntries = logs.map((log) => ({
          id: log.id,
          userId: log.userId,
          steps: log.stepCount,
          date: log.date,
          source: 'manual',
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        }));
        storage.set('steps_weekly_cache', this.weeklyEntries);
      });
    } catch (error: any) {
      logger.error('[StepsStore] loadWeeklySteps error:', error);
    }
  }

  async addSteps(userId: string, steps: number, date?: Date) {
    if (!userId) {
      if (__DEV__) logger.warn('[StepsStore] Skipping addSteps: invalid userId', userId);
      return;
    }
    try {
      const targetDate = date || new Date();
      const dateStr = dateKey(targetDate);
      const isToday = dateStr === dateKey(new Date());
      const log = await stepsService.saveStepLog(userId, steps, this.dailyGoal, dateStr);

      runInAction(() => {
        const entry: StepEntry = {
          id: log.id,
          userId,
          steps: log.stepCount,
          date: log.date,
          source: 'manual',
          createdAt: log.createdAt,
          updatedAt: log.updatedAt,
        };

        if (isToday) {
          this.todayEntry = entry;
          this.todaySteps = steps;
          this.persistTodayCache(this.todaySteps);
        }

        // Upsert into weekly entries
        const existingIdx = this.weeklyEntries.findIndex((e) => dateKey(new Date(e.date)) === dateStr);
        if (existingIdx !== -1) {
          this.weeklyEntries[existingIdx] = entry;
        } else {
          this.weeklyEntries = [entry, ...this.weeklyEntries];
        }
        storage.set('steps_weekly_cache', this.weeklyEntries);
      });

      // Update background service if active and date is today
      if (this.isLiveTracking && isToday) {
        await stepCounterService.setInitialSteps(steps);
      }
    } catch (error: any) {
      logger.error('[StepsStore] addSteps error:', error);
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  async updateTodaySteps(userId: string, steps: number) {
    if (!userId) return;
    return this.addSteps(userId, steps);
  }

  async deleteEntry(entryId: string, userId?: string) {
    runInAction(() => {
      this.weeklyEntries = this.weeklyEntries.filter((e) => e.id !== entryId);
      storage.set('steps_weekly_cache', this.weeklyEntries);
      if (this.todayEntry?.id === entryId) {
        this.todayEntry = null;
        this.todaySteps = 0;
        this.persistTodayCache(0);
      }
    });

    if (userId && entryId) {
      try {
        await stepsService.deleteStepLog(userId, entryId);
      } catch (err) {
        logger.error('[StepsStore] deleteEntry local persistence error:', err);
      }
    }
  }

  async syncFromHealthApp(userId: string, steps: number, source: StepSource = 'apple_health') {
    if (!userId) return;
    try {
      const todayStr = dateKey(new Date());
      await stepsService.saveStepLog(userId, steps, this.dailyGoal, todayStr);
      runInAction(() => {
        this.todaySteps = steps;
        this.source = source;
        this.persistTodayCache(this.todaySteps);
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  setDailyGoal(goal: number) {
    runInAction(() => {
      this.dailyGoal = goal;
      storage.set(STORAGE_KEYS.STEP_DAILY_GOAL, goal);
    });
    // Sync daily goal to service
    if (this.isLiveTracking) {
      stepCounterService.setGoal(goal).catch(() => {});
    }
  }

  getChartData(): { date: Date; steps: number }[] {
    const last7 = getLast7Days();
    const todayStr = dateKey(new Date());
    return last7.map((date) => {
      const dateStr = dateKey(date);
      const isToday = dateStr === todayStr;
      const entry = this.weeklyEntries.find(
        (e) => dateKey(new Date(e.date)) === dateStr,
      );
      return {
        date,
        steps: isToday ? this.todaySteps : (entry?.steps ?? 0),
      };
    });
  }

  async startLiveStepTracking(userId: string) {
    if (this.isLiveTracking || !userId) return;
    this.currentUserId = userId;

    const hasPermission = await stepCounterService.requestPermission(userId);
    if (!hasPermission) {
      logger.warn('[StepsStore] Physical activity recognition permission not granted');
      return;
    }

    try {
      // Seed foreground service on start with current steps/goal
      await stepCounterService.startForegroundService(this.todaySteps, this.dailyGoal);

      // Sync visibility status immediately on start
      const isForeground = AppState.currentState === 'active';
      await stepCounterService.updateAppVisibility(isForeground);

      runInAction(() => {
        this.isLiveTracking = true;
      });
    } catch (err) {
      logger.error('[StepsStore] startLiveStepTracking error:', err);
    }
  }

  async stopLiveStepTracking() {
    try {
      await stepCounterService.stopForegroundService();
    } catch (err) {
      logger.error('[StepsStore] stopLiveStepTracking error:', err);
    }
    runInAction(() => {
      this.isLiveTracking = false;
    });
  }

  async syncFromBackgroundService(userId: string) {
    if (!userId) return;
    this.currentUserId = userId;
    try {
      await this.checkDateRollover(userId);

      // 1. Persist any archived step logs from previous days (e.g. rollover occurred while app was in background/closed)
      const pendingLogs = await stepCounterService.getPendingStepLogs();
      if (pendingLogs.length > 0) {
        for (const item of pendingLogs) {
          if (item.steps > 0 && item.date) {
            try {
              const existing = await stepsService.getStepLogs(userId, item.date);
              const maxSteps = Math.max(existing?.stepCount ?? 0, item.steps);
              await stepsService.saveStepLog(userId, maxSteps, this.dailyGoal, item.date);
            } catch (saveErr) {
              logger.warn('[StepsStore] Failed to sync pending log for date:', item.date, saveErr);
            }
          }
        }
        await stepCounterService.clearPendingStepLogs();
        await this.loadWeeklySteps(userId);
      }

      // 2. Synchronize today's steps
      const steps = await stepCounterService.getTodaySteps();
      const todayStr = dateKey(new Date());

      // If native sensor has higher steps than stored, update and sync up
      if (steps > this.todaySteps) {
        const savedLog = await stepsService.saveStepLog(userId, steps, this.dailyGoal, todayStr);
        runInAction(() => {
          this.todaySteps = steps;
          this.todayEntry = {
            id: savedLog.id,
            userId: savedLog.userId,
            steps: savedLog.stepCount,
            date: savedLog.date,
            source: 'manual',
            createdAt: savedLog.createdAt,
            updatedAt: savedLog.updatedAt,
          };
          this.upsertWeeklyEntry(this.todayEntry);
          this.persistTodayCache(this.todaySteps);
        });
      } else if (this.todaySteps > steps && this.todaySteps > 0) {
        // If stored steps are higher (e.g. from previous session/manual/cloud), sync down to native service
        await stepCounterService.setInitialSteps(this.todaySteps);
      }
    } catch (err) {
      logger.error('[StepsStore] syncFromBackgroundService error:', err);
    }
  }

  clearError() {
    this.error = null;
  }

  resetLocalState() {
    if (this.midnightTimer) {
      clearTimeout(this.midnightTimer);
      this.midnightTimer = null;
    }
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    if (this.unsubscribeStepCounter) {
      this.unsubscribeStepCounter();
      this.unsubscribeStepCounter = null;
    }
    runInAction(() => {
      this.todaySteps = 0;
      this.dailyGoal = DEFAULT_STEP_GOAL;
      this.weeklyEntries = [];
      this.todayEntry = null;
      this.isLoading = false;
      this.isLiveTracking = false;
      this.error = null;
      this.source = 'manual';
    });
  }
}

export const stepsStore = new StepsStore();
