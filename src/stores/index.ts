import { createContext, useContext } from 'react';
import { authStore, AuthStore } from './AuthStore';
import { workoutStore, WorkoutStore } from './WorkoutStore';
import { weightStore, WeightStore } from './WeightStore';
import { stepsStore, StepsStore } from './StepsStore';
import { settingsStore, SettingsStore } from './SettingsStore';

export interface RootStore {
  authStore: AuthStore;
  workoutStore: WorkoutStore;
  weightStore: WeightStore;
  stepsStore: StepsStore;
  settingsStore: SettingsStore;
}

export const rootStore: RootStore = {
  authStore,
  workoutStore,
  weightStore,
  stepsStore,
  settingsStore,
};

export const StoreContext = createContext<RootStore>(rootStore);

export const useStores = () => useContext(StoreContext);
export const useAuthStore = () => useContext(StoreContext).authStore;
export const useWorkoutStore = () => useContext(StoreContext).workoutStore;
export const useWeightStore = () => useContext(StoreContext).weightStore;
export const useStepsStore = () => useContext(StoreContext).stepsStore;
export const useSettingsStore = () => useContext(StoreContext).settingsStore;

export { authStore, workoutStore, weightStore, stepsStore, settingsStore };
export type { AuthStore } from './AuthStore';
export type { WorkoutStore } from './WorkoutStore';
export type { WeightStore } from './WeightStore';
export type { StepsStore } from './StepsStore';
export type { SettingsStore } from './SettingsStore';