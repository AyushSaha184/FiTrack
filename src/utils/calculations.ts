export const calculate1RM = (
  weight: number,
  reps: number,
  formula: 'epley' | 'brzycki' | 'lombardi' = 'epley',
): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 1.05;
  switch (formula) {
    case 'epley':
      return weight * (1 + reps / 30);
    case 'brzycki':
      return weight * (36 / (37 - reps));
    case 'lombardi':
      return weight * Math.pow(reps, 0.1);
    default:
      return weight * (1 + reps / 30);
  }
};

export const calculatePercentageWeight = (
  oneRM: number,
  percentage: number,
): number => {
  return Math.round(oneRM * (percentage / 100) * 2) / 2;
};

export const calculateVolume = (
  sets: Array<{ weight: number; reps: number; completed?: boolean }>,
): number => {
  return sets.reduce(
    (total, set) => (set.completed !== false ? total + set.weight * set.reps : total),
    0,
  );
};

export const calculateBMR = (
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female',
): number => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
};

export const calculateTDEE = (bmr: number, activityLevel: number): number => {
  return Math.round(bmr * activityLevel);
};

export const calculateBMI = (weightKg: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return weightKg / Math.pow(heightM, 2);
};

export const calculateCaloriesBurned = (
  weightKg: number,
  durationMinutes: number,
  met: number,
): number => {
  return Math.round((met * weightKg * durationMinutes) / 60);
};

export const calculate1RMProgress = (
  current: number,
  previous: number,
): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const convertWeight = (
  value: number,
  from: 'kg' | 'lbs',
  to: 'kg' | 'lbs',
): number => {
  if (from === to) return value;
  if (from === 'kg' && to === 'lbs') return value * 2.20462;
  return value / 2.20462;
};

export const convertHeight = (
  value: number,
  from: 'cm' | 'ft',
  to: 'cm' | 'ft',
): number => {
  if (from === to) return value;
  if (from === 'cm' && to === 'ft') return value / 30.48;
  return value * 30.48;
};

export const convertTemperature = (
  value: number,
  from: 'celsius' | 'fahrenheit',
  to: 'celsius' | 'fahrenheit',
): number => {
  if (from === to) return value;
  if (from === 'celsius' && to === 'fahrenheit') return (value * 9) / 5 + 32;
  return ((value - 32) * 5) / 9;
};

export const stepsToCalories = (steps: number, weightKg = 70): number => {
  return Math.round((steps * 0.04 * weightKg) / 60);
};

export const stepsToDistance = (steps: number, heightCm = 175): number => {
  const strideMeters = heightCm * 0.415;
  return Math.round((steps * strideMeters) / 1000);
};

export const formatNumber = (value: number, decimals = 1): string => {
  return value.toFixed(decimals);
};
