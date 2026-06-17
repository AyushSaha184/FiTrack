import { useCallback, useEffect, useState } from 'react';
import { useStepsStore, useAuthStore } from '../stores';
import { autorun } from 'mobx';

export const useSteps = () => {
  const store = useStepsStore();
  const authStore = useAuthStore();

  const [state, setState] = useState({
    todaySteps: store.todaySteps,
    todayProgress: store.todayProgress,
    todayCalories: store.todayCalories,
    dailyGoal: store.dailyGoal,
    weeklyEntries: store.weeklyEntries,
    weeklyTotal: store.weeklyTotal,
    weeklyAverage: store.weeklyAverage,
    weeklyBest: store.weeklyBest,
    source: store.source,
    isLoading: store.isLoading,
    error: store.error,
  });

  useEffect(() => {
    const disposer = autorun(() => {
      setState({
        todaySteps: store.todaySteps,
        todayProgress: store.todayProgress,
        todayCalories: store.todayCalories,
        dailyGoal: store.dailyGoal,
        weeklyEntries: store.weeklyEntries,
        weeklyTotal: store.weeklyTotal,
        weeklyAverage: store.weeklyAverage,
        weeklyBest: store.weeklyBest,
        source: store.source,
        isLoading: store.isLoading,
        error: store.error,
      });
    });
    return () => disposer();
  }, [store]);

  const loadTodaySteps = useCallback(async () => {
    if (!authStore.userId) return;
    await store.loadTodaySteps(authStore.userId);
  }, [store, authStore.userId]);

  const loadWeeklySteps = useCallback(async () => {
    if (!authStore.userId) return;
    await store.loadWeeklySteps(authStore.userId);
  }, [store, authStore.userId]);

  const addSteps = useCallback(
    async (steps: number, date?: Date) => {
      if (!authStore.userId) throw new Error('Not authenticated');
      return store.addSteps(authStore.userId, steps, date);
    },
    [store, authStore.userId],
  );

  const syncFromHealthApp = useCallback(
    async (steps: number, source: 'apple_health' | 'google_fit') => {
      if (!authStore.userId) throw new Error('Not authenticated');
      return store.syncFromHealthApp(authStore.userId, steps, source);
    },
    [store, authStore.userId],
  );

  const setDailyGoal = useCallback(
    (goal: number) => {
      store.setDailyGoal(goal);
    },
    [store],
  );

  return {
    todaySteps: state.todaySteps,
    todayProgress: state.todayProgress,
    todayCalories: state.todayCalories,
    dailyGoal: state.dailyGoal,
    weeklyEntries: state.weeklyEntries,
    weeklyTotal: state.weeklyTotal,
    weeklyAverage: state.weeklyAverage,
    weeklyBest: state.weeklyBest,
    source: state.source,
    isLoading: state.isLoading,
    error: state.error,
    loadTodaySteps,
    loadWeeklySteps,
    addSteps,
    syncFromHealthApp,
    setDailyGoal,
    getChartData: store.getChartData.bind(store),
    clearError: store.clearError.bind(store),
  };
};