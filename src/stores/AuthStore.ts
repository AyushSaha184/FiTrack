import { makeAutoObservable, runInAction } from 'mobx';
import { workoutStore } from './WorkoutStore';
import { weightStore } from './WeightStore';
import { stepsStore } from './StepsStore';
import { settingsStore } from './SettingsStore';
import type { User, UserPreferences, Units, UserProfile } from '../models';
import { storage } from '../utils/storage';
import { generateUUID } from '../utils/helpers';
import { logger } from '../utils/logger';
import { avatarService } from '../services/profile/avatarService';

const PROFILE_KEY = 'user_cached_profile';
const USER_ID_KEY = 'local_user_id';
const APP_STARTED_KEY = 'app_started';

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

/**
 * Local, single-device profile. There is no sign-in anymore: the app creates
 * one profile the first time it runs and all data is scoped to its id.
 */
export class AuthStore {
  user: User | null = null;
  isLoading = false;
  isInitialized = false;
  hasStarted = false;
  error: string | null = null;

  private loadedForUserId: string | null = null;

  constructor() {
    makeAutoObservable(this);
    this.restoreLocalProfile();
  }

  private createDefaultUser(id: string): User {
    const now = new Date();
    return {
      id,
      email: '',
      name: 'Athlete',
      createdAt: now,
      updatedAt: now,
      preferences: defaultPreferences,
      profile: { fitnessLevel: 'beginner' },
      onboardingCompleted: true,
    };
  }

  private restoreLocalProfile() {
    try {
      const cached = storage.get<any>(PROFILE_KEY);
      const storedId = storage.getString(USER_ID_KEY);
      const id = cached?.id || storedId || generateUUID();

      const createdAt = cached?.createdAt ? new Date(cached.createdAt) : new Date();
      const updatedAt = cached?.updatedAt ? new Date(cached.updatedAt) : new Date();
      const user: User = {
        ...this.createDefaultUser(id),
        ...(cached || {}),
        id,
        name: cached?.name || 'Athlete',
        email: cached?.email || '',
        preferences: cached?.preferences || defaultPreferences,
        profile: cached?.profile || { fitnessLevel: 'beginner' },
        onboardingCompleted: true,
        createdAt: isNaN(createdAt.getTime()) ? new Date() : createdAt,
        updatedAt: isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
      };

      this.user = user;
      storage.set(USER_ID_KEY, id);

      const started = storage.get<boolean>(APP_STARTED_KEY);
      // Existing installs already have a saved profile, so they skip the
      // welcome screen. Fresh installs see it once.
      this.hasStarted = started === true || Boolean(cached);
      if (this.hasStarted) {
        storage.set(APP_STARTED_KEY, true);
      }
      this.isInitialized = true;
      this.isLoading = false;
    } catch (error) {
      logger.error('[AuthStore] restoreLocalProfile error:', error);
      this.isInitialized = true;
      this.isLoading = false;
    }
  }

  get preferences(): UserPreferences {
    return this.user?.preferences ?? defaultPreferences;
  }

  get units(): Units {
    return this.preferences.units;
  }

  async initialize() {
    if (!this.isInitialized) {
      this.restoreLocalProfile();
    }
    const userId = this.user?.id;
    if (!userId || this.loadedForUserId === userId) {
      runInAction(() => {
        this.isLoading = false;
        this.isInitialized = true;
      });
      return;
    }

    this.loadedForUserId = userId;
    try {
      this.isLoading = true;
      await Promise.allSettled([
        workoutStore.loadWorkouts(userId),
        weightStore.loadEntries(userId),
        stepsStore.loadTodaySteps(userId),
        stepsStore.loadWeeklySteps(userId),
      ]);
    } catch (error) {
      logger.error('[AuthStore] initialize error:', error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isInitialized = true;
      });
    }
  }

  async startApp() {
    storage.set(APP_STARTED_KEY, true);
    if (this.user) {
      storage.set(PROFILE_KEY, this.user);
    }
    runInAction(() => {
      this.hasStarted = true;
    });
    this.loadedForUserId = null;
    await this.initialize();
  }

  async updateProfile(updates: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    profile?: Partial<UserProfile>;
  }) {
    if (!this.user) return;

    runInAction(() => {
      const next: User = {
        ...this.user!,
        updatedAt: new Date(),
      };
      if (updates.name) next.name = updates.name;
      if (updates.email !== undefined) next.email = updates.email;
      if (updates.avatarUrl !== undefined) {
        next.avatarUrl = updates.avatarUrl || undefined;
      }
      if (updates.profile) {
        next.profile = {
          ...next.profile,
          ...updates.profile,
        };
      }
      this.user = next;
    });

    storage.set(PROFILE_KEY, this.user);
  }

  clearError() {
    this.error = null;
  }

  /**
   * Wipes every local key and returns the app to its first-run state. This is
   * the offline equivalent of the old "delete account" action.
   */
  async resetApp() {
    try {
      if (workoutStore.resetLocalState) workoutStore.resetLocalState();
      if (weightStore.resetLocalState) weightStore.resetLocalState();
      if (stepsStore.resetLocalState) stepsStore.resetLocalState();
      await avatarService.clearAll().catch(() => {});

      storage.clearAll();

      // Re-apply baseline settings after the wipe so the app starts clean.
      settingsStore.resetToDefaults();

      const user = this.createDefaultUser(generateUUID());
      storage.set(USER_ID_KEY, user.id);
      storage.delete(PROFILE_KEY);

      runInAction(() => {
        this.user = user;
        this.hasStarted = false;
        this.error = null;
        this.isInitialized = true;
        this.isLoading = false;
      });
      this.loadedForUserId = null;
    } catch (error: any) {
      logger.error('[AuthStore] resetApp error:', error);
      runInAction(() => {
        this.error = error?.message || 'Failed to reset app data';
      });
      throw error;
    }
  }
}

export const authStore = new AuthStore();
