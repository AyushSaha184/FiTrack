import firestore from '@react-native-firebase/firestore';
import { collections } from './firestore';
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

const parseStepDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const parts = val.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

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
        date: parseStepDate(data.date),
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      };
    } catch (err) {
      logger.error('[stepsService] getStepLogs error:', err);
      return null;
    }
  },

  async getStepHistory(userId: string, days = 30): Promise<FirestoreStepLog[]> {
    try {
      const snapshot = await collections
        .stepLogs(userId)
        .orderBy('date', 'desc')
        .limit(days)
        .get();

      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || userId,
          stepCount: Number(data.stepCount || 0),
          targetGoal: Number(data.targetGoal || 10000),
          date: parseStepDate(data.date),
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        };
      });
    } catch (err) {
      logger.error('[stepsService] getStepHistory error:', err);
      return [];
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
