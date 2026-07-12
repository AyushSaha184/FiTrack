import { storage } from './storage';
import { STORAGE_KEYS } from './constants';

export interface LogEntry {
  timestamp: string;
  message: string;
}

export const errorLogs: LogEntry[] = [];

export const logger = {
  error(...args: any[]) {
    const enabled = storage.get<boolean>(STORAGE_KEYS.RECORD_BUG_REPORTS) ?? true;
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

      errorLogs.push({ timestamp, message });
      if (errorLogs.length > 50) {
        errorLogs.shift();
      }
    }
    console.error(...args);
  },

  warn(...args: any[]) {
    console.warn(...args);
  },

  info(...args: any[]) {
    if (__DEV__) {
      console.info(...args);
    }
  },

  debug(...args: any[]) {
    if (__DEV__) {
      console.debug(...args);
    }
  },
};