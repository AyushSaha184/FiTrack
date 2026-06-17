export type StepSource = 'manual' | 'apple_health' | 'google_fit';

export type StepEntry = {
  id: string;
  userId: string;
  steps: number;
  date: Date;
  caloriesBurned?: number;
  distance?: number;
  source: StepSource;
  createdAt: Date;
  updatedAt: Date;
};
