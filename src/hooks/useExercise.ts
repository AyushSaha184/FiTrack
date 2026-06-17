import { useCallback, useEffect } from 'react';
import { useExerciseStore, useAuthStore } from '../stores';
import type { Exercise, MuscleGroup } from '../models';

export const useExercise = () => {
  const store = useExerciseStore();
  const authStore = useAuthStore();

  const loadExercises = useCallback(async () => {
    await store.loadExercises(authStore.userId ?? undefined);
  }, [store, authStore.userId]);

  const searchExercises = useCallback(
    async (query: string) => {
      await store.searchExercises(query, authStore.userId ?? undefined);
    },
    [store, authStore.userId],
  );

  const createCustomExercise = useCallback(
    async (exercise: Partial<Exercise>) => {
      if (!authStore.userId) throw new Error('Not authenticated');
      return store.createCustomExercise({
        ...exercise,
        userId: authStore.userId,
      });
    },
    [store, authStore.userId],
  );

  const updateExercise = useCallback(
    async (exerciseId: string, updates: Partial<Exercise>) => {
      return store.updateExercise(exerciseId, updates);
    },
    [store],
  );

  const deleteExercise = useCallback(
    async (exerciseId: string) => {
      return store.deleteExercise(exerciseId);
    },
    [store],
  );

  const getByMuscleGroup = useCallback(
    (muscleGroup: MuscleGroup) => {
      return store.getExercisesByMuscleGroup(muscleGroup);
    },
    [store],
  );

  return {
    exercises: store.exerciseList,
    predefinedExercises: store.predefinedList,
    customExercises: store.customList,
    recentExercises: store.recentExercises,
    searchResults: store.searchResults,
    isLoading: store.isLoading,
    error: store.error,
    loadExercises,
    searchExercises,
    clearSearch: store.clearSearch.bind(store),
    createCustomExercise,
    updateExercise,
    deleteExercise,
    getByMuscleGroup,
    addToRecent: store.addToRecent.bind(store),
    clearError: store.clearError.bind(store),
  };
};