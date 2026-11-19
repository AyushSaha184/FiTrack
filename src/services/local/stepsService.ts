import { storage } from '../../utils/storage';
import { localStore } from './localStore';

export interface StepLog {
  id: string;
  userId: string;
  stepCount: number;
  targetGoal: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const storageKey = (userId: string) => `local.step_logs.${userId}`;

/**
 * One-time import of the cache written by the previous cloud-backed version so
 * existing installs keep their step history without Firebase.
 */
const migrateLegacyCache = (userId: string): void => {
  const key = storageKey(userId);
  if (storage.contains(key)) return;

  const cached = storage.get<any[]>('steps_weekly_cache');
  if (!Array.isArray(cached) || cached.length === 0) return;

  const owned = cached.filter((entry) => !entry?.userId || entry.userId === userId);
  if (owned.length === 0) return;

  const logs = owned
    .map((entry) =>
      normalizeLog(
        {
          id: entry?.id,
          userId,
          stepCount: Number(entry?.steps ?? entry?.stepCount ?? 0),
          targetGoal: Number(entry?.targetGoal ?? 10000),
          date: entry?.date,
          createdAt: entry?.createdAt,
          updatedAt: entry?.updatedAt,
        },
        userId,
      ),
    )
    .filter((log) => Boolean(log.id));

  if (logs.length === 0) return;

  localStore.setList(
    key,
    logs.map((log) => ({
      ...log,
      date: log.date.toISOString(),
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    })),
  );
  storage.delete('steps_weekly_cache');
};

const parseStepDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }
  if (typeof value === 'string') {
    // Step logs are keyed by a calendar day, so parse YYYY-MM-DD in local time
    // instead of UTC (which can shift the day by one in negative offsets).
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

const normalizeLog = (data: any, userId: string): StepLog => ({
  id: String(data?.id || ''),
  userId: data?.userId || userId,
  stepCount: Number(data?.stepCount) || 0,
  targetGoal: Number(data?.targetGoal) || 10000,
  date: parseStepDate(data?.date),
  createdAt: data?.createdAt ? parseStepDate(data.createdAt) : new Date(),
  updatedAt: data?.updatedAt ? parseStepDate(data.updatedAt) : new Date(),
});

const readLogs = (userId: string): StepLog[] => {
  migrateLegacyCache(userId);
  return localStore
    .getList<any>(storageKey(userId))
    .map((item) => normalizeLog(item, userId))
    .filter((log) => Boolean(log.id))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

const writeLogs = (userId: string, logs: StepLog[]): void => {
  localStore.setList(
    storageKey(userId),
    logs.map((log) => ({
      ...log,
      date: log.date.toISOString(),
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    })),
  );
};

export const stepsService = {
  async getStepLogs(userId: string, dateStr: string): Promise<StepLog | null> {
    return readLogs(userId).find((log) => log.id === dateStr) ?? null;
  },

  async getStepHistory(userId: string, days = 30): Promise<StepLog[]> {
    return readLogs(userId).slice(0, days);
  },

  async saveStepLog(
    userId: string,
    stepCount: number,
    targetGoal: number,
    dateStr: string,
  ): Promise<StepLog> {
    const existing = readLogs(userId);
    const index = existing.findIndex((log) => log.id === dateStr);
    const now = new Date();
    const saved: StepLog = normalizeLog(
      {
        ...(index >= 0 ? existing[index] : {}),
        id: dateStr,
        userId,
        stepCount,
        targetGoal,
        date: dateStr,
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
    writeLogs(userId, existing);
    return saved;
  },

  async deleteStepLog(userId: string, dateStr: string): Promise<void> {
    writeLogs(
      userId,
      readLogs(userId).filter((log) => log.id !== dateStr),
    );
  },
};
