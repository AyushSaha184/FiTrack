import { makeAutoObservable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { supabaseAuthService } from '../services/supabase/auth';
import { supabase } from '../services/supabase/client';
import type { User, UserPreferences, Units } from '../models';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import type { LoginInput, SignupInput } from '../utils/validators';
import { logger } from '../utils/logger';

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
  // Track if user needs to set their name (for Google sign-in)
  isNameRequired = false;

  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get isOnboarded() {
    return this.user?.onboardingCompleted ?? false;
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

      // Check for existing session
      const { session } = await supabaseAuthService.getSession();
      if (session?.user) {
        await this.fetchUser(session.user);
      }

      // Listen for auth state changes (token refresh, sign-out from another tab, etc.)
      this.authUnsubscribe = supabaseAuthService.onAuthStateChange(
        (event, newSession) => {
          console.log('[AuthStore] onAuthStateChange event:', event);
          if (event === 'SIGNED_OUT') {
            runInAction(() => {
              this.user = null;
              this.isAuthenticated = false;
              this.isNameRequired = false;
            });
          } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
            runInAction(() => {
              this.fetchUser(newSession.user);
            });
          }
        },
      );
    } catch (error) {
      logger.error('[AuthStore] initialize error:', error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isInitialized = true;
      });
    }
  }

  async fetchUser(supabaseUser: any, isGoogleSignIn = false) {
    console.log('[AuthStore] fetchUser starting...');
    try {
      const user = supabaseUser;
      if (!user) {
        console.log('[AuthStore] fetchUser: no user');
        return;
      }

      console.log('[AuthStore] fetchUser got user:', user.email);

      // Read profile from profiles table (handle_new_user trigger auto-creates it)
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        logger.error('[AuthStore] Error reading profile:', profileError);
      }

      // If profile doesn't exist yet (trigger may not have fired yet), create it
      if (!profile) {
        console.log('[AuthStore] Profile not found, inserting...');
        const metadata = user.user_metadata || {};
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: metadata.name || metadata.full_name || 'Athlete',
            avatar_url: metadata.avatar_url || metadata.picture || null,
            onboarding_completed: false,
          })
          .select()
          .single();

        if (insertError) {
          logger.error('[AuthStore] Failed to insert profile:', insertError);
          return;
        }
        profile = inserted;
      }

      const displayName = profile?.name || user.user_metadata?.name || 'Athlete';
      const onboardingCompleted = profile?.onboarding_completed ?? false;

      // For Google sign-in: if no name is set, require name input
      const needsName = isGoogleSignIn && (!displayName || displayName === 'Athlete');

      runInAction(() => {
        this.user = {
          id: user.id,
          email: user.email || '',
          name: displayName,
          avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(),
          preferences: defaultPreferences,
          profile: {
            fitnessLevel: profile?.fitness_level || 'beginner',
            age: profile?.age,
            gender: profile?.gender,
            height: profile?.height ? Number(profile.height) : undefined,
            goalWeight: profile?.goal_weight ? Number(profile.goal_weight) : undefined,
            weeklyGoal: profile?.weekly_goal,
          },
          onboardingCompleted,
        };
        this.isAuthenticated = true;
        this.isNameRequired = needsName;
      });
      console.log('[AuthStore] fetchUser completed, isAuthenticated =', this.isAuthenticated, 'isNameRequired =', needsName);
    } catch (error) {
      logger.error('[AuthStore] fetchUser error:', error);
    }
  }

  // Set user's name after Google sign-in
  async setUserName(name: string) {
    if (!this.user) return;
    try {
      this.isLoading = true;
      await supabase
        .from('profiles')
        .update({ name })
        .eq('id', this.user.id);

      // Also update auth metadata
      await supabase.auth.updateUser({ data: { name, full_name: name } });

      runInAction(() => {
        this.user!.name = name;
        this.isNameRequired = false;
      });
    } catch (error: any) {
      logger.error('[AuthStore] setUserName error:', error);
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async login(input: LoginInput) {
    console.log('[AuthStore] login started with email:', input.email);
    try {
      this.error = null;
      this.isLoading = true;
      console.log('[AuthStore] calling supabaseAuthService.login...');
      const response = await supabaseAuthService.login(input);
      console.log('[AuthStore] supabaseAuthService.login succeeded');
      console.log('[AuthStore] calling fetchUser...');
      await this.fetchUser(response.user, false);
      if (!this.isAuthenticated) {
        throw new Error('Failed to load user profile. Please try logging in again.');
      }
    } catch (error: any) {
      logger.error('[AuthStore] login encountered error:', error);
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
      console.log('[AuthStore] calling supabaseAuthService.signup...');
      const response = await supabaseAuthService.signup(input);
      console.log('[AuthStore] supabaseAuthService.signup succeeded');
      // If auto-confirm is enabled (dev mode), session is returned immediately
      if (response.session && response.user) {
        console.log('[AuthStore] signup received session (auto-confirm), fetching user...');
        await this.fetchUser(response.user, false);
      }
    } catch (error: any) {
      logger.error('[AuthStore] signup encountered error:', error);
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
        const response = await supabaseAuthService.signInWithGoogle();
        console.log('[AuthStore] socialLogin signInWithGoogle succeeded, fetching user...');
        await this.fetchUser(response.user, true);
        if (!this.isAuthenticated) {
          throw new Error('Failed to load user profile. Please try signing in again.');
        }
      }
    } catch (error: any) {
      logger.error('[AuthStore] socialLogin encountered error:', error);
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
      await supabaseAuthService.signOut();
    } catch (error) {
      logger.error('[AuthStore] logout error:', error);
    } finally {
      runInAction(() => {
        this.user = null;
        this.isAuthenticated = false;
        this.isNameRequired = false;
        this.isLoading = false;
      });
    }
  }

  async resetPassword(email: string) {
    try {
      this.error = null;
      await supabaseAuthService.resetPassword(email);
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

    // Update profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);
    if (error) {
      logger.error('[AuthStore] Failed to update onboarding_completed in profiles:', error);
    }

    // Also update auth metadata
    await supabaseAuthService.updateProfile({
      name: this.user!.name,
      onboardingCompleted: true,
    });
  }

  async updateProfile(updates: { name?: string; email?: string }) {
    if (!this.user) return;
    try {
      await supabaseAuthService.updateProfile(updates);
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

  dispose() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
  }
}

export const authStore = new AuthStore();
export const AuthContext = createContext(authStore);
export const useAuthStore = () => useContext(AuthContext);
