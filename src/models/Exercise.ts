export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'resistance_band'
  | 'other';

export type Exercise = {
  id: string;
  userId: string | null;
  name: string;
  description?: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions?: string[];
  videoUrl?: string;
  isCustom: boolean;
  lastUsedAt?: Date;
  totalTimesPerformed: number;
  createdAt: Date;
  updatedAt: Date;
};
