import { supabase } from './client';
import type { Exercise, MuscleGroup, Equipment } from '../../models';
import { toCamelCaseKeys, toSnakeCaseKeys } from '../../utils/mapping';

export const exercisesService = {
  async getExercises(userId?: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`user_id.eq.${userId ?? 'null'},is_custom.eq.true`)
      .order('name');
    if (error) throw error;
    return toCamelCaseKeys<Exercise[]>(data);
  },

  async getPredefinedExercises() {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .is('user_id', null)
      .order('name');
    if (error) throw error;
    return toCamelCaseKeys<Exercise[]>(data);
  },

  async getCustomExercises(userId: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId)
      .eq('is_custom', true)
      .order('name');
    if (error) throw error;
    return toCamelCaseKeys<Exercise[]>(data);
  },

  async searchExercises(query: string, userId?: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`user_id.eq.${userId ?? 'null'},is_custom.eq.true`)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(50);
    if (error) throw error;
    return toCamelCaseKeys<Exercise[]>(data);
  },

  async getExercisesByMuscleGroup(muscleGroup: MuscleGroup, userId?: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`user_id.eq.${userId ?? 'null'},is_custom.eq.true`)
      .eq('muscle_group', muscleGroup)
      .order('name');
    if (error) throw error;
    return toCamelCaseKeys<Exercise[]>(data);
  },

  async createExercise(exercise: Partial<Exercise>) {
    const dbExercise = toSnakeCaseCaseKeysForExercise(exercise);
    const { data, error } = await supabase
      .from('exercises')
      .insert(dbExercise)
      .select()
      .single();
    if (error) throw error;
    return toCamelCaseKeys<Exercise>(data);
  },

  async updateExercise(exerciseId: string, updates: Partial<Exercise>) {
    const dbUpdates = toSnakeCaseCaseKeysForExercise(updates);
    const { data, error } = await supabase
      .from('exercises')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', exerciseId)
      .select()
      .single();
    if (error) throw error;
    return toCamelCaseKeys<Exercise>(data);
  },

  async deleteExercise(exerciseId: string) {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId);
    if (error) throw error;
  },

  async getExerciseHistory(exerciseId: string, userId: string, limit = 10) {
    const { data, error } = await supabase
      .from('sets')
      .select(`
        *,
        workout_exercise:workout_exercises(
          *,
          workout:workouts(*),
          exercise:exercises(*)
        )
      `)
      .eq('workout_exercise.exercise_id', exerciseId)
      .eq('workout_exercise.workout.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return toCamelCaseKeys<any>(data);
  },

  async getExercisePR(exerciseId: string, userId: string) {
    const { data, error } = await supabase
      .from('sets')
      .select('weight, reps')
      .eq('workout_exercise.exercise_id', exerciseId)
      .eq('workout_exercise.workout.user_id', userId)
      .eq('completed', true)
      .order('weight', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ? toCamelCaseKeys<any>(data[0]) : null;
  },
};

// Custom helper to correctly map fields that are arrays or have specific custom formats
function toSnakeCaseCaseKeysForExercise(exercise: Partial<Exercise>) {
  const snake = toSnakeCaseKeys(exercise);
  // If muscleGroup is defined, the table column in 001_initial_schema.sql is `muscle_group`
  // And secondaryMuscles is `secondary_muscles`
  return snake;
}