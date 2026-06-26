import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores';
import { reaction } from 'mobx';
import type { LoginInput, SignupInput } from '../utils/validators';

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
        isLoading: store.isLoading,
        isInitialized: store.isInitialized,
        isAuthenticated: store.isAuthenticated,
        isOnboarded: store.isOnboarded,
        isNameRequired: store.isNameRequired,
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

  const login = useCallback(async (input: LoginInput) => {
    await store.login(input);
  }, [store]);

  const signup = useCallback(async (input: SignupInput) => {
    await store.signup(input);
  }, [store]);

  const socialLogin = useCallback(async (provider: 'google') => {
    await store.socialLogin(provider);
  }, [store]);

  const logout = useCallback(async () => {
    await store.logout();
  }, [store]);

  const resetPassword = useCallback(async (email: string) => {
    await store.resetPassword(email);
  }, [store]);

  const completeOnboarding = useCallback(async () => {
    await store.completeOnboarding();
  }, [store]);

  const updateProfile = useCallback(async (updates: { name?: string; email?: string }) => {
    await store.updateProfile(updates);
  }, [store]);

  const setUserName = useCallback(async (name: string) => {
    await store.setUserName(name);
  }, [store]);

  const clearError = useCallback(() => {
    store.clearError();
  }, [store]);

  return {
    user: store.user,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    isAuthenticated: store.isAuthenticated,
    isOnboarded: store.isOnboarded,
    isNameRequired: store.isNameRequired,
    error: store.error,
    login,
    signup,
    socialLogin,
    logout,
    resetPassword,
    completeOnboarding,
    updateProfile,
    setUserName,
    clearError,
  };
};
