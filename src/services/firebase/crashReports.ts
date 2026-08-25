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
  async submit(payload: CrashReportPayload, reportId?: string) {
    try {
      const id =
        reportId ||
        `crash_${payload.user.id || 'anon'}_${payload.timestamp.replace(/[:.]/g, '-')}`;
      const docRef = firestore().collection('crashReports').doc(id);
      const cleanPayload = JSON.parse(JSON.stringify(payload));
      await docRef.set(
        {
          id,
          userId: payload.user.id !== 'unknown' ? payload.user.id : null,
          reportData: cleanPayload,
          appVersion: payload.app.version,
          os: payload.device.os,
          osVersion: String(payload.device.osVersion),
          createdAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { id };
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
