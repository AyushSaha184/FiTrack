import firestore from '@react-native-firebase/firestore';
import { collections } from './firestore';
import type { StepEntry } from '../../models';
import { logger } from '../../utils/logger';

export interface FirestoreStepLog {
  id: string;
  userId: string;
  stepCount: number;
  targetGoal: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const stepsService = {
  async getStepLogs(userId: string, dateStr: string): Promise<FirestoreStepLog | null> {
    try {
      const doc = await collections.stepDoc(userId, dateStr).get();
      if (!doc.exists) return null;
      const data = doc.data();
      if (!data) return null;
      return {
        id: doc.id,
        userId: data.userId || userId,
        stepCount: Number(data.stepCount || 0),
        targetGoal: Number(data.targetGoal || 10000),
        date: data.date ? new Date(data.date) : new Date(),
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      };
    } catch (err) {
      logger.error('[stepsService] getStepLogs error:', err);
      return null;
    }
  },

  async saveStepLog(userId: string, stepCount: number, targetGoal: number, dateStr: string): Promise<FirestoreStepLog> {
    try {
      const docRef = collections.stepDoc(userId, dateStr);
      const payload = {
        id: dateStr,
        userId,
        stepCount,
        targetGoal,
        date: dateStr,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await docRef.set(payload, { merge: true });

      return {
        id: dateStr,
        userId,
        stepCount,
        targetGoal,
        date: new Date(dateStr),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (err) {
      logger.error('[stepsService] saveStepLog error:', err);
      throw err;
    }
  },
};
