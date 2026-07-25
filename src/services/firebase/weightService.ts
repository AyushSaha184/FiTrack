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

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || userId,
          weight: Number(data.weight),
          date: data.date ? new Date(data.date) : new Date(),
          notes: data.notes || undefined,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
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
