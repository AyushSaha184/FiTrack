import { makeAutoObservable, runInAction } from 'mobx';
import type { StepEntry, StepSource } from '../models';
import { stepsService } from '../services/supabase/steps';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, DEFAULT_STEP_GOAL, getLast7Days, dateKey } from '../utils/helpers';
import { generateId } from '../utils/helpers';
import { stepsToCalories } from '../utils/calculations';

export class StepsStore {
  todaySteps = 0;
  dailyGoal = DEFAULT_STEP_GOAL;
  weeklyEntries: StepEntry[] = [];
  todayEntry: StepEntry | null = null;
  isLoading = false;
  error: string | null = null;
  source: StepSource = 'manual';

  constructor() {
    makeAutoObservable(this);
    this.dailyGoal = storage.get<number>(STORAGE_KEYS.STEP_DAILY_GOAL) || DEFAULT_STEP_GOAL;
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
    try {
      this.isLoading = true;
      const today = dateKey(new Date());
      const entry = await stepsService.getTodayEntry(userId, today);
      runInAction(() => {
        this.todayEntry = entry;
        this.todaySteps = entry?.steps ?? 0;
      });
    } catch (error: any) {
      console.error('[StepsStore] loadTodaySteps error:', error);
      runInAction(() => {
        this.error = error.message;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async loadWeeklySteps(userId: string, days = 90) {
    try {
      this.isLoading = true;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = dateKey(startDate);
      const endDateStr = dateKey(new Date());
      const data = await stepsService.getEntries(userId, startDateStr, endDateStr, days);
      runInAction(() => {
        this.weeklyEntries = data.map((e: any) => ({
          ...e,
          date: new Date(e.date),
        }));
      });
    } catch (error: any) {
      console.error('[StepsStore] loadWeeklySteps error:', error);
      runInAction(() => {
        this.error = error.message;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async addSteps(userId: string, steps: number, date?: Date) {
    try {
      const dateStr = dateKey(date || new Date());
      const entry = await stepsService.upsertEntry(userId, dateStr, steps, 'manual');
      runInAction(() => {
        const newEntry = { ...entry, date: new Date(entry.date) };
        this.todayEntry = newEntry;
        this.todaySteps = steps;
        const existing = this.weeklyEntries.findIndex(
          (e) => dateKey(new Date(e.date)) === dateStr,
        );
        if (existing !== -1) {
          this.weeklyEntries[existing] = newEntry;
        } else {
          this.weeklyEntries.push(newEntry);
        }
      });
      return entry;
    } catch (error: any) {
      console.error('[StepsStore] addSteps error:', error);
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  async updateTodaySteps(userId: string, steps: number) {
    return this.addSteps(userId, steps);
  }

  async syncFromHealthApp(userId: string, steps: number, source: StepSource = 'apple_health') {
    try {
      const today = dateKey(new Date());
      const entry = await stepsService.upsertEntry(userId, today, steps, source);
      runInAction(() => {
        this.todayEntry = { ...entry, date: new Date(entry.date) };
        this.todaySteps = steps;
        this.source = source;
      });
      return entry;
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
  }

  getChartData(): { date: Date; steps: number }[] {
    const last7 = getLast7Days();
    return last7.map((date) => {
      const dateStr = dateKey(date);
      const entry = this.weeklyEntries.find(
        (e) => dateKey(new Date(e.date)) === dateStr,
      );
      return { date, steps: entry?.steps ?? 0 };
    });
  }

  clearError() {
    this.error = null;
  }
}

export const stepsStore = new StepsStore();