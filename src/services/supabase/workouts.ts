import { supabase, withTokenRetry, ensureProfileExists } from './client';
import type { Workout, WorkoutExercise, Set } from '../../models';
import { toCamelCaseKeys, toSnakeCaseKeys } from '../../utils/mapping';

export const workoutsService = {
  async lookupExerciseIdBySlug(slug: string): Promise<string | null> {
    return withTokenRetry(async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id')
        .eq('slug', slug)
        .order('user_id', { nullsFirst: false })
        .limit(1);
      if (error || !data || data.length === 0) return null;
      return data[0].id;
    });
  },
  async getWorkouts(userId: string, startDate?: string, endDate?: string) {
    return withTokenRetry(async () => {
      let query = supabase
        .from('workouts')
        .select('*, exercises:workout_exercises(*, exercise:exercises(*), sets(*))')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return toCamelCaseKeys<Workout[]>(data);
    });
  },
  async getWorkout(workoutId: string) {
    return withTokenRetry(async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*, exercises:workout_exercises(*, exercise:exercises(*), sets(*))')
        .eq('id', workoutId)
        .single();
      if (error) throw error;
      return toCamelCaseKeys<Workout>(data);
    });
  },
  async createWorkout(workout: Partial<Workout>) {
    return withTokenRetry(async () => {
      if (workout.userId) {
        await ensureProfileExists(workout.userId);
      }
      const dbWorkout = toSnakeCaseKeys(workout);
      const { data, error } = await supabase
        .from('workouts')
        .insert(dbWorkout)
        .select()
        .single();
      if (error) throw error;
      return toCamelCaseKeys<Workout>(data);
    });
  },
  async updateWorkout(workoutId: string, updates: Partial<Workout>) {
    return withTokenRetry(async () => {
      const dbUpdates = toSnakeCaseKeys(updates);
      const { data, error } = await supabase
        .from('workouts')
        .update({ ...dbUpdates, updated_at: new Date().toISOString() })
        .eq('id', workoutId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCaseKeys<Workout>(data);
    });
  },
  async deleteWorkout(workoutId: string) {
    return withTokenRetry(async () => {
      const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
      if (error) throw error;
    });
  },
  async addExercise(workoutId: string, exerciseId: string, orderIndex: number) {
    return withTokenRetry(async () => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert({ workout_id: workoutId, exercise_id: exerciseId, order_index: orderIndex })
        .select()
        .single();
      if (error) throw error;
      return toCamelCaseKeys<any>(data);
    });
  },
  async addExercisesBulk(items: { id?: string; workoutId: string; exerciseId: string; orderIndex: number }[]) {
    return withTokenRetry(async () => {
      if (items.length === 0) return [];
      const payload = items.map((item) => toSnakeCaseKeys(item));
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert(payload)
        .select();
      if (error) throw error;
      return toCamelCaseKeys<any[]>(data || []);
    });
  },
  async addSetsBulk(sets: (Partial<Set> & { workoutExerciseId: string; workoutId?: string })[]) {
    return withTokenRetry(async () => {
      if (sets.length === 0) return [];
      const payload = sets.map((s) => toSnakeCaseKeys(s));
      const { data, error } = await supabase
        .from('sets')
        .insert(payload)
        .select();
      if (error) throw error;
      return toCamelCaseKeys<Set[]>(data || []);
    });
  },
  async removeExercise(workoutExerciseId: string) {
    return withTokenRetry(async () => {
      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', workoutExerciseId);
      if (error) throw error;
    });
  },
  async updateExerciseOrder(workoutExerciseId: string, orderIndex: number) {
    return withTokenRetry(async () => {
      const { error } = await supabase
        .from('workout_exercises')
        .update({ order_index: orderIndex })
        .eq('id', workoutExerciseId);
      if (error) throw error;
    });
  },
  async addSet(workoutExerciseId: string, set: Partial<Set>, workoutId?: string) {
    return withTokenRetry(async () => {
      const dbSet = toSnakeCaseKeys(set);
      const insertPayload: Record<string, any> = { workout_exercise_id: workoutExerciseId, ...dbSet };
      if (workoutId) {
        insertPayload.workout_id = workoutId;
      }
      const { data, error } = await supabase
        .from('sets')
        .insert(insertPayload)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return toCamelCaseKeys<Set>(data[0]);
    });
  },
  async updateSet(setId: string, updates: Partial<Set>) {
    return withTokenRetry(async () => {
      const dbUpdates = toSnakeCaseKeys(updates);
      const { data, error } = await supabase
        .from('sets')
        .update({ ...dbUpdates, updated_at: new Date().toISOString() })
        .eq('id', setId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return toCamelCaseKeys<Set>(data[0]);
    });
  },
  async removeSet(setId: string) {
    return withTokenRetry(async () => {
      const { error } = await supabase.from('sets').delete().eq('id', setId);
      if (error) throw error;
    });
  },
  async completeWorkout(workoutId: string, duration: number, totalVolume: number) {
    return withTokenRetry(async () => {
      const { data, error } = await supabase
        .from('workouts')
        .update({
          completed: true,
          end_time: new Date().toISOString(),
          duration,
          total_volume: totalVolume,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCaseKeys<Workout>(data);
    });
  },
};
