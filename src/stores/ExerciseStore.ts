import { makeAutoObservable, runInAction } from 'mobx';
import type { Exercise, MuscleGroup } from '../models';
import { exercisesService } from '../services/supabase/exercises';
import { storage } from '../utils/storage';
import { MUSCLE_GROUP_LABELS } from '../utils/constants';
import { generateId, generateUUID } from '../utils/helpers';

export class ExerciseStore {
  exercises: Map<string, Exercise> = new Map();
  predefinedExercises: Exercise[] = [];
  customExercises: Exercise[] = [];
  recentExercises: Exercise[] = [];
  searchResults: Exercise[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get exerciseList(): Exercise[] {
    return Array.from(this.exercises.values());
  }

  get predefinedList(): Exercise[] {
    return this.exerciseList.filter((e) => !e.isCustom);
  }

  get customList(): Exercise[] {
    return this.exerciseList.filter((e) => e.isCustom);
  }

  getExercisesByMuscleGroup(muscleGroup: MuscleGroup): Exercise[] {
    return this.exerciseList.filter((e) => e.muscleGroup === muscleGroup);
  }

  async loadExercises(userId?: string) {
    try {
      this.isLoading = true;
      const data = await exercisesService.getExercises(userId);
      runInAction(() => {
        this.exercises.clear();
        data.forEach((e) => this.exercises.set(e.id, e));
        this.predefinedExercises = data.filter((e) => !e.isCustom);
        this.customExercises = data.filter((e) => e.isCustom);
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

  async searchExercises(query: string, userId?: string) {
    if (!query.trim()) {
      runInAction(() => {
        this.searchResults = [];
      });
      return;
    }
    try {
      const data = await exercisesService.searchExercises(query, userId);
      runInAction(() => {
        this.searchResults = data;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message;
      });
    }
  }

  async createCustomExercise(exercise: Partial<Exercise>) {
    try {
      const data = await exercisesService.createExercise({
        ...exercise,
        id: generateUUID(),
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      runInAction(() => {
        this.exercises.set(data.id, data);
        this.customExercises.push(data);
      });
      return data;
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  async updateExercise(exerciseId: string, updates: Partial<Exercise>) {
    try {
      const data = await exercisesService.updateExercise(exerciseId, updates);
      runInAction(() => {
        const existing = this.exercises.get(exerciseId);
        if (existing) {
          this.exercises.set(exerciseId, data);
        }
      });
      return data;
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  async deleteExercise(exerciseId: string) {
    try {
      await exercisesService.deleteExercise(exerciseId);
      runInAction(() => {
        this.exercises.delete(exerciseId);
        this.customExercises = this.customExercises.filter((e) => e.id !== exerciseId);
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message;
      });
      throw error;
    }
  }

  addToRecent(exercise: Exercise) {
    runInAction(() => {
      this.recentExercises = [
        exercise,
        ...this.recentExercises.filter((e) => e.id !== exercise.id),
      ].slice(0, 10);
    });
  }

  clearSearch() {
    this.searchResults = [];
  }

  clearError() {
    this.error = null;
  }
}

export const exerciseStore = new ExerciseStore();