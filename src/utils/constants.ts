import { addDays, differenceInDays, format, startOfWeek, subDays } from 'date-fns';
import type { DayOfWeek } from '../models';
import { CONFIG } from '../config/constants';

export { CONFIG };

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth.token',
  AUTH_USER: 'auth.user',
  THEME: 'settings.theme',
  UNITS: 'settings.units',
  ACTIVE_WORKOUT_ID: 'workout.active.id',
  ACTIVE_WORKOUT_DRAFT: 'workout.active.draft',
  ONBOARDING_COMPLETED: 'onboarding.completed',
  LAST_SELECTED_TAB: 'nav.lastTab',
  STEP_DAILY_GOAL: 'steps.dailyGoal',
  STEP_SOURCE: 'steps.source',
  NOTIFICATIONS: 'settings.notifications',
  WORKOUT_SETTINGS: 'settings.workout',
  FEATURE_FLAGS: 'settings.featureFlags',
  SYNC_QUEUE: 'sync.queue',
  RECORD_BUG_REPORTS: 'developer.bugReports',
  LAST_SYNC_AT: 'sync.lastAt',
} as const;

export const DAY_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_LABELS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  traps: 'Traps',
  lats: 'Lats',
  cardio: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  resistance_band: 'Resistance Band',
  other: 'Other',
};

export const WORKOUT_TYPE_LABELS: Record<string, string> = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Legs Day',
  upper: 'Upper Body',
  lower: 'Lower Body',
  fullbody: 'Full Body',
  cardio: 'Cardio',
  rest: 'Rest Day',
  custom: 'Custom',
};

export const APP_VERSION = CONFIG.APP_VERSION;
export const DEFAULT_STEP_GOAL = CONFIG.DEFAULT_STEP_GOAL;
export const DEFAULT_REST_TIME = CONFIG.DEFAULT_REST_TIME;
export const REST_TIMES = CONFIG.REST_TIMES;

export const getWeekDates = (date: Date = new Date()): Date[] => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
};

export const getDayOfWeekKey = (date: Date): DayOfWeek => {
  const keys: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return keys[date.getDay()];
};

export const daysBetween = (a: Date, b: Date): number => {
  return Math.abs(differenceInDays(a, b));
};

export const todayKey = (): string => format(new Date(), 'yyyy-MM-dd');
export const dateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
};

export const isValidUUID = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const getLast7Days = (): Date[] => {
  return Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
};
