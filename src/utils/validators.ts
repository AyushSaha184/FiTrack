import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be 50 characters or less');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const weightEntrySchema = z.object({
  weight: z
    .number({ invalid_type_error: 'Weight must be a number' })
    .positive('Weight must be positive')
    .max(500, 'Weight seems too high'),
  bodyFatPercentage: z.number().min(0).max(100).optional(),
  date: z.date(),
  notes: z.string().max(500).optional(),
});

export const stepEntrySchema = z.object({
  steps: z.number().int().nonnegative().max(100000),
  date: z.date(),
});

export const workoutSchema = z.object({
  name: z.string().min(1, 'Workout name is required').max(100),
  type: z.enum([
    'push',
    'pull',
    'legs',
    'upper',
    'lower',
    'fullbody',
    'cardio',
    'rest',
    'custom',
  ]),
  dayOfWeek: z
    .enum([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ])
    .optional(),
});

export const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required').max(100),
  muscleGroup: z.string().min(1, 'Muscle group is required'),
  equipment: z.string().min(1, 'Equipment is required'),
  description: z.string().max(500).optional(),
});

export const profileUpdateSchema = z.object({
  name: nameSchema,
  age: z.number().int().min(13).max(120).optional(),
  height: z.number().positive().max(300).optional(),
  goalWeight: z.number().positive().max(500).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type WeightEntryInput = z.infer<typeof weightEntrySchema>;
export type StepEntryInput = z.infer<typeof stepEntrySchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
