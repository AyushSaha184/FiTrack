import { makeAutoObservable, runInAction } from 'mobx';
import type { Workout, WorkoutExercise, Set, WorkoutType, DayOfWeek } from '../models';
import { workoutsService } from '../services/supabase/workouts';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { generateId } from '../utils/helpers';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export class WorkoutStore {
  workouts: Map<string, Workout> = new Map();
  activeWorkout: Workout | null = null;
  selectedDay: DayOfWeek = 'monday';
  selectedDate: Date = new Date();
  isLoading = false;
  error: string | null = null;
  weeklyWorkouts: Map<string, Workout> = new Map();

  constructor() {
    makeAutoObservable(this);
    this.restoreActiveWorkout();
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

  async startWorkout(userId: string, type: WorkoutType = 'custom', name?: string) {
    const workoutId = generateUUID();
    
    // Check if we have a saved routine template for this day of the week
    const savedTemplate = storage.get<any[]>(`workout.routine.${this.selectedDay}`);
    let exercisesList: WorkoutExercise[] = [];
    
    if (savedTemplate && Array.isArray(savedTemplate)) {
      exercisesList = savedTemplate.map((te, exIdx) => {
        const exerciseExerciseId = generateUUID();
        return {
          id: exerciseExerciseId,
          exerciseId: te.exerciseId,
          exercise: te.exercise,
          order: te.order ?? exIdx,
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
        };
      });
    }

    const workout: Workout = {
      id: workoutId,
      userId,
      name: name || this.getWorkoutName(type),
      type,
      date: this.selectedDate,
      exercises: exercisesList,
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

      // Sync the saved exercises and sets to the database for this session
      for (const ex of exercisesList) {
        const dbEx = await workoutsService.addExercise(
          workout.id,
          ex.exerciseId,
          ex.order
        );
        runInAction(() => {
          ex.id = dbEx.id;
        });

        for (const s of ex.sets) {
          await workoutsService.addSet(dbEx.id, {
            id: s.id,
            order: s.order,
            weight: s.weight,
            reps: s.reps,
            completed: false,
          });
        }
      }
      
      this.saveDraft();
    } catch (e) {
      console.error('[WorkoutStore] startWorkout DB error:', e);
    }

    return workout;
  }

  async restoreActiveWorkout() {
    const draft = storage.get<Workout>(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
    if (draft) {
      runInAction(() => {
        this.activeWorkout = this.normalizeWorkout(draft);
      });
      return this.activeWorkout;
    }
    return null;
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
          
          await workoutsService.createWorkout({
            id: this.activeWorkout.id,
            userId: this.activeWorkout.userId,
            name: this.activeWorkout.name,
            type: this.activeWorkout.type,
            date: this.activeWorkout.date,
            startTime: this.activeWorkout.startTime,
            completed: false,
          });

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

      runInAction(() => {
        this.activeWorkout = null;
        storage.delete(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
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

    // Preserve exercises as template, reset active state
    const preservedExercises = this.activeWorkout.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({ ...s, completed: false })),
    }));

    runInAction(() => {
      this.activeWorkout = null;
      storage.delete(STORAGE_KEYS.ACTIVE_WORKOUT_DRAFT);
    });

    try {
      await workoutsService.deleteWorkout(workoutId);
      await this.loadWorkouts(userId);
    } catch (e) {
      console.error('[WorkoutStore] cancelWorkout DB error:', e);
    }
  }

  async addExercise(exerciseId: string, exerciseName: string, muscleGroup: string) {
    if (!this.activeWorkout) return;
    const tempId = generateUUID();
    const workoutExercise: WorkoutExercise = {
      id: tempId,
      exerciseId,
      exercise: { name: exerciseName, muscleGroup, equipment: 'barbell' },
      order: this.activeWorkout.exercises.length,
      sets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    runInAction(() => {
      if (this.activeWorkout) {
        this.activeWorkout = {
          ...this.activeWorkout,
          exercises: [...this.activeWorkout.exercises, workoutExercise],
        };
        this.saveDraft();
      }
    });

    try {
      const dbExercise = await workoutsService.addExercise(
        this.activeWorkout.id,
        exerciseId,
        workoutExercise.order
      );
      runInAction(() => {
        if (this.activeWorkout) {
          const ex = this.activeWorkout.exercises.find((e) => e.id === tempId);
          if (ex) {
            ex.id = dbExercise.id;
          }
          this.saveDraft();
        }
      });
    } catch (err) {
      console.error('[WorkoutStore] addExercise DB error:', err);
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

  addSet(workoutExerciseId: string, weight = 0, reps = 0) {
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
      // Create new activeWorkout reference to trigger MobX reactivity
      if (this.activeWorkout) {
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
      }
      this.saveDraft();
    });
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
        // Create new activeWorkout reference to trigger MobX reactivity
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
        this.saveDraft();
      }
    });

    const set = exercise.sets[setIndex];
    if (set && set.completed) {
      try {
        await workoutsService.updateSet(setId, {
          weight: set.weight,
          reps: set.reps,
          completed: true,
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
      // Create new activeWorkout reference to trigger MobX reactivity
      if (this.activeWorkout) {
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
      }
      this.saveDraft();
    });

    // Re-find the set after state update
    const updatedExercise = this.activeWorkout?.exercises.find((e) => e.id === workoutExerciseId);
    const updatedSet = updatedExercise?.sets.find((s) => s.id === setId);

    if (nextCompleted && updatedSet) {
      try {
        const dbSet = await workoutsService.addSet(workoutExerciseId, {
          id: setId,
          order: updatedSet.order,
          weight: updatedSet.weight,
          reps: updatedSet.reps,
          completed: true,
        });
        if (dbSet && dbSet.id !== setId) {
          runInAction(() => {
            const ex = this.activeWorkout?.exercises.find((e) => e.id === workoutExerciseId);
            const s = ex?.sets.find((item) => item.id === setId);
            if (s) s.id = dbSet.id;
            this.saveDraft();
          });
        }
      } catch (err) {
        console.error('[WorkoutStore] toggleSetComplete add DB error:', err);
      }
    } else {
      try {
        await workoutsService.removeSet(setId);
      } catch (err) {
        console.error('[WorkoutStore] toggleSetComplete remove DB error:', err);
      }
    }
  }

  async removeSet(workoutExerciseId: string, setId: string) {
    if (!this.activeWorkout) return;
    const exercise = this.activeWorkout.exercises.find((e) => e.id === workoutExerciseId);
    if (!exercise) return;

    runInAction(() => {
      exercise.sets = exercise.sets.filter((s) => s.id !== setId);
      exercise.sets.forEach((s, i) => {
        s.order = i + 1;
      });
      // Create new activeWorkout reference to trigger MobX reactivity
      if (this.activeWorkout) {
        this.activeWorkout = { ...this.activeWorkout, exercises: [...this.activeWorkout.exercises] };
      }
      this.saveDraft();
    });

    try {
      await workoutsService.removeSet(setId);
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
      this.saveRoutineTemplate();
    }
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