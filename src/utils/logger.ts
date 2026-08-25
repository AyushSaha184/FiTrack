import { storage } from './storage';
import { STORAGE_KEYS } from './constants';

export interface LogEntry {
  timestamp: string;
  message: string;
}

const MAX_LOGS = 50;

function loadLogs(): LogEntry[] {
  return storage.get<LogEntry[]>(STORAGE_KEYS.ERROR_LOGS) ?? [];
}

function saveLogs(logs: LogEntry[]): void {
  storage.set(STORAGE_KEYS.ERROR_LOGS, logs);
}

/**
 * Re-read the on-disk log buffer on demand. The in-memory `errorLogs` array
 * is kept in sync by `recordLog`. Always re-read at crash-report submission
 * time so we capture entries that may have been appended after the module
 * was first imported (e.g. by error boundaries in other parts of the app).
 */
export function getErrorLogs(): LogEntry[] {
  return loadLogs();
}

function recordLog(timestamp: string, message: string) {
  const logs = loadLogs();
  logs.push({ timestamp, message });
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }
  saveLogs(logs);
}

export const logger = {
  error(...args: any[]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
    const enabled = storage.get<boolean>(STORAGE_KEYS.RECORD_BUG_REPORTS) ?? false;
    if (enabled) {
      const timestamp = new Date().toISOString();
      const message = args
        .map((arg) => {
          if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      recordLog(timestamp, message);
    }
  },

  warn(...args: any[]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },

  info(...args: any[]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },

  debug(...args: any[]) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
};