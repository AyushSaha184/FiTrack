export type Units = {
  weight: 'kg' | 'lbs';
  height: 'cm' | 'ft';
  temperature: 'celsius' | 'fahrenheit';
};

export type NotificationSettings = {
  workoutReminders: boolean;
  weightLogReminders: boolean;
  stepGoalReminders: boolean;
  streakNotifications: boolean;
  achievementNotifications: boolean;
  restTimerSound: boolean;
  restTimerVibration: boolean;
};

export type WorkoutSettings = {
  defaultRestTime: number;
  autoStartRestTimer: boolean;
  keepScreenAwake: boolean;
  autoSave: boolean;
  defaultUnits: Units;
};

export type UserPreferences = {
  units: Units;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  workout: WorkoutSettings;
};

export type UserProfile = {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goalWeight?: number;
  weeklyGoal?: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  profile: UserProfile;
  onboardingCompleted: boolean;
};
