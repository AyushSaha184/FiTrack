import { makeAutoObservable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { firebaseAuthService } from '../services/firebase/auth';
import { supabase, ensureProfileExists } from '../services/supabase/client';
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
  private activeFetches = new Map<string, Promise<void>>();

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
      const { session } = await firebaseAuthService.getSession();
      if (session?.user) {
        await this.fetchUser(session.user);
      }

      // Listen for auth state changes (token refresh, sign-out from another tab, etc.)
      this.authUnsubscribe = firebaseAuthService.onAuthStateChange(
        (event, newSession) => {
          if (__DEV__) logger.debug('[AuthStore] onAuthStateChange event:', event);
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
    if (!supabaseUser) {
      return;
    }

    const userId = supabaseUser.id;
    let fetchPromise = this.activeFetches.get(userId);
    if (fetchPromise) {
      await fetchPromise;
      if (isGoogleSignIn) {
        runInAction(() => {
          const displayName = this.user?.name;
          const needsName = !displayName || displayName === 'Athlete';
          this.isNameRequired = needsName;
        });
      }
      return;
    }

    fetchPromise = (async () => {
      try {
        const user = supabaseUser;

        // Read profile from profiles table (handle_new_user trigger auto-creates it for Supabase auth, or manual insert for Firebase auth)
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          logger.error('[AuthStore] Error reading profile by id:', profileError);
        }

        // If profile not found by id, check if a profile already exists for this email
        if (!profile && user.email) {
          const { data: emailProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();

          if (emailProfile) {
            const { data: updatedProfile } = await supabase
              .from('profiles')
              .update({ id: user.id })
              .eq('email', user.email)
              .select()
              .maybeSingle();

            profile = updatedProfile || emailProfile;
          }
        }

        // If profile still doesn't exist, create/upsert it guaranteed
        if (!profile) {
          const metadata = user.user_metadata || {};
          const nameToSet = metadata.name || metadata.full_name || 'Athlete';
          const avatarToSet = metadata.avatar_url || metadata.picture || null;
          await ensureProfileExists(user.id, user.email, nameToSet, avatarToSet);

          const { data: createdProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          profile = createdProfile;
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
      } catch (error) {
        logger.error('[AuthStore] fetchUser error:', error);
      }
    })();

    this.activeFetches.set(userId, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      this.activeFetches.delete(userId);
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
      console.log('[AuthStore] calling firebaseAuthService.login...');
      const response = await firebaseAuthService.login(input);
      console.log('[AuthStore] firebaseAuthService.login succeeded');
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
      console.log('[AuthStore] calling firebaseAuthService.signup...');
      const response = await firebaseAuthService.signup(input);
      console.log('[AuthStore] firebaseAuthService.signup succeeded');
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
        const response = await firebaseAuthService.signInWithGoogle();
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
      await firebaseAuthService.signOut();
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
      await firebaseAuthService.resetPassword(email);
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
    await firebaseAuthService.updateProfile({
      name: this.user!.name,
      onboardingCompleted: true,
    });
  }

  async updateProfile(updates: { name?: string; email?: string }) {
    if (!this.user) return;
    try {
      await firebaseAuthService.updateProfile(updates);
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
