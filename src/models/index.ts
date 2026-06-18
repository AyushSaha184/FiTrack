export type AchievementType =
  | 'first_workout'
  | 'streak_7'
  | 'streak_30'
  | 'workouts_100'
  | 'volume_milestone'
  | 'pr_achieved'
  | 'step_goal_30'
  | 'weight_goal_reached';

export type Achievement = {
  id: string;
  userId: string;
  type: AchievementType;
  unlockedAt: Date;
  progress: number;
  target: number;
};

export * from './User';
export * from './Workout';
export * from './Exercise';
export * from './WeightEntry';
export * from './StepEntry';
