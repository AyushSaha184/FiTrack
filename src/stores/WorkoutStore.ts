import { makeAutoObservable, runInAction } from 'mobx';
import type { Workout, WorkoutExercise, Set, WorkoutType, DayOfWeek } from '../models';
import { workoutsService } from '../services/supabase/workouts';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { generateUUID } from '../utils/helpers';
import { isValidUUID } from '../utils/helpers';
import { authStore } from './AuthStore';

export class WorkoutStore {
  workouts: Map<string, Workout> = new Map();
  activeWorkout: Workout | null = null;
  selectedDay: DayOfWeek = 'monday';
  selectedDate: Date = new Date();
  isLoading = false;
  isSyncing = false;
  error: string | null = null;
  weeklyWorkouts: Map<string, Workout> = new Map();

  constructor() {
    makeAutoObservable(this);
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
    if (!isValidUUID(userId)) {
      console.warn('[WorkoutStore] Skipping loadWorkouts: invalid userId', userId);
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
      console.error('[WorkoutStore] resolveExerciseId DB error:', err);
      return null;
    }
  }

  async startWorkout(userId: string, type: WorkoutType = 'custom', name?: string) {
    const workoutId = generateUUID();

    const savedTemplate = storage.get<any[]>(`workout.routine.${this.selectedDay}`);

    if (savedTemplate && Array.isArray(savedTemplate)) {
      const resolvedExercises: WorkoutExercise[] = [];
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
          order: te.order ?? resolvedExercises.length,
          sets: (te.sets || []).map((ts: any, setIdx: number) => ({
            id: generateUUID(),
            order: ts.order ?? setIdx,
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
      resolvedExercises.forEach((ex, idx) => { ex.order = idx; });
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

        await Promise.all(
          resolvedExercises.map(async (ex) => {
            const dbEx = await workoutsService.addExercise(workout.id, ex.exerciseId, ex.order);
            runInAction(() => { ex.id = dbEx.id; });
            await Promise.all(
              ex.sets.map(async (s) => {
                await workoutsService.addSet(dbEx.id, {
                  id: s.id,
                  order: s.order,
                  weight: s.weight,
                  reps: s.reps,
                  completed: false,
                });
              }),
            );
          }),
        );
      } catch (e) {
        console.error('[WorkoutStore] startWorkout DB error:', e);
      } finally {
        runInAction(() => {
          this.activeWorkout = workout;
          this.isSyncing = false;
          this.saveDraft();
        });
      }
      return workout;
    }
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

  async completeWorkout() {
    if (!this.activeWorkout) return null;
    const duration = this.activeWorkout.startTime
      ? Math.floor((Date.now() - new Date(this.activeWorkout.startTime).getTime()) / 1000)
      : 0;

    try {
      this.isLoading = true;

      let updated;
      try {
        updated = await workoutsService.completeWorkout(
          this.activeWorkout.id,
          duration,
          this.totalVolume,
        );
      } catch (err: any) {
        if (err?.code === 'PGRST116') {
          console.warn('[WorkoutStore] Workout not found in DB during complete, attempting to recreate and sync entire workout...');

          const existingWorkout = await workoutsService.getWorkout(this.activeWorkout.id).catch(() => null);
          if (!existingWorkout) {
            await workoutsService.createWorkout({
              id: this.activeWorkout.id,
              userId: this.activeWorkout.userId,
              name: this.activeWorkout.name,
              type: this.activeWorkout.type,
              date: this.activeWorkout.date,
              startTime: this.activeWorkout.startTime,
              completed: false,
            });
          }

          const existingExerciseIds = new Set(
            (existingWorkout?.exercises || []).map((ex: any) => ex.exerciseId)
          );

          for (const ex of this.activeWorkout.exercises) {
            const dbEx = await workoutsService.addExercise(
              this.activeWorkout.id,
              ex.exerciseId,
              ex.order
            );

            for (const s of ex.sets) {
              if (s.completed) {
                await workoutsService.addSet(dbEx.id, {
                  id: s.id,
                  order: s.order,
                  weight: s.weight,
                  reps: s.reps,
                  completed: true,
                });
              }
            }
          }

          updated = await workoutsService.completeWorkout(
            this.activeWorkout.id,
            duration,
            this.totalVolume,
          );
        } else {
          throw err;
        }
      }

      // Reload workouts to sync history
      await this.loadWorkouts(this.activeWorkout.userId);

      this.saveCurrentAsRoutineTemplate();

      runInAction(() => {
        this.activeWorkout = null;
        storage.delete(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
        storage.delete(this.getDayDraftKey(this.selectedDay));
      });
      return updated;
    } catch (error) {
      console.error('[WorkoutStore] completeWorkout error:', error);
      return null;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async cancelWorkout() {
    if (!this.activeWorkout) return;
    const workoutId = this.activeWorkout.id;
    const userId = this.activeWorkout.userId;

    const preservedExercises = this.activeWorkout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s, completed: false })),
    }));

    try {
      await workoutsService.deleteWorkout(workoutId);
      runInAction(() => {
        this.activeWorkout = null;
        storage.delete(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
        storage.delete(this.getDayDraftKey(this.selectedDay));
      });
      await this.loadWorkouts(userId);
    } catch (e) {
      console.error('[WorkoutStore] cancelWorkout DB error:', e);
      runInAction(() => {
        this.activeWorkout = {
          ...this.activeWorkout!,
          exercises: preservedExercises,
        };
      });
    }
  }

  async addExercise(exerciseId: string, exerciseName: string, muscleGroup: string, equipment: string = 'barbell') {
    const hasSlugFormat = !isValidUUID(exerciseId);
    const realExerciseId = hasSlugFormat ? await this.resolveExerciseId(exerciseId) : exerciseId;

    if (!realExerciseId) {
      console.error('[WorkoutStore] Cannot add exercise: no DB UUID found for', exerciseId);
      return;
    }

    // Auto-create workout if none exists
    if (!this.activeWorkout) {
      const workoutId = generateUUID();
      const userId = this.userId || 'unknown';
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
        this.saveDraft();
      });
    }

