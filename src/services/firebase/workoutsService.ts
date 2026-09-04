import firestore from '@react-native-firebase/firestore';
import { collections } from './firestore';
import type { Workout, WorkoutExercise } from '../../models';
import { logger } from '../../utils/logger';

export const workoutsService = {
  async getWorkouts(userId: string, startDate?: string, endDate?: string): Promise<Workout[]> {
    try {
      let query: any = collections.workouts(userId).orderBy('date', 'desc');

      if (startDate && endDate) {
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
      }

      // Hard cap to avoid downloading the entire collection on cold start.
      const snapshot = await query.limit(100).get();
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || userId,
          name: data.name || 'Workout',
          type: data.type || 'custom',
          date: data.date ? new Date(data.date) : new Date(),
          startTime: data.startTime ? new Date(data.startTime) : undefined,
          endTime: data.endTime ? new Date(data.endTime) : undefined,
          duration: data.duration,
          totalVolume: data.totalVolume || 0,
          completed: data.completed ?? false,
          exercises: data.exercises || [],
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        } as Workout;
      });
    } catch (err) {
      logger.error('[workoutsService] getWorkouts error:', err);
      throw err;
    }
  },

  /**
   * Subscribe to live workout updates for a user. The callback receives the
   * (capped) workout list on every Firestore change. The returned function
   * unsubscribes the listener.
   */
  subscribeWorkouts(
    userId: string,
    callback: (workouts: Workout[]) => void,
    startDate?: string,
    endDate?: string,
  ): () => void {
    try {
      let query: any = collections.workouts(userId).orderBy('date', 'desc');
      if (startDate && endDate) {
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
      }
      query = query.limit(100);
      return query.onSnapshot((snapshot: any) => {
        const workouts: Workout[] = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || userId,
            name: data.name || 'Workout',
            type: data.type || 'custom',
            date: data.date ? new Date(data.date) : new Date(),
            startTime: data.startTime ? new Date(data.startTime) : undefined,
            endTime: data.endTime ? new Date(data.endTime) : undefined,
            duration: data.duration,
            totalVolume: data.totalVolume || 0,
            completed: data.completed ?? false,
            exercises: data.exercises || [],
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
          } as Workout;
        });
        callback(workouts);
      }, (err: any) => {
        logger.error('[workoutsService] subscribeWorkouts error:', err);
      });
    } catch (err) {
      logger.error('[workoutsService] subscribeWorkouts init error:', err);
      return () => {};
    }
  },

  async getWorkout(userId: string, workoutId: string): Promise<Workout | null> {
    try {
      const doc = await collections.workoutDoc(userId, workoutId).get();
      if (!doc.exists) return null;
      const data = doc.data();
      if (!data) return null;
      return {
        id: doc.id,
        userId: data.userId || userId,
        name: data.name || 'Workout',
        type: data.type || 'custom',
        date: data.date ? new Date(data.date) : new Date(),
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        duration: data.duration,
        totalVolume: data.totalVolume || 0,
        completed: data.completed ?? false,
        exercises: data.exercises || [],
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      } as Workout;
    } catch (err) {
      logger.error('[workoutsService] getWorkout error:', err);
      throw err;
    }
  },

  async createWorkout(userId: string, workout: Partial<Workout> & { id: string }) {
    try {
      const workoutRef = collections.workoutDoc(userId, workout.id);
      const payload: Record<string, any> = {
        userId,
        name: workout.name || 'Custom Workout',
        type: workout.type || 'custom',
        date: workout.date ? (workout.date instanceof Date ? workout.date.toISOString() : workout.date) : new Date().toISOString(),
        startTime: workout.startTime ? (workout.startTime instanceof Date ? workout.startTime.toISOString() : workout.startTime) : new Date().toISOString(),
        completed: workout.completed ?? false,
        totalVolume: workout.totalVolume || 0,
        exercises: workout.exercises || [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await workoutRef.set(payload, { merge: true });
      return { id: workout.id, ...payload };
    } catch (err) {
      logger.error('[workoutsService] createWorkout error:', err);
      throw err;
    }
  },

  async updateWorkout(userId: string, workoutId: string, updates: Partial<Workout>) {
    try {
      const workoutRef = collections.workoutDoc(userId, workoutId);
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      if (updates.date instanceof Date) {
        payload.date = updates.date.toISOString();
      }
      if (updates.startTime instanceof Date) {
        payload.startTime = updates.startTime.toISOString();
      }
      if (updates.endTime instanceof Date) {
        payload.endTime = updates.endTime.toISOString();
      }

      await workoutRef.set(payload, { merge: true });
    } catch (err) {
      logger.error('[workoutsService] updateWorkout error:', err);
      throw err;
    }
  },

  async deleteWorkout(userId: string, workoutId: string) {
    try {
      await collections.workoutDoc(userId, workoutId).delete();
    } catch (err) {
      logger.error('[workoutsService] deleteWorkout error:', err);
      throw err;
    }
  },

  async saveWorkoutExercises(userId: string, workoutId: string, exercises: WorkoutExercise[]) {
    try {
      await collections.workoutDoc(userId, workoutId).set(
        {
          exercises,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      logger.error('[workoutsService] saveWorkoutExercises error:', err);
      throw err;
    }
  },

  async completeWorkout(userId: string, workoutId: string, duration: number, totalVolume: number) {
    try {
      await collections.workoutDoc(userId, workoutId).set(
        {
          completed: true,
          endTime: new Date().toISOString(),
          duration,
          totalVolume,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      logger.error('[workoutsService] completeWorkout error:', err);
      throw err;
    }
  },
};
