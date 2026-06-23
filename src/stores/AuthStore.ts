import { makeAutoObservable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { authService } from '../services/supabase/auth';
import type { User, UserPreferences, Units } from '../models';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import type { LoginInput, SignupInput } from '../utils/validators';
import { supabase } from '../services/supabase/client';

const defaultPreferences: UserPreferences = {
  units: { weight: 'kg', height: 'cm', temperature: 'celsius' },
  theme: 'dark',
  notifications: {
    workoutReminders: true,
    weightLogReminders: true,
    stepGoalReminders: true,
    streakNotifications: true,
    achievementNotifications: true,
    restTimerSound: true,
    restTimerVibration: true,
  },
  workout: {
    defaultRestTime: 90,
    autoStartRestTimer: false,
    keepScreenAwake: true,
    autoSave: true,
    defaultUnits: { weight: 'kg', height: 'cm', temperature: 'celsius' },
  },
};

export class AuthStore {
  user: User | null = null;
  isLoading = true;
  isInitialized = false;
  error: string | null = null;
  isAuthenticated = false;

  constructor() {
    makeAutoObservable(this);
  }

  get isOnboarded() {
    return this.user?.onboardingCompleted ?? false;
  }

  get userId() {
    return this.user?.id ?? null;
  }

  get preferences(): UserPreferences {
    return this.user?.preferences ?? defaultPreferences;
  }

  get units(): Units {
    return this.preferences.units;
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      this.isLoading = true;
      const { session } = await authService.getSession();
      if (session?.user) {
        await this.fetchUser(session);
      }
    } catch (error) {
      console.error('[AuthStore] initialize error:', error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isInitialized = true;
      });
    }
  }

  async fetchUser(customSession?: any) {
    console.log('[AuthStore] fetchUser starting...');
    try {
      const session = customSession !== undefined ? customSession : (await authService.getSession()).session;
      console.log('[AuthStore] fetchUser got session user:', session?.user?.email);
      
      if (session?.user) {
        // Explicitly sync the session to the supabase client if it's not set or has changed
        if (!clientSession || clientSession.access_token !== session.access_token) {
          console.log('[AuthStore] Client session out of sync, setting it manually...');
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          if (setSessionError) {
            console.error('[AuthStore] Failed to sync session:', setSessionError);
            return;
          }
        }

        const metadata = session.user.user_metadata || {};

        // Ensure profile exists in database
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('[AuthStore] Error checking user profile:', profileError);
        }

        if (!profile) {
          console.log('[AuthStore] Profile not found in DB, inserting one...');
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              name: metadata.name || 'Athlete',
              avatar_url: metadata.avatar_url || null,
              onboarding_completed: metadata.onboardingCompleted ?? false,
            })
            .select()
            .single();

          if (insertError) {
            console.error('[AuthStore] Failed to insert profile:', insertError);
            return;
          }
          console.log('[AuthStore] Profile inserted successfully');
          profile = inserted;
        }

        const dbName = profile?.name || metadata.name || 'Athlete';
        const dbOnboardingCompleted = profile?.onboarding_completed ?? metadata.onboardingCompleted ?? false;

        runInAction(() => {
          this.user = {
            id: session.user.id,
            email: session.user.email || '',
            name: dbName,
            avatarUrl: profile?.avatar_url || metadata.avatar_url,
            createdAt: new Date(session.user.created_at),
            updatedAt: new Date(),
            preferences: profile?.preferences || defaultPreferences,
            profile: profile?.profile || { fitnessLevel: 'beginner' },
            onboardingCompleted: dbOnboardingCompleted,
          };
          this.isAuthenticated = true;
        });
        console.log('[AuthStore] fetchUser completed, isAuthenticated =', this.isAuthenticated);
      } else {
        console.log('[AuthStore] fetchUser: no user in session');
      }
    } catch (error) {
      console.error('[AuthStore] fetchUser error:', error);
    }
  }

  async login(input: LoginInput) {
    console.log('[AuthStore] login started with email:', input.email);
    try {
      this.error = null;
      this.isLoading = true;
      console.log('[AuthStore] calling authService.login...');
      const response = await authService.login(input);
      console.log('[AuthStore] authService.login succeeded, response:', response);
      console.log('[AuthStore] calling fetchUser...');
      await this.fetchUser(response.session);
      if (!this.isAuthenticated) {
        throw new Error('Failed to load user profile. Please try logging in again.');
      }
    } catch (error: any) {
      console.error('[AuthStore] login encountered error:', error);
      runInAction(() => {
        this.error = error.message || 'Login failed';
      });
      throw error;
    } finally {
      console.log('[AuthStore] login finally block, setting isLoading = false');
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async signup(input: SignupInput) {
    console.log('[AuthStore] signup called with email:', input.email);
    try {
      this.error = null;
      this.isLoading = true;
      console.log('[AuthStore] calling authService.signup...');
      const response = await authService.signup(input);
      console.log('[AuthStore] authService.signup succeeded, response:', response);
      // If auto-confirm is enabled (dev mode), session is returned immediately
      if (response.session) {
        console.log('[AuthStore] signup received session (auto-confirm), creating profile...');
        await this.fetchUser(response.session);
      }
    } catch (error: any) {
      console.error('[AuthStore] signup encountered error:', error);
      runInAction(() => {
        this.error = error.message || 'Signup failed';
      });
      throw error;
    } finally {
      console.log('[AuthStore] signup finally block, setting isLoading = false');
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async socialLogin(provider: 'google') {
    console.log('[AuthStore] socialLogin started with provider:', provider);
    try {
      this.error = null;
      this.isLoading = true;
      if (provider === 'google') {
        const response = await authService.signInWithGoogle();
        console.log('[AuthStore] socialLogin signInWithGoogle succeeded, fetching user...');
        await this.fetchUser(response.session);
        if (!this.isAuthenticated) {
          throw new Error('Failed to load user profile. Please try signing in again.');
        }
      }
    } catch (error: any) {
      console.error('[AuthStore] socialLogin encountered error:', error);
      runInAction(() => {
        this.error = error.message || 'Social login failed';
      });
      throw error;
    } finally {
      console.log('[AuthStore] socialLogin finally block, setting isLoading = false');
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async logout() {
    try {
      this.isLoading = true;
      await authService.signOut();
    } catch (error) {
      console.error('[AuthStore] logout error:', error);
    } finally {
      runInAction(() => {
        this.user = null;
        this.isAuthenticated = false;
        this.isLoading = false;
      });
    }
  }

  async resetPassword(email: string) {
    try {
      this.error = null;
      await authService.resetPassword(email);
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Password reset failed';
      });
      throw error;
    }
  }

  async completeOnboarding() {
    if (!this.user) return;
    const userId = this.user.id;
    runInAction(() => {
      this.user = { ...this.user!, onboardingCompleted: true };
    });
    await authService.updateProfile({
      name: this.user.name,
      onboardingCompleted: true,
    });
    // Keep profiles table in sync so fetchUser reads correct state on next launch
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);
    if (error) {
      console.error('[AuthStore] Failed to update onboarding_completed in profiles:', error);
    }
  }

  async updateProfile(updates: { name?: string; email?: string }) {
    if (!this.user) return;
    try {
      await authService.updateProfile(updates);
      runInAction(() => {
        if (updates.name) this.user!.name = updates.name;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Profile update failed';
      });
      throw error;
    }
  }

  clearError() {
    this.error = null;
  }
}

export const authStore = new AuthStore();
export const AuthContext = createContext(authStore);
export const useAuthStore = () => useContext(AuthContext);