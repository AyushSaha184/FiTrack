import type { Workout, WorkoutExercise } from '../../models';
import { localStore } from './localStore';

const storageKey = (userId: string) => `local.workouts.${userId}`;

const asDate = (value: unknown, fallback: Date = new Date()): Date => {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? fallback : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? fallback : parsed;
  }
  return fallback;
};

const normalizeExercise = (exercise: any): WorkoutExercise => ({
  ...exercise,
  orderIndex: Number(exercise?.orderIndex ?? 0),
  sets: (exercise?.sets || []).map((set: any, index: number) => ({
    ...set,
    orderIndex: Number(set?.orderIndex ?? index + 1),
    weight: Number(set?.weight) || 0,
    reps: Number(set?.reps) || 0,
    completed: Boolean(set?.completed),
    createdAt: asDate(set?.createdAt),
    updatedAt: asDate(set?.updatedAt),
  })),
  createdAt: asDate(exercise?.createdAt),
  updatedAt: asDate(exercise?.updatedAt),
});

const normalizeWorkout = (data: any, userId: string): Workout => ({
  ...data,
  id: String(data?.id || ''),
  userId: data?.userId || userId,
  name: data?.name || 'Workout',
  type: data?.type || 'custom',
  date: asDate(data?.date),
  startTime: data?.startTime ? asDate(data.startTime) : undefined,
  endTime: data?.endTime ? asDate(data.endTime) : undefined,
  duration: data?.duration,
  totalVolume: Number(data?.totalVolume) || 0,
  completed: Boolean(data?.completed),
  exercises: Array.isArray(data?.exercises)
    ? data.exercises.map(normalizeExercise)
    : [],
  createdAt: asDate(data?.createdAt),
  updatedAt: asDate(data?.updatedAt),
});

const readWorkouts = (userId: string): Workout[] =>
  localStore
    .getList<any>(storageKey(userId))
    .map((item) => normalizeWorkout(item, userId))
    .filter((workout) => Boolean(workout.id))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

const writeWorkouts = (userId: string, workouts: Workout[]): void => {
  localStore.setList(
    storageKey(userId),
    workouts.map((workout) => ({
      ...workout,
      date: workout.date.toISOString(),
      startTime: workout.startTime?.toISOString(),
      endTime: workout.endTime?.toISOString(),
      createdAt: workout.createdAt.toISOString(),
      updatedAt: workout.updatedAt.toISOString(),
    })),
  );
};

const upsert = (userId: string, workoutId: string, patch: Record<string, any>): Workout => {
  const existing = readWorkouts(userId);
  const index = existing.findIndex((workout) => workout.id === workoutId);
  const now = new Date();
  const base: Workout =
    index >= 0
      ? existing[index]
      : normalizeWorkout(
          {
            id: workoutId,
            userId,
            name: 'Workout',
            type: 'custom',
            date: now,
            exercises: [],
            completed: false,
            totalVolume: 0,
            createdAt: now,
            updatedAt: now,
          },
          userId,
        );

  const updated = normalizeWorkout(
    {
      ...base,
      ...patch,
      id: workoutId,
      userId,
      createdAt: base.createdAt,
      updatedAt: now,
    },
    userId,
  );

  if (index >= 0) {
    existing[index] = updated;
  } else {
    existing.push(updated);
  }
  writeWorkouts(userId, existing);
  return updated;
};

export const workoutsService = {
  async getWorkouts(userId: string, startDate?: string, endDate?: string): Promise<Workout[]> {
    let workouts = readWorkouts(userId);

    if (startDate) {
      const start = new Date(startDate).getTime();
      if (!isNaN(start)) {
        workouts = workouts.filter((workout) => workout.date.getTime() >= start);
      }
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      if (!isNaN(end)) {
        workouts = workouts.filter((workout) => workout.date.getTime() <= end);
      }
    }

    return workouts.slice(0, 100);
  },

  subscribeWorkouts(
    userId: string,
    callback: (workouts: Workout[]) => void,
    startDate?: string,
    endDate?: string,
  ): () => void {
    const emit = () => {
      let workouts = readWorkouts(userId);
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (!isNaN(start)) {
          workouts = workouts.filter((workout) => workout.date.getTime() >= start);
        }
      }
      if (endDate) {
        const end = new Date(endDate).getTime();
        if (!isNaN(end)) {
          workouts = workouts.filter((workout) => workout.date.getTime() <= end);
        }
      }
      callback(workouts.slice(0, 100));
    };

    const unsubscribe = localStore.subscribe(storageKey(userId), emit);
    emit();
    return unsubscribe;
  },

  async getWorkout(userId: string, workoutId: string): Promise<Workout | null> {
    return readWorkouts(userId).find((workout) => workout.id === workoutId) ?? null;
  },

  async createWorkout(userId: string, workout: Partial<Workout> & { id: string }) {
    return upsert(userId, workout.id, {
      ...workout,
      startTime: workout.startTime ?? new Date(),
    });
  },

  async updateWorkout(userId: string, workoutId: string, updates: Partial<Workout>) {
    upsert(userId, workoutId, updates);
  },

  async deleteWorkout(userId: string, workoutId: string) {
    const remaining = readWorkouts(userId).filter((workout) => workout.id !== workoutId);
    writeWorkouts(userId, remaining);
  },

  async saveWorkoutExercises(userId: string, workoutId: string, exercises: WorkoutExercise[]) {
    upsert(userId, workoutId, { exercises });
  },

  async completeWorkout(userId: string, workoutId: string, duration: number, totalVolume: number) {
    upsert(userId, workoutId, {
      completed: true,
      endTime: new Date(),
      duration,
      totalVolume,
    });
  },

  async deleteWorkoutsBefore(userId: string, cutoffIso: string) {
    const cutoff = new Date(cutoffIso).getTime();
    if (isNaN(cutoff)) return 0;

    const workouts = readWorkouts(userId);
    const remaining = workouts.filter((workout) => workout.date.getTime() >= cutoff);
    const removed = workouts.length - remaining.length;
    if (removed > 0) {
      writeWorkouts(userId, remaining);
    }
    return removed;
  },
};
