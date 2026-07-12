import { supabase } from './client';
import { Platform } from 'react-native';
import { CONFIG } from '../../config/constants';

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
    const { data, error } = await supabase.from('crash_reports').insert({
      user_id: payload.user.id !== 'unknown' && payload.user.id !== 'unauthenticated'
        ? payload.user.id
        : null,
      report_data: payload,
      app_version: payload.app.version,
      os: payload.device.os,
      os_version: String(payload.device.osVersion),
    }).select().single();

    if (error) {
      console.warn('[crashReportsService] Failed to submit crash report:', error.message);
      return null;
    }

    this.notifyEmail(data);
    return data;
  },

  async notifyEmail(record: unknown) {
    try {
      const { error: fnError } = await supabase.functions.invoke('send-crash-report-email', {
        body: { record },
      });
      if (fnError) {
        console.warn('[crashReportsService] Failed to notify email function:', fnError.message);
      }
    } catch {
      // Fire-and-forget; email notification is best-effort
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
