export type Set = {
  id: string;
  order: number;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  restTime?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  exercise?: {
    name: string;
    muscleGroup: string;
    equipment: string;
  };
  order: number;
  sets: Set[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutType =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'fullbody'
  | 'cardio'
  | 'rest'
  | 'custom';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type Workout = {
  id: string;
  userId: string;
  name: string;
  type: WorkoutType;
  dayOfWeek?: DayOfWeek;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  exercises: WorkoutExercise[];
  notes?: string;
  completed: boolean;
  totalVolume: number;
  createdAt: Date;
  updatedAt: Date;
};
