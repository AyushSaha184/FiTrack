import { makeAutoObservable, runInAction } from 'mobx';
import type { WeightEntry } from '../models';
import { weightService } from '../services/supabase/weight';
import { generateUUID, dateKey } from '../utils/helpers';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

export class WeightStore {
  entries: WeightEntry[] = [];
  currentWeight: number | null = null;
  goalWeight: number | null = null;
  isLoading = false;
  error: string | null = null;
  stats: {
    highest: WeightEntry | null;
    lowest: WeightEntry | null;
    average: number | null;
    change: number | null;
  } = { highest: null, lowest: null, average: null, change: null };

  constructor() {
    makeAutoObservable(this);
    this.restoreCachedEntries();
  }

  private restoreCachedEntries() {
    try {
      const cached = storage.get<any[]>('weight_entries_cache');
      if (cached && Array.isArray(cached) && cached.length > 0) {
        this.entries = cached.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(e.date),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(e.date),
        }));
        this.currentWeight = this.entries[0].weight;
        this.recalculateStats();
      }
    } catch (e) {
      logger.error('[WeightStore] restoreCachedEntries error:', e);
    }
  }

  get trend(): 'up' | 'down' | 'stable' {
    if (this.stats.change === null) return 'stable';
    if (Math.abs(this.stats.change) < 0.1) return 'stable';
    return this.stats.change > 0 ? 'up' : 'down';
  }

  get progress(): number {
    if (!this.currentWeight || !this.goalWeight) return 0;
    if (this.goalWeight === this.currentWeight) return 100;

    const sortedEntries = [...this.entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const baselineEntry = sortedEntries[0];
    const baselineWeight = baselineEntry?.weight ?? null;

    if (!baselineWeight || baselineWeight === this.goalWeight) return 0;

    const totalDistance = Math.abs(baselineWeight - this.goalWeight);
    if (totalDistance === 0) return 100;

    const currentDistance = Math.abs(baselineWeight - this.currentWeight);

    const progress = (1 - currentDistance / totalDistance) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  private recalculateStats() {
    if (this.entries.length === 0) {
      this.stats = { highest: null, lowest: null, average: null, change: null };
      return;
    }
    const weights = this.entries.map((e) => e.weight);
    const highest = this.entries.reduce((max, e) => (e.weight > max.weight ? e : max));
    const lowest = this.entries.reduce((min, e) => (e.weight < min.weight ? e : min));
    const average = weights.reduce((a, b) => a + b, 0) / weights.length;
    const firstEntry = this.entries[this.entries.length - 1];
    const lastEntry = this.entries[0];
    const change = lastEntry && firstEntry ? lastEntry.weight - firstEntry.weight : 0;

    this.stats = { highest, lowest, average, change };
  }

  async loadEntries(userId: string, days = 365) {
    try {
      this.isLoading = true;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const data = await weightService.getEntries(
        userId,
        dateKey(startDate),
        dateKey(new Date()),
      );
      runInAction(() => {
        this.entries = data.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(e.date),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(e.date),
        }));
        if (data.length > 0) {
          this.currentWeight = data[0].weight;
        }
        this.recalculateStats();
        storage.set('weight_entries_cache', this.entries);
      });
    } catch (error: any) {
      logger.error('[WeightStore] loadEntries error:', error);
      runInAction(() => {
        this.error = error.message;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async loadStats(_userId: string, _days = 30) {
    runInAction(() => {
      this.recalculateStats();
    });
  }

  async addEntry(userId: string, weight: number, date?: Date, notes?: string) {
    try {
      if (!userId) {
        logger.error("No valid user ID found");
        throw new Error('Not authenticated');
      }
      
      const entryDate = date || new Date();
      const entry = await weightService.addEntry({
        id: generateUUID(),
        userId: userId,
        weight,
        date: entryDate.toISOString(),
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);
      runInAction(() => {
        const newEntry = {
          ...entry,
          date: new Date(entry.date),
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
          updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
        };
        this.entries = [newEntry, ...this.entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        this.currentWeight = newEntry.weight;
        this.recalculateStats();
      });
      return entry;
    } catch (error: any) {
      logger.error('[WeightStore] addEntry error:', error);
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  async updateEntry(entryId: string, weight: number, notes?: string) {
    try {
      const updated = await weightService.updateEntry(entryId, { weight, notes });
      runInAction(() => {
        const index = this.entries.findIndex((e) => e.id === entryId);
        if (index !== -1) {
          this.entries[index] = {
            ...this.entries[index],
            ...updated,
            date: new Date(updated.date),
            createdAt: updated.createdAt ? new Date(updated.createdAt) : this.entries[index].createdAt,
            updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : new Date(),
          };
          if (index === 0) {
            this.currentWeight = updated.weight;
          }
        }
        this.recalculateStats();
      });
      return updated;
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  async deleteEntry(entryId: string) {
    try {
      await weightService.deleteEntry(entryId);
      runInAction(() => {
        this.entries = this.entries.filter((e) => e.id !== entryId);
        if (this.entries.length > 0) {
          this.currentWeight = this.entries[0].weight;
        } else {
          this.currentWeight = null;
        }
        this.recalculateStats();
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  setGoalWeight(weight: number) {
    runInAction(() => {
      this.goalWeight = weight;
    });
  }

  getChartData(days = 30): { date: Date; weight: number }[] {
    return this.entries.slice(0, days).map((e) => ({
      date: new Date(e.date),
      weight: e.weight,
    })).reverse();
  }

  clearError() {
    this.error = null;
  }
}

export const weightStore = new WeightStore();