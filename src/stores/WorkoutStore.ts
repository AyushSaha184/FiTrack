import { makeAutoObservable, runInAction } from 'mobx';
import type { Workout, WorkoutExercise, Set, WorkoutType, DayOfWeek } from '../models';
import { workoutsService } from '../services/supabase/workouts';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, getDayOfWeekKey } from '../utils/constants';
import { generateUUID, isValidUUID, dateKey } from '../utils/helpers';
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

  async loadWorkouts(userId: string, startDate?: string, endDate?: string) {
    if (!userId) {
      console.warn('[WorkoutStore] Skipping loadWorkouts: missing userId');
      return;
    }
    try {
      this.isLoading = true;
      const data = await workoutsService.getWorkouts(userId, startDate, endDate);
      runInAction(() => {
        this.workouts.clear();
        data.forEach((w: any) => {
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
  }

  async resolveExerciseId(inputId: string): Promise<string | null> {
    if (isValidUUID(inputId)) return inputId;
    try {
      const result = await workoutsService.lookupExerciseIdBySlug(inputId);
      return result;
    } catch (err) {
      logger.error('[WorkoutStore] resolveExerciseId DB error:', err);
      return null;
    }
  }

  async startWorkout(userId: string, type: WorkoutType = 'custom', name?: string) {
    const workoutId = generateUUID();

    const savedTemplate = storage.get<any[]>(`workout.routine.${this.selectedDay}`);
    const resolvedExercises: WorkoutExercise[] = [];

    if (savedTemplate && Array.isArray(savedTemplate)) {
      for (const te of savedTemplate) {
        const realId = await this.resolveExerciseId(te.exerciseId);
        if (!realId) {
          console.warn('[WorkoutStore] Skipping exercise with unresolved slug:', te.exerciseId);
          continue;
        }
        const exerciseExerciseId = generateUUID();
        resolvedExercises.push({
          id: exerciseExerciseId,
          exerciseId: realId,
          exercise: te.exercise,
          orderIndex: te.orderIndex ?? resolvedExercises.length,
          sets: (te.sets || []).map((ts: any, setIdx: number) => ({
            id: generateUUID(),
            orderIndex: ts.orderIndex ?? setIdx,
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
    });

    try {
      await workoutsService.createWorkout({
        id: workout.id,
        userId: workout.userId,
        name: workout.name,
        type: workout.type,
        date: workout.date,
        startTime: workout.startTime,
        completed: false,
      });

      if (resolvedExercises.length > 0) {
        const exerciseItems = resolvedExercises.map((ex) => ({
          id: ex.id,
          workoutId: workout.id,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
        }));
        await workoutsService.addExercisesBulk(exerciseItems);

        const allSets = resolvedExercises.flatMap((ex) =>
          ex.sets.map((s) => ({
            id: s.id,
            workoutExerciseId: ex.id,
            workoutId: workout.id,
            orderIndex: s.orderIndex,
            weight: s.weight,
            reps: s.reps,
            completed: false,
          }))
        );
        if (allSets.length > 0) {
          await workoutsService.addSetsBulk(allSets);
        }
      }
    } catch (e) {
      logger.error('[WorkoutStore] startWorkout DB error:', e);
    } finally {
      runInAction(() => {
        this.activeWorkout = workout;
        this.isSyncing = false;
        this.saveDraft();
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
    const hasSlugFormat = !isValidUUID(exerciseId);
    const realExerciseId = hasSlugFormat ? await this.resolveExerciseId(exerciseId) : exerciseId;

    if (!realExerciseId) {
      logger.error('[WorkoutStore] Cannot add exercise: no DB UUID found for', exerciseId);
      return;
    }

    // Auto-create workout if none exists
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

      try {
        await workoutsService.createWorkout({
          id: workout.id,
          userId: workout.userId,
          name: workout.name,
          type: workout.type,
          date: workout.date,
          startTime: workout.startTime,
          completed: false,
        });
      } catch (err) {
        logger.error('[WorkoutStore] Failed to auto-create workout in DB:', err);
        return;
      }

      runInAction(() => {
        this.activeWorkout = workout;
        this.saveDraft();
      });
    }

    const tempId = generateUUID();
    const workoutExercise: WorkoutExercise = {
      id: tempId,
      exerciseId: realExerciseId,
      exercise: { name: exerciseName, muscleGroup, equipment },
      orderIndex: this.activeWorkout!.exercises.length,
      sets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    runInAction(() => {
      this.activeWorkout = {
        ...this.activeWorkout!,
        exercises: [...this.activeWorkout!.exercises, workoutExercise],
      };
      this.saveDraft();
    });

    try {
      const dbExercise = await workoutsService.addExercise(
        this.activeWorkout!.id,
        realExerciseId,
        workoutExercise.orderIndex,
      );
      if (!dbExercise?.id) {
        throw new Error('[WorkoutStore] addExercise returned no id from DB');
      }
      runInAction(() => {
        const ex = this.activeWorkout!.exercises.find((e) => e.id === tempId);
        if (ex) {
          ex.id = dbExercise.id;
        }
        this.saveDraft();
      });
    } catch (err) {
      logger.error('[WorkoutStore] addExercise DB error:', err);
      runInAction(() => {
        this.activeWorkout = {
          ...this.activeWorkout!,
          exercises: this.activeWorkout!.exercises.filter((e) => e.id !== tempId),
        };
        this.saveDraft();
      });
    }
}

async removeExercise(workoutExerciseId: string) {
    if (!this.activeWorkout) return;
    runInAction(() => {
      if (this.activeWorkout) {
        this.activeWorkout = {
          ...this.activeWorkout,
          exercises: this.activeWorkout.exercises.filter(
            (e) => e.id !== workoutExerciseId,
          ),
        };
        this.saveDraft();
      }
    });

    try {
      await workoutsService.removeExercise(workoutExerciseId);
    } catch (err) {
      logger.error('[WorkoutStore] removeExercise DB error:', err);
    }
  }

  reorderExercises(fromIndex: number, toIndex: number) {
    if (!this.activeWorkout) return;
    const exercises = [...this.activeWorkout.exercises];
    if (
      fromIndex < 0 ||
      fromIndex >= exercises.length ||
      toIndex < 0 ||
      toIndex >= exercises.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    exercises.forEach((ex, idx) => {
      ex.orderIndex = idx;
    });

    runInAction(() => {
      if (this.activeWorkout) {
        this.activeWorkout.exercises = exercises;
      }
    });

    setTimeout(() => {
      this.saveDraft();
      this.saveRoutineTemplate();
      Promise.all(
        exercises.map((ex) => workoutsService.updateExerciseOrder(ex.id, ex.orderIndex))
      ).catch((err) => logger.error('[WorkoutStore] reorderExercises DB error:', err));
    }, 0);
  }

  async addSet(workoutExerciseId: string, weight = 0, reps = 0) {
    if (!this.activeWorkout) return;
    const exercise = this.activeWorkout.exercises.find((e) => e.id === workoutExerciseId);
    if (!exercise) return;

    const set: Set = {
      id: generateUUID(),
      orderIndex: exercise.sets.length + 1,
      weight,
      reps,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    runInAction(() => {
      exercise.sets = [...exercise.sets, set];
      if (this.activeWorkout) {
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
      }
      this.saveDraft();
    });

    try {
      const dbSet = await workoutsService.addSet(workoutExerciseId, {
        id: set.id,
        orderIndex: set.orderIndex,
        weight: set.weight,
        reps: set.reps,
        completed: false,
      }, this.activeWorkout!.id);
      if (dbSet && dbSet.id !== set.id && this.activeWorkout) {
        runInAction(() => {
          const ex = this.activeWorkout!.exercises.find((e) => e.id === workoutExerciseId);
          if (ex) {
            ex.sets = ex.sets.map((s) =>
              s.id === set.id ? { ...s, id: dbSet.id } : s
            );
          }
          this.saveDraft();
        });
      }
    } catch (err) {
      logger.error('[WorkoutStore] addSet DB error:', err);
    }
  }

  async updateSet(workoutExerciseId: string, setId: string, updates: Partial<Set>) {
    if (!this.activeWorkout) return;
    const exercise = this.activeWorkout.exercises.find((e) => e.id === workoutExerciseId);
    if (!exercise) return;

    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex === -1) return;

    runInAction(() => {
      if (this.activeWorkout) {
        const set = exercise.sets[setIndex];
        const updatedSet = { ...set, ...updates, updatedAt: new Date() };
        exercise.sets = [
          ...exercise.sets.slice(0, setIndex),
          updatedSet,
          ...exercise.sets.slice(setIndex + 1),
        ];
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
        this.saveDraft();
      }
    });

    const set = exercise.sets[setIndex];
    if (set) {
      try {
        await workoutsService.updateSet(setId, {
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
        });
      } catch (err) {
        logger.error('[WorkoutStore] updateSet DB error:', err);
      }
    }
  }

  async toggleSetComplete(workoutExerciseId: string, setId: string) {
    if (!this.activeWorkout) return;
    const exercise = this.activeWorkout.exercises.find((e) => e.id === workoutExerciseId);
    if (!exercise) return;
    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex === -1) return;
    const set = exercise.sets[setIndex];
    if (!set) return;

    const nextCompleted = !set.completed;

    runInAction(() => {
      const updatedSet = { ...set, completed: nextCompleted, updatedAt: new Date() };
      exercise.sets = [
        ...exercise.sets.slice(0, setIndex),
        updatedSet,
        ...exercise.sets.slice(setIndex + 1),
      ];
      if (this.activeWorkout) {
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
      }
      this.saveDraft();
    });

    try {
      await workoutsService.updateSet(setId, {
        completed: nextCompleted,
      });
    } catch (err) {
      logger.error('[WorkoutStore] toggleSetComplete DB error:', err);
    }
  }

  async removeSet(workoutExerciseId: string, setId: string) {
    if (!this.activeWorkout) return;
    const exercise = this.activeWorkout.exercises.find((e) => e.id === workoutExerciseId);
    if (!exercise) return;

    const setsToUpdate: { id: string; orderIndex: number }[] = [];

    runInAction(() => {
      exercise.sets = exercise.sets.filter((s) => s.id !== setId);
      exercise.sets.forEach((s, i) => {
        s.orderIndex = i + 1;
        setsToUpdate.push({ id: s.id, orderIndex: s.orderIndex });
      });
      if (this.activeWorkout) {
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
      }
      this.saveDraft();
    });

    try {
      await workoutsService.removeSet(setId);
      await Promise.all(
        setsToUpdate.map(({ id, orderIndex }) =>
          workoutsService.updateSet(id, { orderIndex })
        )
      );
    } catch (err) {
      logger.error('[WorkoutStore] removeSet DB error:', err);
    }
  }

  async resetWorkoutRoutine() {
    try {
      this.isLoading = true;
      if (this.activeWorkout) {
        // Archive current workout data locally before clearing
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

        for (const exercise of this.activeWorkout.exercises) {
          for (const set of exercise.sets) {
            try {
              await workoutsService.updateSet(set.id, {
                weight: 0,
                reps: 0,
                completed: false,
              });
            } catch (e) {
              logger.error('[WorkoutStore] resetWorkoutRoutine DB error:', e);
            }
          }
        }
        runInAction(() => {
          if (this.activeWorkout) {
            this.activeWorkout = {
              ...this.activeWorkout,
              exercises: this.activeWorkout.exercises.map(ex => ({
                ...ex,
                sets: ex.sets.map(s => ({
                  ...s,
                  completed: false,
                  weight: 0,
                  reps: 0,
                })),
              })),
            };
            this.saveDraft();
          }
        });
      } else {
        // Reset the saved template for the day directly
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
    this.saveDraft();

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

  private persistSelectedDay() {
    storage.set(STORAGE_KEYS.LAST_WORKOUT_DAY, this.selectedDay);
    storage.set(STORAGE_KEYS.LAST_WORKOUT_DATE, this.selectedDate.toISOString());
  }

  private restoreSelectedDay() {
    const savedDay = storage.get<DayOfWeek>(STORAGE_KEYS.LAST_WORKOUT_DAY);
    const savedDateStr = storage.get<string>(STORAGE_KEYS.LAST_WORKOUT_DATE);
    if (savedDay) {
      this.selectedDay = savedDay;
    }
    if (savedDateStr) {
      const parsed = new Date(savedDateStr);
      if (!isNaN(parsed.getTime())) {
        this.selectedDate = parsed;
      }
    }
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

  private saveDraftTimer: ReturnType<typeof setTimeout> | null = null;

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
      startTime: data.start_time ? new Date(data.start_time) : undefined,
      endTime: data.end_time ? new Date(data.end_time) : undefined,
      exercises: (data.exercises || []).map((e: any) => ({
        ...e,
        sets: e.sets || [],
      })),
    };
  }
}

export const workoutStore = new WorkoutStore();