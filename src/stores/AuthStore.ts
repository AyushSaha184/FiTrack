import { makeAutoObservable, runInAction } from 'mobx';
import { createContext, useContext } from 'react';
import { firebaseAuthService } from '../services/firebase/auth';
import type { User, UserPreferences, Units } from '../models';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import type { LoginInput, SignupInput } from '../utils/validators';
import firestore from '@react-native-firebase/firestore';

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
  // New: Track if user needs to set their name (for Google sign-in)
  isNameRequired = false;

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
      const { user } = await firebaseAuthService.getUser();
      if (user) {
        await this.fetchUser(user);
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

  async fetchUser(firebaseUser: any, isGoogleSignIn = false) {
    console.log('[AuthStore] fetchUser starting...');
    try {
      const user = firebaseUser !== undefined ? firebaseUser : (await firebaseAuthService.getUser()).user;
      console.log('[AuthStore] fetchUser got user:', user?.email);
      
      if (user) {
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          console.log('[AuthStore] User document not found in Firestore, creating...');
          await firestore().collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            createdAt: firestore.FieldValue.serverTimestamp(),
            onboardingCompleted: false,
          });
        }

        const userData = userDoc.data() || {};
        const displayName = userData.displayName || user.displayName;
        const onboardingCompleted = userData.onboardingCompleted ?? false;

        // For Google sign-in: if no name is set, require name input
        const needsName = isGoogleSignIn && !displayName;

        runInAction(() => {
          this.user = {
            id: user.uid,
            email: user.email || '',
            name: displayName || 'Athlete',
            avatarUrl: userData.photoURL || user.photoURL,
            createdAt: new Date(user.metadata.creationTime),
            updatedAt: new Date(user.metadata.lastSignInTime),
            preferences: defaultPreferences,
            profile: { fitnessLevel: 'beginner' },
            onboardingCompleted: onboardingCompleted,
          };
          this.isAuthenticated = true;
          this.isNameRequired = needsName;
        });
        console.log('[AuthStore] fetchUser completed, isAuthenticated =', this.isAuthenticated, 'isNameRequired =', needsName);
      } else {
        console.log('[AuthStore] fetchUser: no user');
      }
    } catch (error) {
      console.error('[AuthStore] fetchUser error:', error);
    }
  }

  // New: Set user's name after Google sign-in
  async setUserName(name: string) {
    if (!this.user) return;
    try {
      this.isLoading = true;
      await firestore().collection('users').doc(this.user.id).update({
        displayName: name,
      });
      runInAction(() => {
        this.user!.name = name;
        this.isNameRequired = false;
      });
    } catch (error: any) {
      console.error('[AuthStore] setUserName error:', error);
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
      console.log('[AuthStore] firebaseAuthService.login succeeded, response:', response);
      console.log('[AuthStore] calling fetchUser...');
      await this.fetchUser(response.user, false);
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
      console.log('[AuthStore] calling firebaseAuthService.signup...');
      const response = await firebaseAuthService.signup(input);
      console.log('[AuthStore] firebaseAuthService.signup succeeded, response:', response);
      if (response.user) {
        console.log('[AuthStore] signup receivedesticular user, fetching user data...');
        await this.fetchUser(response.user, false);
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
        const response = await firebaseAuthService.signInWithGoogle();
        console.log('[AuthStore] socialLogin signInWithGoogle succeeded, fetching user...');
        await this.fetchUser(response.user, true);
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
      await firebaseAuthService.signOut();
    } catch (error) {
      console.error('[AuthStore] logout error:', error);
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
}

export const authStore = new AuthStore();
export const AuthContext = createContext(authStore);
export const useAuthStore = () => useContext(AuthContext);
