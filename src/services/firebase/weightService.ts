import firestore from '@react-native-firebase/firestore';
import { collections } from './firestore';
import type { WeightEntry } from '../../models';
import { logger } from '../../utils/logger';

export const weightService = {
  async getWeightEntries(userId: string): Promise<WeightEntry[]> {
    try {
      const snapshot = await collections
        .weightEntries(userId)
        .orderBy('date', 'desc')
        .get();

      const parseDate = (val: any): Date => {
        if (!val) return new Date();
        if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
        if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();
        if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date() : d;
      };

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || userId,
          weight: Number(data.weight),
          date: parseDate(data.date),
          notes: data.notes || undefined,
          createdAt: parseDate(data.createdAt),
          updatedAt: parseDate(data.updatedAt),
        } as WeightEntry;
      });
    } catch (err) {
      logger.error('[weightService] getWeightEntries error:', err);
      throw err;
    }
  },

  async addWeightEntry(
    userId: string,
    entry: { id?: string; weight: number; date: Date; notes?: string }
  ): Promise<WeightEntry> {
    try {
      const entryId = entry.id || collections.weightEntries(userId).doc().id;
      const dateStr = entry.date.toISOString();

      const payload = {
        id: entryId,
        userId,
        weight: entry.weight,
        date: dateStr,
        notes: entry.notes || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await collections.weightDoc(userId, entryId).set(payload, { merge: true });

      return {
        id: entryId,
        userId,
        weight: entry.weight,
        date: new Date(dateStr),
        notes: entry.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (err) {
      logger.error('[weightService] addWeightEntry error:', err);
      throw err;
    }
  },

  async deleteWeightEntry(userId: string, entryId: string): Promise<void> {
    try {
      await collections.weightDoc(userId, entryId).delete();
    } catch (err) {
      logger.error('[weightService] deleteWeightEntry error:', err);
      throw err;
    }
  },
};
