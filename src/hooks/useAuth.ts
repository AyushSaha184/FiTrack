import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../stores';
import { autorun } from 'mobx';
import type { LoginInput, SignupInput } from '../utils/validators';

export const useAuth = () => {
  const store = useAuthStore();
  const [state, setState] = useState({
    user: store.user,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    isAuthenticated: store.isAuthenticated,
    isOnboarded: store.isOnboarded,
    error: store.error,
  });

  useEffect(() => {
    const disposer = autorun(() => {
      setState({
        user: store.user,
        isLoading: store.isLoading,
        isInitialized: store.isInitialized,
        isAuthenticated: store.isAuthenticated,
        isOnboarded: store.isOnboarded,
        error: store.error,
      });
    });

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

  return {
    user: state.user,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    isAuthenticated: state.isAuthenticated,
    isOnboarded: state.isOnboarded,
    error: state.error,
    login,
    signup,
    socialLogin,
    logout,
    resetPassword,
    completeOnboarding,
    updateProfile,
    clearError: store.clearError.bind(store),
  };
};