import { makeAutoObservable, runInAction } from 'mobx';
import type { Workout, WorkoutExercise, Set, WorkoutType, DayOfWeek } from '../models';
import { workoutsService } from '../services/firebase/workoutsService';
import { collections } from '../services/firebase/firestore';
import firestore from '@react-native-firebase/firestore';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, getDayOfWeekKey, DAY_ORDER, getWeekDates } from '../utils/constants';
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
    if (!this.activeWorkout) {
      return 0;
    }
    return this.activeWorkout.exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((t, s) => t + (s.completed ? s.weight * s.reps : 0), 0);
    }, 0);
  }

  get completedSetsCount(): number {
    if (!this.activeWorkout) {
      return 0;
    }
    return this.activeWorkout.exercises.reduce((total, ex) => {
      return total + ex.sets.filter((s) => s.completed).length;
    }, 0);
  }

  get totalSetsCount(): number {
    if (!this.activeWorkout) {
      return 0;
    }
    return this.activeWorkout.exercises.reduce((total, ex) => total + ex.sets.length, 0);
  }

  async pruneOldWorkouts() {
    if (!this.userId) {
      return;
    }
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
      if (__DEV__) {
        logger.warn('[WorkoutStore] Skipping loadWorkouts: missing userId');
      }
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
    if (!userId) {
      return () => {};
    }
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

  clearActiveWorkout(day?: DayOfWeek) {
    if (this.saveDraftTimer) {
      clearTimeout(this.saveDraftTimer);
      this.saveDraftTimer = null;
    }
    if (this.syncFirestoreTimer) {
      clearTimeout(this.syncFirestoreTimer);
      this.syncFirestoreTimer = null;
    }
    const targetDay = day || this.selectedDay;
    storage.delete(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
    storage.delete(this.getDayDraftKey(targetDay));
    runInAction(() => {
      this.activeWorkout = null;
    });
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

    if (!this.activeWorkout) {
      return;
    }
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
      if (!this.activeWorkout) {
        return;
      }
      this.activeWorkout = {
        ...this.activeWorkout,
        exercises: [...this.activeWorkout.exercises, newExercise],
      };
      this.saveDraft();
    });

    this.debouncedSyncToFirestore(this.activeWorkout.exercises);
  }

  async removeExercise(workoutExerciseId: string) {
    if (!this.activeWorkout) {
      return;
    }
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
    if (!this.activeWorkout) {
      return;
    }
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
      if (idx === fromIndex) {
        return this.activeWorkout!.exercises[toIndex];
      }
      if (idx === toIndex) {
        return this.activeWorkout!.exercises[fromIndex];
      }
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
    if (!this.activeWorkout) {
      return;
    }
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) {
      return;
    }

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
      if (!this.activeWorkout) {
        return;
      }
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
    if (!this.activeWorkout) {
      return;
    }
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) {
      return;
    }

    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex === -1) {
      return;
    }

    const existing = exercise.sets[setIndex];
    const updatedSet: Set = { ...existing, ...updates, updatedAt: new Date() };

    runInAction(() => {
      if (!this.activeWorkout) {
        return;
      }
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
    if (!this.activeWorkout) {
      return;
    }
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) {
      return;
    }

    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex === -1) {
      return;
    }
    const set = exercise.sets[setIndex];
    if (!set) {
      return;
    }

    const nextCompleted = !set.completed;
    const updatedSet: Set = {
      ...set,
      completed: nextCompleted,
      updatedAt: new Date(),
    };

    runInAction(() => {
      if (!this.activeWorkout) {
        return;
      }
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
    if (!this.activeWorkout) {
      return;
    }
    const exerciseIndex = this.activeWorkout.exercises.findIndex(
      (e) => e.id === workoutExerciseId,
    );
    if (exerciseIndex === -1) {
      return;
    }

    const exercise = this.activeWorkout.exercises[exerciseIndex];
    const newSets = exercise.sets
      .filter((s) => s.id !== setId)
      .map((s, i) => ({ ...s, orderIndex: i + 1 }));

    runInAction(() => {
      if (!this.activeWorkout) {
        return;
      }
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

      if (this.saveDraftTimer) {
        clearTimeout(this.saveDraftTimer);
        this.saveDraftTimer = null;
      }
      if (this.syncFirestoreTimer) {
        clearTimeout(this.syncFirestoreTimer);
        this.syncFirestoreTimer = null;
      }

      // 1. Get dates for the currently selected week (starts on Monday)
      const weekDates = getWeekDates(this.selectedDate);
      const workoutsToSyncToFirestore: { id: string; workoutRecord: any; snapshotExercises: WorkoutExercise[]; dayDate: Date }[] = [];
      const now = new Date();

      // 2. Iterate through all 7 days in the week
      for (let i = 0; i < DAY_ORDER.length; i++) {
        const dayKey = DAY_ORDER[i];
        const dayDate = weekDates[i] || new Date();
        const dayDateStr = dateKey(dayDate);
        const isCurrentSelectedDay = dayKey.toLowerCase() === this.selectedDay.toLowerCase();

        // Retrieve existing draft or active workout for this day
        let dayWorkout: Workout | null = null;
        if (isCurrentSelectedDay && this.activeWorkout) {
          dayWorkout = this.activeWorkout;
        }
        if (!dayWorkout || !dayWorkout.exercises || dayWorkout.exercises.length === 0) {
          dayWorkout = storage.get<Workout>(this.getDayDraftKey(dayKey)) || dayWorkout || null;
        }

        const templateKey = `workout.routine.${dayKey}`;
        const savedTemplate = storage.get<any[]>(templateKey);

        let exercisesToProcess: WorkoutExercise[] = dayWorkout?.exercises || [];

        // If no draft was found, check if a template exists for this day
        if (exercisesToProcess.length === 0 && savedTemplate && Array.isArray(savedTemplate) && savedTemplate.length > 0) {
          exercisesToProcess = savedTemplate.map((te: any, exIdx: number) => ({
            id: te.id || generateUUID(),
            exerciseId: te.exerciseId || te.id || generateUUID(),
            exercise: te.exercise,
            orderIndex: te.orderIndex ?? exIdx,
            sets: (te.sets || []).map((ts: any, sIdx: number) => ({
              id: ts.id || generateUUID(),
              orderIndex: ts.orderIndex ?? sIdx + 1,
              weight: ts.weight || 0,
              reps: ts.reps || 0,
              completed: ts.completed || false,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
        }

        // If this day has no exercises planned at all, continue
        if (exercisesToProcess.length === 0) {
          continue;
        }

        // 3. Check if there is logged workout data (weights, reps, or completed sets) to archive
        const hasLoggedData = exercisesToProcess.some(ex =>
          (ex.sets || []).some(s => s.completed || (s.weight && s.weight > 0) || (s.reps && s.reps > 0))
        );

        const workoutIdToArchive = dayWorkout?.id || generateUUID();
        const workoutNameToArchive = dayWorkout?.name || this.getWorkoutName(dayWorkout?.type || 'custom');
        const workoutTypeToArchive = dayWorkout?.type || 'custom';

        const snapshotExercises: WorkoutExercise[] = exercisesToProcess.map((ex, exIdx) => ({
          ...ex,
          orderIndex: ex.orderIndex ?? exIdx,
          sets: (ex.sets || []).map((s, sIdx) => ({
            ...s,
            orderIndex: s.orderIndex ?? sIdx + 1,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            completed: Boolean(s.completed),
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
          })),
          createdAt: ex.createdAt ? new Date(ex.createdAt) : new Date(),
          updatedAt: new Date(),
        }));

        if (hasLoggedData) {
          // Archive locally for progress tracking (keyed by date, compatible with ExerciseProgressScreen)
          const archiveKey = `workout.archive.${dayDateStr}`;
          const existingArchive = storage.get<any[]>(archiveKey) || [];
          const workoutRecord = {
            id: workoutIdToArchive,
            name: workoutNameToArchive,
            type: workoutTypeToArchive,
            date: dayDateStr,
            exercises: snapshotExercises,
          };
          const archiveEntry = {
            archivedAt: new Date().toISOString(),
            workout: workoutRecord,
            exercises: snapshotExercises,
          };

          const existingIndex = existingArchive.findIndex(item => item?.workout?.id === workoutIdToArchive);
          if (existingIndex >= 0) {
            existingArchive[existingIndex] = archiveEntry;
          } else {
            existingArchive.push(archiveEntry);
          }
          storage.set(archiveKey, existingArchive);

          // Queue for non-blocking Firestore sync
          if (this.userId) {
            workoutsToSyncToFirestore.push({
              id: workoutIdToArchive,
              workoutRecord,
              snapshotExercises,
              dayDate,
            });
          }
        }

        // 4. Reset routine for this day:
        // Preserves user-added exercises and configured sets, resets weight & reps to 0, unticks completed.
        const resetExercises: WorkoutExercise[] = exercisesToProcess.map((ex, exIdx) => ({
          ...ex,
          orderIndex: ex.orderIndex ?? exIdx,
          sets: (ex.sets || []).map((s, sIdx) => ({
            ...s,
            orderIndex: s.orderIndex ?? sIdx + 1,
            weight: 0,
            reps: 0,
            completed: false,
            updatedAt: now,
          })),
          updatedAt: now,
        }));

        const resetWorkout: Workout = {
          id: generateUUID(),
          userId: this.userId || '',
          name: workoutNameToArchive,
          type: workoutTypeToArchive,
          date: dayDate,
          exercises: resetExercises,
          completed: false,
          totalVolume: 0,
          createdAt: now,
          updatedAt: now,
        };

        // Save reset draft to MMKV
        storage.set(this.getDayDraftKey(dayKey), resetWorkout);

        // If routine template exists, also update it with reset sets
        if (savedTemplate && Array.isArray(savedTemplate)) {
          const resetTemplate = resetExercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exercise: ex.exercise,
            orderIndex: ex.orderIndex,
            sets: ex.sets.map(s => ({
              orderIndex: s.orderIndex,
              weight: 0,
              reps: 0,
              completed: false,
            })),
          }));
          storage.set(templateKey, resetTemplate);
        }

        // If this is the currently selected day on screen, update activeWorkout immediately
        if (isCurrentSelectedDay) {
          runInAction(() => {
            this.activeWorkout = resetWorkout;
          });
          storage.set(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT, resetWorkout);
        }
      }

      // 5. Asynchronously persist archived workouts to Firestore in the background without blocking the UI
      if (this.userId && workoutsToSyncToFirestore.length > 0) {
        const userId = this.userId;
        setTimeout(async () => {
          for (const item of workoutsToSyncToFirestore) {
            try {
              const totalVolume = item.snapshotExercises.reduce((total: number, ex: any) => {
                return total + (ex.sets || []).reduce((t: number, s: any) => t + (s.completed ? (s.weight || 0) * (s.reps || 0) : 0), 0);
              }, 0);

              // Plain JSON serialization for Firestore
              const firestoreExercises = item.snapshotExercises.map((ex: any) => ({
                id: String(ex.id || generateUUID()),
                exerciseId: String(ex.exerciseId || ''),
                exercise: ex.exercise ? {
                  name: String(ex.exercise.name || ''),
                  muscleGroup: String(ex.exercise.muscleGroup || ''),
                  equipment: String(ex.exercise.equipment || ''),
                } : null,
                orderIndex: Number(ex.orderIndex || 0),
                sets: (ex.sets || []).map((s: any) => ({
                  id: String(s.id || generateUUID()),
                  orderIndex: Number(s.orderIndex || 0),
                  weight: Number(s.weight || 0),
                  reps: Number(s.reps || 0),
                  completed: Boolean(s.completed),
                })),
              }));

              await workoutsService.createWorkout(userId, {
                id: item.id,
                name: item.workoutRecord.name,
                type: item.workoutRecord.type,
                date: item.dayDate,
                completed: true,
                totalVolume,
                exercises: firestoreExercises as any,
              });

              runInAction(() => {
                this.workouts.set(item.id, {
                  id: item.id,
                  userId,
                  name: item.workoutRecord.name,
                  type: item.workoutRecord.type as any,
                  date: item.dayDate,
                  completed: true,
                  totalVolume,
                  exercises: item.snapshotExercises,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              });
            } catch (err) {
              logger.error(`[WorkoutStore] Background Firestore archive failed for ${item.id}:`, err);
            }
          }
        }, 0);
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
    if (!this.activeWorkout) {
      return;
    }
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
    if (!this.userId || !this.activeWorkout) {
      return;
    }
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
    if (!this.activeWorkout) {
      return;
    }
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