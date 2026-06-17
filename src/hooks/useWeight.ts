import { useCallback, useEffect, useState } from 'react';
import { useWeightStore, useAuthStore } from '../stores';
import { autorun } from 'mobx';

export const useWeight = () => {
  const store = useWeightStore();
  const authStore = useAuthStore();

  const [state, setState] = useState({
    entries: store.entries,
    currentWeight: store.currentWeight,
    goalWeight: store.goalWeight,
    trend: store.trend,
    progress: store.progress,
    stats: store.stats,
    isLoading: store.isLoading,
    error: store.error,
  });

  useEffect(() => {
    const disposer = autorun(() => {
      setState({
        entries: store.entries,
        currentWeight: store.currentWeight,
        goalWeight: store.goalWeight,
        trend: store.trend,
        progress: store.progress,
        stats: store.stats,
        isLoading: store.isLoading,
        error: store.error,
      });
    });
    return () => disposer();
  }, [store]);

  const loadEntries = useCallback(
    async (days = 365) => {
      if (!authStore.userId) return;
      await store.loadEntries(authStore.userId, days);
    },
    [store, authStore.userId],
  );

  const loadStats = useCallback(
    async (days = 30) => {
      if (!authStore.userId) return;
      await store.loadStats(authStore.userId, days);
    },
    [store, authStore.userId],
  );

  const addEntry = useCallback(
    async (weight: number, date?: Date, notes?: string) => {
      if (!authStore.userId) throw new Error('Not authenticated');
      return store.addEntry(authStore.userId, weight, date, notes);
    },
    [store, authStore.userId],
  );

  const updateEntry = useCallback(
    async (entryId: string, weight: number, notes?: string) => {
      return store.updateEntry(entryId, weight, notes);
    },
    [store],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      return store.deleteEntry(entryId);
    },
    [store],
  );

  const setGoalWeight = useCallback(
    (weight: number) => {
      store.setGoalWeight(weight);
    },
    [store],
  );

  return {
    entries: state.entries,
    currentWeight: state.currentWeight,
    goalWeight: state.goalWeight,
    trend: state.trend,
    progress: state.progress,
    stats: state.stats,
    isLoading: state.isLoading,
    error: state.error,
    loadEntries,
    loadStats,
    addEntry,
    updateEntry,
    deleteEntry,
    setGoalWeight,
    getChartData: store.getChartData.bind(store),
    clearError: store.clearError.bind(store),
  };
};