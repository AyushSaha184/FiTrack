import { Platform } from 'react-native';
import { CONFIG } from '../config/constants';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

export interface CrashReportPayload {
  reportType: string;
  timestamp: string;
  app: { name: string; version: string };
  device: { os: string; osVersion: string | number; isDevMode: boolean };
  user: { name: string; email: string; id: string };
  settings?: Record<string, unknown>;
  diagnosticLogs?: unknown[];
}

const STORAGE_KEY = 'crash_reports';
const MAX_SAVED_REPORTS = 20;

/**
 * Offline crash/diagnostic reports. Reports are never uploaded anywhere; they
 * are kept on-device and can still be shared through the
 * user's email app from Settings.
 */
export const crashReportsService = {
  saveLocally(payload: CrashReportPayload, reportId?: string): { id: string } | null {
    try {
      const id =
        reportId ||
        `crash_${payload.user.id || 'local'}_${payload.timestamp.replace(/[:.]/g, '-')}`;
      const cleanPayload = JSON.parse(JSON.stringify(payload));
      const existing = storage.get<any[]>(STORAGE_KEY) || [];
      const next = [
        { id, createdAt: new Date().toISOString(), reportData: cleanPayload },
        ...existing.filter((item) => item?.id !== id),
      ].slice(0, MAX_SAVED_REPORTS);
      storage.set(STORAGE_KEY, next);
      return { id };
    } catch (err) {
      logger.error('[crashReportsService] Failed to save crash report:', err);
      return null;
    }
  },

  buildPayload(params: {
    userName?: string;
    userEmail?: string;
    userId?: string;
    settings?: Record<string, unknown>;
    diagnosticLogs?: unknown[];
  }): CrashReportPayload {
    return {
      reportType: 'FiTrack Bug & Crash Report',
      timestamp: new Date().toISOString(),
      app: {
        name: 'FiTrack',
        version: CONFIG.APP_VERSION,
      },
      device: {
        os: Platform.OS,
        osVersion: Platform.Version,
        isDevMode: __DEV__,
      },
      user: {
        name: params.userName || 'Athlete',
        email: params.userEmail || 'local-device',
        id: params.userId || 'local',
      },
      settings: params.settings,
      diagnosticLogs: params.diagnosticLogs,
    };
  },
};
