import { useCallback, useEffect, useState } from 'react';
import { useWorkoutStore, useAuthStore } from '../stores';
import { autorun } from 'mobx';
import type { WorkoutType, DayOfWeek } from '../models';

export const useWorkout = () => {
  const store = useWorkoutStore();
  const authStore = useAuthStore();

  const [state, setState] = useState({
    activeWorkout: store.activeWorkout,
    activeWorkoutExercises: store.activeWorkoutExercises,
    totalVolume: store.totalVolume,
    completedSetsCount: store.completedSetsCount,
    totalSetsCount: store.totalSetsCount,
    selectedDay: store.selectedDay,
    selectedDate: store.selectedDate,
    isLoading: store.isLoading,
    error: store.error,
  });

  useEffect(() => {
    const disposer = autorun(() => {
      setState({
        activeWorkout: store.activeWorkout,
        activeWorkoutExercises: store.activeWorkoutExercises,
        totalVolume: store.totalVolume,
        completedSetsCount: store.completedSetsCount,
        totalSetsCount: store.totalSetsCount,
        selectedDay: store.selectedDay,
        selectedDate: store.selectedDate,
        isLoading: store.isLoading,
        error: store.error,
      });
    });
    return () => disposer();
  }, [store]);

  const startWorkout = useCallback(
    async (type: WorkoutType = 'custom', name?: string) => {
      if (!authStore.userId) return null;
      return store.startWorkout(authStore.userId, type, name);
    },
    [store, authStore.userId],
  );

  const completeWorkout = useCallback(async () => {
    return store.completeWorkout();
  }, [store]);

  const addExercise = useCallback(
    (exerciseId: string, exerciseName: string, muscleGroup: string) => {
      store.addExercise(exerciseId, exerciseName, muscleGroup);
    },
    [store],
  );

  const removeExercise = useCallback(
    (workoutExerciseId: string) => {
      store.removeExercise(workoutExerciseId);
    },
    [store],
  );

  const addSet = useCallback(
    (workoutExerciseId: string, weight = 0, reps = 0) => {
      store.addSet(workoutExerciseId, weight, reps);
    },
    [store],
  );

  const updateSet = useCallback(
    (workoutExerciseId: string, setId: string, updates: any) => {
      store.updateSet(workoutExerciseId, setId, updates);
    },
    [store],
  );

  const toggleSetComplete = useCallback(
    (workoutExerciseId: string, setId: string) => {
      store.toggleSetComplete(workoutExerciseId, setId);
    },
    [store],
  );

  const removeSet = useCallback(
    (workoutExerciseId: string, setId: string) => {
      store.removeSet(workoutExerciseId, setId);
    },
    [store],
  );

  const setDay = useCallback(
    (day: DayOfWeek, date: Date) => {
      store.setDay(day, date);
    },
    [store],
  );

  const loadWorkouts = useCallback(
    async (startDate?: string, endDate?: string) => {
      if (!authStore.userId) return;
      await store.loadWorkouts(authStore.userId, startDate, endDate);
    },
    [store, authStore.userId],
  );

  return {
    activeWorkout: state.activeWorkout,
    activeWorkoutExercises: state.activeWorkoutExercises,
    totalVolume: state.totalVolume,
    completedSetsCount: state.completedSetsCount,
    totalSetsCount: state.totalSetsCount,
    selectedDay: state.selectedDay,
    selectedDate: state.selectedDate,
    isLoading: state.isLoading,
    error: state.error,
    startWorkout,
    completeWorkout,
    cancelWorkout: store.cancelWorkout.bind(store),
    restoreActiveWorkout: store.restoreActiveWorkout.bind(store),
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    toggleSetComplete,
    removeSet,
    setDay,
    loadWorkouts,
    resetWorkoutRoutine: store.resetWorkoutRoutine.bind(store),
  };
};