    const tempId = generateUUID();
    const workoutExercise: WorkoutExercise = {
      id: tempId,
      exerciseId: realExerciseId,
      exercise: { name: exerciseName, muscleGroup, equipment },
      order: this.activeWorkout!.exercises.length,
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
        workoutExercise.order,
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
      console.error('[WorkoutStore] addExercise DB error:', err);
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
      console.error('[WorkoutStore] removeExercise DB error:', err);
    }
  }

  async addSet(workoutExerciseId: string, weight = 0, reps = 0) {
    if (!this.activeWorkout) return;
    const exercise = this.activeWorkout.exercises.find((e) => e.id === workoutExerciseId);
    if (!exercise) return;

    const set: Set = {
      id: generateUUID(),
      order: exercise.sets.length + 1,
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
        order: set.order,
        weight: set.weight,
        reps: set.reps,
        completed: false,
      });
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
      console.error('[WorkoutStore] addSet DB error:', err);
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
        console.error('[WorkoutStore] updateSet DB error:', err);
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
      console.error('[WorkoutStore] toggleSetComplete DB error:', err);
    }
  }

  async removeSet(workoutExerciseId: string, setId: string) {
    if (!this.activeWorkout) return;
    const exercise = this.activeWorkout.exercises.find((e) => e.id === workoutExerciseId);
    if (!exercise) return;

    const setsToUpdate: { id: string; order: number }[] = [];

    runInAction(() => {
      exercise.sets = exercise.sets.filter((s) => s.id !== setId);
      exercise.sets.forEach((s, i) => {
        s.order = i + 1;
        setsToUpdate.push({ id: s.id, order: s.order });
      });
      if (this.activeWorkout) {
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
      }
      this.saveDraft();
    });

    try {
      await workoutsService.removeSet(setId);
      await Promise.all(
        setsToUpdate.map(({ id, order }) =>
          workoutsService.updateSet(id, { order })
        )
      );
    } catch (err) {
      console.error('[WorkoutStore] removeSet DB error:', err);
    }
  }

  async resetWorkoutRoutine() {
    try {
      this.isLoading = true;
      if (this.activeWorkout) {
        for (const exercise of this.activeWorkout.exercises) {
          for (const set of exercise.sets) {
            if (set.completed) {
              try {
                await workoutsService.removeSet(set.id);
              } catch (e) {
                console.error('[WorkoutStore] resetWorkoutRoutine DB error:', e);
              }
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
                  id: generateUUID(),
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

  private saveRoutineTemplate() {
    if (!this.activeWorkout) return;
    const templateExercises = this.activeWorkout.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      exercise: ex.exercise,
      order: ex.order,
      sets: ex.sets.map(s => ({
        order: s.order,
        weight: s.weight,
        reps: s.reps,
        completed: false,
      })),
    }));
    storage.set(`workout.routine.${this.selectedDay}`, templateExercises);
  }

  private saveDraft() {
    if (this.activeWorkout) {
      storage.set(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT, this.activeWorkout);
      storage.set(this.getDayDraftKey(this.selectedDay), this.activeWorkout);
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