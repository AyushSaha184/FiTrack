import type { DayOfWeek, WorkoutType } from '../models';

export type RootStackParamList = {
  Auth: undefined;
  NameInput: undefined;
  MetricSelection: undefined;
  App: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  WeightTab: undefined;
  HomeTab: undefined;
  StepsTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  WeightTracker: undefined;
  StepsTracker: undefined;
  ExerciseLibrary: undefined;
  History: undefined;
  Settings: undefined;
};

export type WorkoutStackParamList = {
  Workout: undefined;
  ActiveWorkout: { workoutId?: string; type?: WorkoutType };
  WorkoutSummary: { workoutId: string };
  ExerciseDetail: { exerciseId: string };
  WorkoutHistory: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ProfileEdit: undefined;
  UnitsSettings: undefined;
  NotificationsSettings: undefined;
  DataExport: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}