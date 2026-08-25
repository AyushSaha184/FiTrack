import { makeAutoObservable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { firebaseAuthService } from '../services/firebase/auth';
import { collections } from '../services/firebase/firestore';
import { workoutStore } from './WorkoutStore';
import { weightStore } from './WeightStore';
import { stepsStore } from './StepsStore';
import auth from '@react-native-firebase/auth';
import type { User, UserPreferences, Units, UserProfile } from '../models';
import { storage } from '../utils/storage';
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
  isNameRequired = false;

  private authUnsubscribe: (() => void) | null = null;
  private activeFetches = new Map<string, Promise<void>>();

  constructor() {
    makeAutoObservable(this);
    this.restoreCachedUser();
  }

  private restoreCachedUser() {
    try {
      const cached = storage.get<User>('user_cached_profile');
      if (cached && cached.id) {
        const createdAt = cached.createdAt ? new Date(cached.createdAt) : new Date();
        const updatedAt = cached.updatedAt ? new Date(cached.updatedAt) : new Date();
        this.user = {
          ...cached,
          createdAt: isNaN(createdAt.getTime()) ? new Date() : createdAt,
          updatedAt: isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
        };
        this.isAuthenticated = true;
      }
    } catch (e) {
      logger.error('[AuthStore] restoreCachedUser error:', e);
    }
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
    if (this.authUnsubscribe) return;
    try {
      if (!this.user) {
        this.isLoading = true;
      }

      const { session } = await firebaseAuthService.getSession();
      if (session?.user) {
        await this.fetchUser(session.user);
      }

      this.authUnsubscribe = firebaseAuthService.onAuthStateChange(
        (event, newSession) => {
          if (__DEV__) logger.debug('[AuthStore] onAuthStateChange event:', event);
          if (event === 'SIGNED_OUT') {
            if (!auth().currentUser) {
              runInAction(() => {
                this.user = null;
                this.isAuthenticated = false;
                this.isNameRequired = false;
                storage.delete('user_cached_profile');
              });
            }
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

  async fetchUser(fbUser: any, isGoogleSignIn = false) {
    if (!fbUser) return;

    const userId = fbUser.id;
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
        const userDocRef = collections.userDoc(userId);
        const doc = await userDocRef.get();
        let profileData = doc.exists() ? doc.data() : null;

        const metadata = fbUser.user_metadata || {};
        const displayName = profileData?.name || profileData?.displayName || metadata.name || metadata.full_name || 'Athlete';
        const avatarUrl = profileData?.avatarUrl || profileData?.photoURL || metadata.avatar_url || metadata.picture || null;
        const localOnboarded = storage.get<boolean>(`onboarding_completed_${userId}`);
        const onboardingCompleted = (profileData?.onboardingCompleted ?? false) || localOnboarded === true;

        if (!profileData) {
          profileData = {
            id: userId,
            email: fbUser.email || '',
            name: displayName,
            avatarUrl,
            onboardingCompleted,
          };
          await userDocRef.set(profileData, { merge: true });
        }

        const needsName = isGoogleSignIn && (!displayName || displayName === 'Athlete');

        runInAction(() => {
          this.user = {
            id: userId,
            email: fbUser.email || '',
            name: displayName,
            avatarUrl,
            createdAt: fbUser.created_at ? new Date(fbUser.created_at) : new Date(),
            updatedAt: new Date(),
            preferences: defaultPreferences,
            profile: {
              fitnessLevel: profileData?.profile?.fitnessLevel || profileData?.fitnessLevel || 'beginner',
              age: profileData?.profile?.age || profileData?.age,
              gender: profileData?.profile?.gender || profileData?.gender,
              height: (profileData?.profile?.height ?? profileData?.height) ? Number(profileData?.profile?.height ?? profileData?.height) : undefined,
              goalWeight: (profileData?.profile?.goalWeight ?? profileData?.goalWeight) ? Number(profileData?.profile?.goalWeight ?? profileData?.goalWeight) : undefined,
              weeklyGoal: profileData?.profile?.weeklyGoal || profileData?.weeklyGoal,
            },
            onboardingCompleted,
          };
          this.isAuthenticated = true;
          this.isNameRequired = needsName;
          storage.set('user_cached_profile', this.user);
          workoutStore.loadWorkouts(userId).catch(() => {});
          weightStore.loadEntries(userId).catch(() => {});
          stepsStore.loadTodaySteps(userId).catch(() => {});
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

  async setUserName(name: string) {
    if (!this.user) return;
    try {
      this.isLoading = true;
      await collections.userDoc(this.user.id).set({ name }, { merge: true });
      await firebaseAuthService.updateProfile({ name });

      runInAction(() => {
        if (this.user) {
          this.user.name = name;
          this.isNameRequired = false;
        }
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
    try {
      this.error = null;
      this.isLoading = true;
      const response = await firebaseAuthService.login(input);
      await this.fetchUser(response.user, false);
      if (!this.isAuthenticated) {
        throw new Error('Failed to load user profile. Please try logging in again.');
      }
    } catch (error: any) {
      logger.error('[AuthStore] login error:', error);
      runInAction(() => {
        this.error = error.message || 'Login failed';
      });
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async signup(input: SignupInput) {
    try {
      this.error = null;
      this.isLoading = true;
      const response = await firebaseAuthService.signup(input);
      if (response.session && response.user) {
        await this.fetchUser(response.user, false);
      }
    } catch (error: any) {
      logger.error('[AuthStore] signup error:', error);
      runInAction(() => {
        this.error = error.message || 'Signup failed';
      });
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async socialLogin(provider: 'google') {
    try {
      this.error = null;
      this.isLoading = true;
      if (provider === 'google') {
        const response = await firebaseAuthService.signInWithGoogle();
        await this.fetchUser(response.user, true);
        if (!this.isAuthenticated) {
          throw new Error('Failed to load user profile. Please try signing in again.');
        }
      }
    } catch (error: any) {
      logger.error('[AuthStore] socialLogin error:', error);
      runInAction(() => {
        this.error = error.message || 'Social login failed';
      });
      throw error;
    } finally {
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
        storage.delete('user_cached_profile');
      });
    }
  }

  async deleteAccount() {
    try {
      this.isLoading = true;
      this.error = null;
      await firebaseAuthService.deleteAccount();
      runInAction(() => {
        this.user = null;
        this.isAuthenticated = false;
        this.isNameRequired = false;
        storage.clearAll();
      });
    } catch (error: any) {
      logger.error('[AuthStore] deleteAccount error:', error);
      runInAction(() => {
        this.error = error.message || 'Failed to delete account';
      });
      throw error;
    } finally {
      runInAction(() => {
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
    storage.set(`onboarding_completed_${userId}`, true);
    runInAction(() => {
      this.user = { ...this.user!, onboardingCompleted: true };
    });

    await collections.userDoc(userId).set({ onboardingCompleted: true }, { merge: true });
    await firebaseAuthService.updateProfile({
      name: this.user.name,
      onboardingCompleted: true,
    });
  }

  async updateProfile(updates: { name?: string; email?: string; profile?: Partial<UserProfile> }) {
    if (!this.user) return;
    try {
      const authUpdates = { name: updates.name, email: updates.email };
      if (authUpdates.name || authUpdates.email) {
        await firebaseAuthService.updateProfile(authUpdates);
      }
      
      const firestorePayload: any = {};
      if (updates.name) firestorePayload.name = updates.name;
      if (updates.email) firestorePayload.email = updates.email;
      if (updates.profile) {
        firestorePayload.profile = {
          ...this.user.profile,
          ...updates.profile,
        };
      }
      
      if (Object.keys(firestorePayload).length > 0) {
        const cleanPayload = JSON.parse(JSON.stringify(firestorePayload));
        await collections.userDoc(this.user.id).set(cleanPayload, { merge: true });
      }
      
      runInAction(() => {
        if (updates.name && this.user) this.user.name = updates.name;
        if (updates.profile && this.user) {
          this.user.profile = {
            ...this.user.profile,
            ...updates.profile,
          };
          storage.set('user_cached_profile', this.user);
        }
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
