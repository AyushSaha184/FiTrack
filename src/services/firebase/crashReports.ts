import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { CONFIG } from '../../config/constants';
import { logger } from '../../utils/logger';

export interface CrashReportPayload {
  reportType: string;
  timestamp: string;
  app: { name: string; version: string };
  device: { os: string; osVersion: string | number; isDevMode: boolean };
  user: { name: string; email: string; id: string };
  settings?: Record<string, unknown>;
  diagnosticLogs?: unknown[];
}

export const crashReportsService = {
  async submit(payload: CrashReportPayload) {
    try {
      const docRef = firestore().collection('crashReports').doc();
      await docRef.set({
        id: docRef.id,
        userId: payload.user.id !== 'unknown' ? payload.user.id : null,
        reportData: payload,
        appVersion: payload.app.version,
        os: payload.device.os,
        osVersion: String(payload.device.osVersion),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      return { id: docRef.id };
    } catch (err) {
      logger.error('[crashReportsService] Failed to submit crash report:', err);
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
        email: params.userEmail || 'unknown',
        id: params.userId || 'unknown',
      },
      settings: params.settings,
      diagnosticLogs: params.diagnosticLogs,
    };
  },
};
