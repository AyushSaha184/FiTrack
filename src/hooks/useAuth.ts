import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../stores';
import { reaction } from 'mobx';

const shallowEqual = (a: Record<string, any>, b: Record<string, any>): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
};

export const useAuth = () => {
  const store = useAuthStore();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const disposer = reaction(
      () => ({
        user: store.user,
        userId: store.user?.id,
        userName: store.user?.name,
        userAvatar: store.user?.avatarUrl,
        isLoading: store.isLoading,
        isInitialized: store.isInitialized,
        hasStarted: store.hasStarted,
        error: store.error,
      }),
      (current, previous) => {
        if (!shallowEqual(current, previous)) {
          forceUpdate({});
        }
      }
    );

    const init = async () => {
      await store.initialize();
    };
    init();

    return () => disposer();
  }, [store]);

  const startApp = useCallback(async () => {
    await store.startApp();
  }, [store]);

  const updateProfile = useCallback(async (updates: { name?: string; email?: string; avatarUrl?: string; profile?: any }) => {
    await store.updateProfile(updates);
  }, [store]);

  const clearError = useCallback(() => {
    store.clearError();
  }, [store]);

  const resetApp = useCallback(async () => {
    await store.resetApp();
  }, [store]);

  return {
    user: store.user,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    hasStarted: store.hasStarted,
    error: store.error,
    startApp,
    updateProfile,
    clearError,
    resetApp,
  };
};
