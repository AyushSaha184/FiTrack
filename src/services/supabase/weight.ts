import { supabase } from './client';
import type { WeightEntry } from '../../models';
import { toCamelCaseKeys, toSnakeCaseKeys } from '../../utils/mapping';

export const weightService = {
  async getEntries(userId: string, startDate?: string, endDate?: string, limit = 100) {
    let query = supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return toCamelCaseKeys<WeightEntry[]>(data);
  },

  async getLatestEntry(userId: string) {
    const { data, error } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCaseKeys<WeightEntry>(data) : null;
  },

  async addEntry(entry: Partial<WeightEntry>) {
    const { userId, ...rest } = entry;
    const dbEntry = toSnakeCaseKeys(rest);
    const { data, error } = await supabase
      .from('weight_entries')
      .upsert({ ...dbEntry, user_id: userId }, { onConflict: 'user_id,date' })
      .select()
      .single();
    if (error) throw error;
    return toCamelCaseKeys<WeightEntry>(data);
  },

  async updateEntry(entryId: string, updates: Partial<WeightEntry>) {
    const dbUpdates = toSnakeCaseKeys(updates);
    const { data, error } = await supabase
      .from('weight_entries')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .select()
      .single();
    if (error) throw error;
    return toCamelCaseKeys<WeightEntry>(data);
  },

  async deleteEntry(entryId: string) {
    const { error } = await supabase
      .from('weight_entries')
      .delete()
      .eq('id', entryId);
    if (error) throw error;
  },

  async getStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await this.getEntries(
      userId,
      startDate.toISOString().split('T')[0],
      new Date().toISOString().split('T')[0],
      1000,
    );

    if (entries.length === 0) {
      return { highest: null, lowest: null, average: null, change: null };
    }

    const weights = entries.map((e) => e.weight);
    const highest = entries.reduce((max, e) => (e.weight > max.weight ? e : max));
    const lowest = entries.reduce((min, e) => (e.weight < min.weight ? e : min));
    const average = weights.reduce((a, b) => a + b, 0) / weights.length;
    const firstEntry = entries[entries.length - 1];
    const lastEntry = entries[0];
    const change = lastEntry?.weight - firstEntry?.weight;

    return { highest, lowest, average, change };
  },
};