import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { collections } from '../firebase/firestore';
import { CONFIG } from '../../config/constants';
import { logger } from '../../utils/logger';

export interface AIContentReport {
  userId: string | null;
  userEmail: string | null;
  category: string;
  provider: string | null;
  model: string | null;
  coachNotes: string[];
  exerciseRecap: string[];
  appVersion: string;
  platform: string;
}

export const aiContentReportsService = {
  async submit(report: AIContentReport): Promise<{ id: string } | null> {
    try {
      const docRef = collections.aiContentReports.doc();
      const cleanPayload = JSON.parse(JSON.stringify({
        ...report,
        createdAt: firestore.FieldValue.serverTimestamp(),
      }));
      await docRef.set(cleanPayload, { merge: true });
      return { id: docRef.id };
    } catch (err) {
      logger.error('[aiContentReportsService] Failed to submit:', err);
      return null;
    }
  },
};
