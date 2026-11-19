import type { WeightEntry } from '../../models';
import { generateUUID } from '../../utils/helpers';
import { storage } from '../../utils/storage';
import { localStore } from './localStore';

const storageKey = (userId: string) => `local.weight_entries.${userId}`;

/**
 * One-time import of the cache written by the previous cloud-backed version.
 * Existing installs keep their weight history without needing Firebase.
 */
const migrateLegacyCache = (userId: string): void => {
  const key = storageKey(userId);
  if (storage.contains(key)) return;

  const cached = storage.get<any[]>('weight_entries_cache');
  if (!Array.isArray(cached) || cached.length === 0) return;

  const owned = cached.filter((entry) => !entry?.userId || entry.userId === userId);
  if (owned.length === 0) return;

  localStore.setList(
    key,
    owned
      .map((entry) => normalizeEntry({ ...entry, userId }, userId))
      .map((entry) => ({
        ...entry,
        date: entry.date.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
  );
  storage.delete('weight_entries_cache');
};

const asDate = (value: unknown, fallback: Date = new Date()): Date => {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? fallback : parsed;
  }
  return fallback;
};

const normalizeEntry = (data: any, userId: string): WeightEntry => ({
  id: String(data?.id || ''),
  userId: data?.userId || userId,
  weight: Number(data?.weight) || 0,
  bodyFatPercentage: data?.bodyFatPercentage,
  date: asDate(data?.date),
  notes: data?.notes || undefined,
  createdAt: asDate(data?.createdAt),
  updatedAt: asDate(data?.updatedAt),
});

const readEntries = (userId: string): WeightEntry[] => {
  migrateLegacyCache(userId);
  return localStore
    .getList<any>(storageKey(userId))
    .map((item) => normalizeEntry(item, userId))
    .filter((entry) => Boolean(entry.id))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

const writeEntries = (userId: string, entries: WeightEntry[]): void => {
  localStore.setList(
    storageKey(userId),
    entries.map((entry) => ({
      ...entry,
      date: entry.date.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
  );
};

export const weightService = {
  async getWeightEntries(userId: string, startDateIso?: string): Promise<WeightEntry[]> {
    let entries = readEntries(userId);
    if (startDateIso) {
      const start = new Date(startDateIso).getTime();
      if (!isNaN(start)) {
        entries = entries.filter((entry) => entry.date.getTime() >= start);
      }
    }
    return entries.slice(0, 365);
  },

  subscribeWeightEntries(
    userId: string,
    callback: (entries: WeightEntry[]) => void,
    startDateIso?: string,
  ): () => void {
    const emit = () => {
      let entries = readEntries(userId);
      if (startDateIso) {
        const start = new Date(startDateIso).getTime();
        if (!isNaN(start)) {
          entries = entries.filter((entry) => entry.date.getTime() >= start);
        }
      }
      callback(entries.slice(0, 365));
    };

    const unsubscribe = localStore.subscribe(storageKey(userId), emit);
    emit();
    return unsubscribe;
  },

  async addWeightEntry(
    userId: string,
    entry: { id?: string; weight: number; date: Date; notes?: string },
  ): Promise<WeightEntry> {
    const entryId = entry.id || generateUUID();
    const existing = readEntries(userId);
    const index = existing.findIndex((item) => item.id === entryId);
    const now = new Date();
    const saved: WeightEntry = normalizeEntry(
      {
        ...(index >= 0 ? existing[index] : {}),
        id: entryId,
        userId,
        weight: entry.weight,
        date: entry.date,
        notes: entry.notes,
        createdAt: index >= 0 ? existing[index].createdAt : now,
        updatedAt: now,
      },
      userId,
    );

    if (index >= 0) {
      existing[index] = saved;
    } else {
      existing.push(saved);
    }
    writeEntries(userId, existing);
    return saved;
  },

  async deleteWeightEntry(userId: string, entryId: string): Promise<void> {
    writeEntries(
      userId,
      readEntries(userId).filter((entry) => entry.id !== entryId),
    );
  },
};
