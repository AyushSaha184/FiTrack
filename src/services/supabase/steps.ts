import { supabase, ensureProfileExists } from './client';
import type { StepEntry, StepSource } from '../../models';
import { toCamelCaseKeys, toSnakeCaseKeys } from '../../utils/mapping';

export const stepsService = {
  async getEntries(userId: string, startDate?: string, endDate?: string, limit = 100) {
    let query = supabase
      .from('steps')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return toCamelCaseKeys<StepEntry[]>(data);
  },

  async getTodayEntry(userId: string, date = new Date().toISOString().split('T')[0]) {
    const { data, error } = await supabase
      .from('steps')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? toCamelCaseKeys<StepEntry>(data) : null;
  },

  async upsertEntry(userId: string, date: string, steps: number, source: StepSource = 'manual') {
    if (userId) {
      await ensureProfileExists(userId);
    }
    const { data, error } = await supabase
      .from('steps')
      .upsert(
        {
          user_id: userId,
          date,
          steps,
          source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single();
    if (error) throw error;
    return toCamelCaseKeys<StepEntry>(data);
  },


  async updateEntry(entryId: string, steps: number) {
    const { data, error } = await supabase
      .from('steps')
      .update({ steps, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .select()
      .single();
    if (error) throw error;
    return toCamelCaseKeys<StepEntry>(data);
  },

  async deleteEntry(entryId: string) {
    const { error } = await supabase.from('steps').delete().eq('id', entryId);
    if (error) throw error;
  },

  async getWeeklyStats(userId: string) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);

    const entries = await stepsService.getEntries(
      userId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      7,
    );

    const total = entries.reduce((sum: number, e: StepEntry) => sum + e.steps, 0);
    const average = entries.length > 0 ? total / entries.length : 0;
    const best = entries.reduce<StepEntry | null>((max, e) => {
      if (!max) return e;
      return e.steps > max.steps ? e : max;
    }, entries[0] || null);

    return { total, average, best, count: entries.length };
  },
};