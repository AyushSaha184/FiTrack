import { makeAutoObservable, runInAction } from 'mobx';
import type { Workout, WorkoutExercise, Set, WorkoutType, DayOfWeek } from '../models';
import { workoutsService } from '../services/firebase/workoutsService';
import { collections } from '../services/firebase/firestore';
import firestore from '@react-native-firebase/firestore';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, getDayOfWeekKey } from '../utils/constants';
import { generateUUID, dateKey } from '../utils/helpers';
import { logger } from '../utils/logger';
import { authStore } from './AuthStore';

export class WorkoutStore {
  workouts: Map<string, Workout> = new Map();
  activeWorkout: Workout | null = null;
  selectedDay: DayOfWeek = getDayOfWeekKey(new Date());
  selectedDate: Date = new Date();
  isLoading = false;
  isSyncing = false;
  error: string | null = null;
  weeklyWorkouts: Map<string, Workout> = new Map();

  private saveDraftTimer: ReturnType<typeof setTimeout> | null = null;
  private syncFirestoreTimer: ReturnType<typeof setTimeout> | null = null;
  private workoutsUnsubscribe: (() => void) | null = null;
  private activeFetches = new Map<string, Promise<void>>();

  constructor() {
    makeAutoObservable(this);
    this.selectedDay = getDayOfWeekKey(new Date());
    this.selectedDate = new Date();
    this.restoreActiveWorkout();
  }

  get userId() {
    return authStore.user?.id;
  }

  get activeWorkoutExercises() {
    return this.activeWorkout?.exercises ?? [];
  }

