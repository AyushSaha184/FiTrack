import { makeAutoObservable, runInAction } from 'mobx';
import type { Units, UserPreferences, NotificationSettings, WorkoutSettings } from '../models';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

export class SettingsStore {
  theme: 'light' | 'dark' | 'auto' = 'dark';
  units: Units = { weight: 'kg', height: 'cm', temperature: 'celsius' };
  notifications: NotificationSettings = {
    workoutReminders: true,
    weightLogReminders: true,
    stepGoalReminders: true,
    streakNotifications: true,
    achievementNotifications: true,
    restTimerSound: true,
    restTimerVibration: true,
  };
  workout: WorkoutSettings = {
    defaultRestTime: 90,
    autoStartRestTimer: false,
    keepScreenAwake: true,
    autoSave: true,
    defaultUnits: { weight: 'kg', height: 'cm', temperature: 'celsius' },
  };
  recordBugReports = true;
  isLoaded = false;

  constructor() {
    makeAutoObservable(this);
    this.load();
  }

  load() {
    const savedTheme = storage.get<'light' | 'dark' | 'auto'>(STORAGE_KEYS.THEME);
    const savedUnits = storage.get<Units>(STORAGE_KEYS.UNITS);
    const savedNotifications = storage.get<NotificationSettings>(STORAGE_KEYS.NOTIFICATIONS);
    const savedWorkout = storage.get<WorkoutSettings>(STORAGE_KEYS.WORKOUT_SETTINGS);
    const savedBugReports = storage.get<boolean>(STORAGE_KEYS.RECORD_BUG_REPORTS);

    runInAction(() => {
      if (savedTheme) this.theme = savedTheme;
      if (savedUnits) this.units = savedUnits;
      if (savedNotifications) this.notifications = savedNotifications;
      if (savedWorkout) this.workout = savedWorkout;
      if (savedBugReports !== undefined && savedBugReports !== null) {
        this.recordBugReports = savedBugReports;
      }
      this.isLoaded = true;
    });
  }

  setTheme(theme: 'light' | 'dark' | 'auto') {
    runInAction(() => {
      this.theme = theme;
      storage.set(STORAGE_KEYS.THEME, theme);
    });
  }

  setUnits(units: Units) {
    runInAction(() => {
      this.units = units;
      this.workout.defaultUnits = units;
      storage.set(STORAGE_KEYS.UNITS, units);
      storage.set(STORAGE_KEYS.WORKOUT_SETTINGS, this.workout);
    });
  }

  setWeightUnit(unit: 'kg' | 'lbs') {
    this.setUnits({ ...this.units, weight: unit });
  }

  setHeightUnit(unit: 'cm' | 'ft') {
    this.setUnits({ ...this.units, height: unit });
  }

  setNotifications(notifications: NotificationSettings) {
    runInAction(() => {
      this.notifications = notifications;
      storage.set(STORAGE_KEYS.NOTIFICATIONS, notifications);
    });
  }

  setWorkoutSettings(workout: WorkoutSettings) {
    runInAction(() => {
      this.workout = workout;
      storage.set(STORAGE_KEYS.WORKOUT_SETTINGS, workout);
    });
  }

  setDefaultRestTime(seconds: number) {
    runInAction(() => {
      this.workout.defaultRestTime = seconds;
      storage.set(STORAGE_KEYS.WORKOUT_SETTINGS, this.workout);
    });
  }

  setAutoStartRestTimer(enabled: boolean) {
    runInAction(() => {
      this.workout.autoStartRestTimer = enabled;
      storage.set(STORAGE_KEYS.WORKOUT_SETTINGS, this.workout);
    });
  }

  setKeepScreenAwake(enabled: boolean) {
    runInAction(() => {
      this.workout.keepScreenAwake = enabled;
      storage.set(STORAGE_KEYS.WORKOUT_SETTINGS, this.workout);
    });
  }

  setRecordBugReports(enabled: boolean) {
    runInAction(() => {
      this.recordBugReports = enabled;
      storage.set(STORAGE_KEYS.RECORD_BUG_REPORTS, enabled);
    });
  }

  getWeightUnit() {
    return this.units.weight;
  }

  getHeightUnit() {
    return this.units.height;
  }

  resetToDefaults() {
    runInAction(() => {
      this.theme = 'dark';
      this.units = { weight: 'kg', height: 'cm', temperature: 'celsius' };
      this.notifications = {
        workoutReminders: true,
        weightLogReminders: true,
        stepGoalReminders: true,
        streakNotifications: true,
        achievementNotifications: true,
        restTimerSound: true,
        restTimerVibration: true,
      };
      this.workout = {
        defaultRestTime: 90,
        autoStartRestTimer: false,
        keepScreenAwake: true,
        autoSave: true,
        defaultUnits: { weight: 'kg', height: 'cm', temperature: 'celsius' },
      };
      storage.set(STORAGE_KEYS.THEME, this.theme);
      storage.set(STORAGE_KEYS.UNITS, this.units);
      storage.set(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
      storage.set(STORAGE_KEYS.WORKOUT_SETTINGS, this.workout);
    });
  }
}

export const settingsStore = new SettingsStore();