  get totalVolume(): number {
    if (!this.activeWorkout) return 0;
    return this.activeWorkout.exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((t, s) => t + (s.completed ? s.weight * s.reps : 0), 0);
    }, 0);
  }

  get completedSetsCount(): number {
    if (!this.activeWorkout) return 0;
    return this.activeWorkout.exercises.reduce((total, ex) => {
      return total + ex.sets.filter((s) => s.completed).length;
    }, 0);
  }

  get totalSetsCount(): number {
    if (!this.activeWorkout) return 0;
    return this.activeWorkout.exercises.reduce((total, ex) => total + ex.sets.length, 0);
  }

  async pruneOldWorkouts() {
    if (!this.userId) return;
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoIso = ninetyDaysAgo.toISOString();

      // 1. Delete Firestore workouts older than 90 days
      const snapshot = await collections.workouts(this.userId)
        .where('date', '<', ninetyDaysAgoIso)
        .get();

      if (!snapshot.empty) {
        const batch = firestore().batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        logger.info(`[WorkoutStore] Pruned ${snapshot.size} workouts older than 90 days from Firestore.`);
      }

      // 2. Prune local MMKV storage for files older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allKeys = storage.getAllKeys();
      allKeys.forEach((key: string) => {
        if (key.startsWith('workout.archive.')) {
          const dateStr = key.replace('workout.archive.', '');
          const keyDate = new Date(dateStr);
          if (!isNaN(keyDate.getTime()) && keyDate < thirtyDaysAgo) {
            storage.delete(key);
            logger.info(`[WorkoutStore] Pruned local archive: ${key}`);
          }
        }
        if (key.startsWith('workout.draft.')) {
          const draft = storage.get<any>(key);
          if (draft && draft.date) {
            const draftDate = new Date(draft.date);
            if (!isNaN(draftDate.getTime()) && draftDate < thirtyDaysAgo) {
              storage.delete(key);
              logger.info(`[WorkoutStore] Pruned local draft: ${key}`);
            }
          }
        }
      });
    } catch (err) {
      logger.error('[WorkoutStore] pruneOldWorkouts error:', err);
    }
  }

  async loadWorkouts(userId: string, startDate?: string, endDate?: string) {
    if (!userId) {
      if (__DEV__) logger.warn('[WorkoutStore] Skipping loadWorkouts: missing userId');
      return;
    }
    // Dedupe concurrent calls for the same user/range.
    const fetchKey = `${userId}::${startDate || ''}::${endDate || ''}`;
    const existing = this.activeFetches.get(fetchKey);
    if (existing) {
      return existing;
    }

    // Run pruning in the background
    this.pruneOldWorkouts().catch((e) => logger.error('[WorkoutStore] Pruning error:', e));

    const promise = (async () => {
      try {
        this.isLoading = true;
        const data = await workoutsService.getWorkouts(userId, startDate, endDate);
        runInAction(() => {
          this.workouts.clear();
          data.forEach((w: Workout) => {
            this.workouts.set(w.id, this.normalizeWorkout(w));
          });
        });
      } catch (error: any) {
        runInAction(() => {
          this.error = error.message;
        });
      } finally {
        runInAction(() => {
          this.isLoading = false;
        });
      }
    })();

    this.activeFetches.set(fetchKey, promise);
    try {
      await promise;
    } finally {
      this.activeFetches.delete(fetchKey);
    }
  }

  /**
   * Subscribe to live workout updates. Replaces the one-shot loadWorkouts
   * call when callers want a long-lived subscription (e.g. WorkoutScreen on
   * mount). The returned function unsubscribes.
   */
  subscribeWorkouts(userId: string, startDate?: string, endDate?: string): () => void {
    if (!userId) return () => {};
    // Tear down any existing listener first so we don't double-subscribe.
    if (this.workoutsUnsubscribe) {
      this.workoutsUnsubscribe();
      this.workoutsUnsubscribe = null;
    }
    this.workoutsUnsubscribe = workoutsService.subscribeWorkouts(
      userId,
      (data) => {
        runInAction(() => {
          this.workouts.clear();
          data.forEach((w: Workout) => {
            this.workouts.set(w.id, this.normalizeWorkout(w));
          });
        });
      },
      startDate,
      endDate,
    );
    return this.workoutsUnsubscribe;
  }

  unsubscribeWorkouts() {
    if (this.workoutsUnsubscribe) {
      this.workoutsUnsubscribe();
      this.workoutsUnsubscribe = null;
    }
  }

  async startWorkout(userId: string, type: WorkoutType = 'custom', name?: string) {
    const workoutId = generateUUID();
    const savedTemplate = storage.get<any[]>(`workout.routine.${this.selectedDay}`);
    const resolvedExercises: WorkoutExercise[] = [];

    if (savedTemplate && Array.isArray(savedTemplate)) {
      for (const te of savedTemplate) {
        const exerciseExerciseId = generateUUID();
        resolvedExercises.push({
          id: exerciseExerciseId,
          exerciseId: te.exerciseId || te.id || generateUUID(),
          exercise: te.exercise,
          orderIndex: te.orderIndex ?? resolvedExercises.length,
          sets: (te.sets || []).map((ts: any, setIdx: number) => ({
            id: generateUUID(),
            orderIndex: ts.orderIndex ?? setIdx + 1,
            weight: ts.weight || 0,
            reps: ts.reps || 0,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      resolvedExercises.forEach((ex, idx) => { ex.orderIndex = idx; });
    }

    const workout: Workout = {
      id: workoutId,
      userId,
      name: name || this.getWorkoutName(type),
      type,
      date: this.selectedDate,
      exercises: resolvedExercises,
      completed: false,
      totalVolume: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      startTime: new Date(),
    };

    runInAction(() => {
      this.isSyncing = true;
      this.activeWorkout = workout;
      this.saveDraft(true);
    });

    try {
      await workoutsService.createWorkout(userId, {
        id: workout.id,
        name: workout.name,
        type: workout.type,
        date: workout.date,
        startTime: workout.startTime,
        completed: false,
        exercises: resolvedExercises,
      });
    } catch (e) {
      logger.error('[WorkoutStore] startWorkout error:', e);
    } finally {
      runInAction(() => {
        this.isSyncing = false;
      });
    }
    return workout;
  }

  async restoreActiveWorkout() {
    const dayDraft = storage.get<Workout>(this.getDayDraftKey(this.selectedDay));
    if (dayDraft) {
      runInAction(() => {
        this.activeWorkout = this.normalizeWorkout(dayDraft);
      });
      return this.activeWorkout;
    }

    const draft = storage.get<Workout>(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
    if (draft) {
      runInAction(() => {
        this.activeWorkout = this.normalizeWorkout(draft);
      });
      storage.set(this.getDayDraftKey(this.selectedDay), this.activeWorkout);
      storage.delete(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
    }
    return this.activeWorkout;
  }

  async addExercise(exerciseId: string, exerciseName: string, muscleGroup: string, equipment: string = 'barbell') {
    if (!this.activeWorkout) {
      if (!this.userId) {
        logger.error('[WorkoutStore] Cannot add exercise: no authenticated user');
        return;
      }
      const workoutId = generateUUID();
      const userId = this.userId;
      const workout: Workout = {
        id: workoutId,
        userId,
        name: 'Custom Workout',
        type: 'custom',
        date: this.selectedDate,
        exercises: [],
        completed: false,
        totalVolume: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date(),
      };

      runInAction(() => {
        this.activeWorkout = workout;
        this.saveDraft(true);
      });

      try {
        await workoutsService.createWorkout(userId, {
          id: workout.id,
          name: workout.name,
          type: workout.type,
          date: workout.date,
          startTime: workout.startTime,
          completed: false,
        });
      } catch (err) {
        logger.error('[WorkoutStore] Failed to auto-create workout in DB:', err);
      }
    }

    if (!this.activeWorkout) return;
    const newExercise: WorkoutExercise = {
      id: generateUUID(),
      exerciseId,
      exercise: { name: exerciseName, muscleGroup: muscleGroup as any, equipment: equipment as any },
      orderIndex: this.activeWorkout.exercises.length,
      sets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    runInAction(() => {
      if (!this.activeWorkout) return;
      this.activeWorkout = {
        ...this.activeWorkout,
        exercises: [...this.activeWorkout.exercises, newExercise],
      };
      this.saveDraft();
    });

    this.debouncedSyncToFirestore(this.activeWorkout.exercises);
  }

  async removeExercise(workoutExerciseId: string) {
    if (!this.activeWorkout) return;
    const updatedExercises = this.activeWorkout.exercises
      .filter((e) => e.id !== workoutExerciseId)
      .map((ex, idx) => ({ ...ex, orderIndex: idx }));

    runInAction(() => {
      if (this.activeWorkout) {
        this.activeWorkout = {
          ...this.activeWorkout,
          exercises: updatedExercises,
        };
        this.saveDraft();
      }
    });

    this.debouncedSyncToFirestore(updatedExercises);
  }

  reorderExercises(fromIndex: number, toIndex: number) {
    if (!this.activeWorkout) return;
    if (
      fromIndex < 0 ||
      fromIndex >= this.activeWorkout.exercises.length ||
      toIndex < 0 ||
      toIndex >= this.activeWorkout.exercises.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    // Build a brand-new array of brand-new exercise objects so that every
    // observer along the chain (and React.memo on ExerciseCard) sees new
    // identities and re-renders. Mutating `ex.orderIndex` in place would
    // also work for MobX, but the memoized components downstream would
    // bail out and the user would not see the new ordering instantly.
    const reordered = this.activeWorkout.exercises.map((ex, idx) => {
      if (idx === fromIndex) return this.activeWorkout!.exercises[toIndex];
      if (idx === toIndex) return this.activeWorkout!.exercises[fromIndex];
      return ex;
    }).map((ex, idx) => ({ ...ex, orderIndex: idx }));

    runInAction(() => {
      if (this.activeWorkout) {
        this.activeWorkout = {
          ...this.activeWorkout,
          exercises: reordered,
        };
      }
    });

    this.saveDraft();
    this.saveRoutineTemplate();
    this.debouncedSyncToFirestore(reordered);
  }

  async addSet(workoutExerciseId: string, weight = 0, reps = 0) {
    if (!this.activeWorkout) return;
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) return;

    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const newSet: Set = {
      id: generateUUID(),
      orderIndex: exercise.sets.length + 1,
      weight,
      reps,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // All mutations inside runInAction, and we build a brand-new exercise
    // object so memoized children (ExerciseCard / SetRow) re-render.
    runInAction(() => {
      if (!this.activeWorkout) return;
      const updatedExercise: WorkoutExercise = {
        ...exercise,
        sets: [...exercise.sets, newSet],
      };
      const updatedExercises = [...this.activeWorkout.exercises];
      updatedExercises[exerciseIndex] = updatedExercise;
      this.activeWorkout = {
        ...this.activeWorkout,
        exercises: updatedExercises,
      };
      this.saveDraft();
    });

    this.debouncedSyncToFirestore(
      this.activeWorkout
        ? this.activeWorkout.exercises
        : [],
    );
  }

  async updateSet(workoutExerciseId: string, setId: string, updates: Partial<Set>) {
    if (!this.activeWorkout) return;
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) return;

    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex === -1) return;

    const existing = exercise.sets[setIndex];
    const updatedSet: Set = { ...existing, ...updates, updatedAt: new Date() };

    runInAction(() => {
      if (!this.activeWorkout) return;
      const newSets = [
        ...exercise.sets.slice(0, setIndex),
        updatedSet,
        ...exercise.sets.slice(setIndex + 1),
      ];
      const updatedExercise: WorkoutExercise = { ...exercise, sets: newSets };
      const updatedExercises = [...this.activeWorkout.exercises];
      updatedExercises[exerciseIndex] = updatedExercise;
      this.activeWorkout = {
        ...this.activeWorkout,
        exercises: updatedExercises,
      };
      this.saveDraft();
    });

    this.debouncedSyncToFirestore(
      this.activeWorkout
        ? this.activeWorkout.exercises
        : [],
    );
  }

  async toggleSetComplete(workoutExerciseId: string, setId: string) {
    if (!this.activeWorkout) return;
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) return;

    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex === -1) return;
    const set = exercise.sets[setIndex];
    if (!set) return;

    const nextCompleted = !set.completed;
    const updatedSet: Set = {
      ...set,
      completed: nextCompleted,
      updatedAt: new Date(),
    };

    runInAction(() => {
      if (!this.activeWorkout) return;
      const newSets = [
        ...exercise.sets.slice(0, setIndex),
        updatedSet,
        ...exercise.sets.slice(setIndex + 1),
      ];
      const updatedExercise: WorkoutExercise = { ...exercise, sets: newSets };
      const updatedExercises = [...this.activeWorkout.exercises];
      updatedExercises[exerciseIndex] = updatedExercise;
      this.activeWorkout = {
        ...this.activeWorkout,
        exercises: updatedExercises,
      };
      this.saveDraft();
    });

    this.debouncedSyncToFirestore(
      this.activeWorkout
        ? this.activeWorkout.exercises
        : [],
    );
  }

  async removeSet(workoutExerciseId: string, setId: string) {
    if (!this.activeWorkout) return;
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) return;

    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const newSets = exercise.sets
      .filter((s) => s.id !== setId)
      .map((s, i) => ({ ...s, orderIndex: i + 1 }));

    runInAction(() => {
      if (!this.activeWorkout) return;
      const updatedExercise: WorkoutExercise = { ...exercise, sets: newSets };
      const updatedExercises = [...this.activeWorkout.exercises];
      updatedExercises[exerciseIndex] = updatedExercise;
      this.activeWorkout = {
        ...this.activeWorkout,
        exercises: updatedExercises,
      };
      this.saveDraft();
    });

    this.debouncedSyncToFirestore(
      this.activeWorkout
        ? this.activeWorkout.exercises
        : [],
    );
  }

  async resetWorkoutRoutine() {
    try {
      this.isLoading = true;
      if (this.activeWorkout) {
        const archiveKey = `workout.archive.${dateKey(this.selectedDate)}`;
        const existingArchive = storage.get<any[]>(archiveKey) || [];
        existingArchive.push({
          archivedAt: new Date().toISOString(),
          workout: {
            name: this.activeWorkout.name,
            type: this.activeWorkout.type,
            date: dateKey(this.selectedDate),
          },
          exercises: this.activeWorkout.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exercise: ex.exercise,
            orderIndex: ex.orderIndex,
            sets: ex.sets.map(s => ({
              weight: s.weight,
              reps: s.reps,
              completed: s.completed,
              orderIndex: s.orderIndex,
            })),
          })),
        });
        storage.set(archiveKey, existingArchive);

        const resetExercises = this.activeWorkout.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => ({
            ...s,
            completed: false,
            weight: 0,
            reps: 0,
          })),
        }));

        runInAction(() => {
          if (this.activeWorkout) {
            this.activeWorkout = {
              ...this.activeWorkout,
              exercises: resetExercises,
            };
            this.saveDraft(true);
          }
        });

        if (this.userId) {
          await workoutsService.saveWorkoutExercises(this.userId, this.activeWorkout.id, resetExercises);
        }
      } else {
        const savedTemplate = storage.get<any[]>(`workout.routine.${this.selectedDay}`);
        if (savedTemplate && Array.isArray(savedTemplate)) {
          const resetTemplate = savedTemplate.map(te => ({
            ...te,
            sets: (te.sets || []).map((ts: any) => ({
              ...ts,
              weight: 0,
              reps: 0,
              completed: false,
            })),
          }));
          storage.set(`workout.routine.${this.selectedDay}`, resetTemplate);
        }
      }
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  setDay(day: DayOfWeek, date: Date) {
    runInAction(() => {
      this.selectedDay = day;
      this.selectedDate = date;
    });
  }

  async switchDay(newDay: DayOfWeek, newDate: Date) {
    this.saveDraft(true);

    runInAction(() => {
      this.activeWorkout = null;
      this.selectedDay = newDay;
      this.selectedDate = newDate;
    });

    const newDayDraft = storage.get<Workout>(this.getDayDraftKey(newDay));
    if (newDayDraft) {
      runInAction(() => {
        this.activeWorkout = this.normalizeWorkout(newDayDraft);
      });
    }
  }

  private getDayDraftKey(day: DayOfWeek): string {
    return `workout.draft.${day}`;
  }

  private saveRoutineTemplate() {
    if (!this.activeWorkout) return;
    const templateExercises = this.activeWorkout.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      exercise: ex.exercise,
      orderIndex: ex.orderIndex,
      sets: ex.sets.map(s => ({
        orderIndex: s.orderIndex,
        weight: s.weight,
        reps: s.reps,
        completed: false,
      })),
    }));
    storage.set(`workout.routine.${this.selectedDay}`, templateExercises);
  }

  private debouncedSyncToFirestore(exercises: WorkoutExercise[], immediate = false) {
    if (!this.userId || !this.activeWorkout) return;
    const userId = this.userId;
    const workoutId = this.activeWorkout.id;

    if (this.syncFirestoreTimer) {
      clearTimeout(this.syncFirestoreTimer);
      this.syncFirestoreTimer = null;
    }

    const performSync = async () => {
      try {
        await workoutsService.saveWorkoutExercises(userId, workoutId, exercises);
      } catch (err) {
        logger.error('[WorkoutStore] debouncedSyncToFirestore error:', err);
      }
    };

    if (immediate) {
      performSync();
    } else {
      this.syncFirestoreTimer = setTimeout(performSync, 500);
    }
  }

  private saveDraft(immediate = false) {
    if (!this.activeWorkout) return;
    if (this.saveDraftTimer) {
      clearTimeout(this.saveDraftTimer);
      this.saveDraftTimer = null;
    }
    const performSave = () => {
      if (this.activeWorkout) {
        storage.set(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT, this.activeWorkout);
        storage.set(this.getDayDraftKey(this.selectedDay), this.activeWorkout);
      }
    };

    if (immediate) {
      performSave();
    } else {
      this.saveDraftTimer = setTimeout(performSave, 300);
    }
  }

  saveCurrentAsRoutineTemplate() {
    this.saveRoutineTemplate();
  }

  private getWorkoutName(type: WorkoutType): string {
    const names: Record<WorkoutType, string> = {
      push: 'Push Day',
      pull: 'Pull Day',
      legs: 'Legs Day',
      upper: 'Upper Body',
      lower: 'Lower Body',
      fullbody: 'Full Body',
      cardio: 'Cardio',
      rest: 'Rest Day',
      custom: 'Custom Workout',
    };
    return names[type] || 'Workout';
  }

  private normalizeWorkout(data: any): Workout {
    return {
      ...data,
      date: new Date(data.date),
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      exercises: (data.exercises || []).map((e: any) => ({
        ...e,
        sets: e.sets || [],
      })),
    };
  }
}

export const workoutStore = new WorkoutStore();