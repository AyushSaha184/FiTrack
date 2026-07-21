import type { MuscleGroup, Equipment } from '../models';

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  icon: string;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  icon: string;
  exercises: ExerciseItem[];
}

export const exerciseCategories: ExerciseCategory[] = [
  {
    id: 'chest',
    name: 'Chest',
    icon: '🏋️',
    exercises: [
      { id: 'barbell-bench-press', name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
      { id: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', icon: '🏋️' },
      { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
      { id: 'decline-barbell-bench-press', name: 'Decline Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', icon: '🏋️' },
      { id: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-chest-fly', name: 'Dumbbell Chest Fly', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
      { id: 'incline-dumbbell-fly', name: 'Incline Dumbbell Fly', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
      { id: 'standing-cable-crossover', name: 'Standing Cable Crossover', muscleGroup: 'chest', equipment: 'cable', icon: '🔗' },
      { id: 'low-to-high-cable-fly', name: 'Low-to-High Cable Fly', muscleGroup: 'chest', equipment: 'cable', icon: '🔗' },
      { id: 'single-arm-cable-chest-press', name: 'Single-Arm Cable Chest Press', muscleGroup: 'chest', equipment: 'cable', icon: '🔗' },
      { id: 'chest-press-machine', name: 'Chest Press Machine', muscleGroup: 'chest', equipment: 'machine', icon: '⚙️' },
      { id: 'pec-deck-fly', name: 'Pec Deck Fly', muscleGroup: 'chest', equipment: 'machine', icon: '⚙️' },
      { id: 'bodyweight-push-up', name: 'Bodyweight Push-Up', muscleGroup: 'chest', equipment: 'bodyweight', icon: '🤸' },
      { id: 'deficit-push-up', name: 'Deficit Push-Up', muscleGroup: 'chest', equipment: 'bodyweight', icon: '🤸' },
      { id: 'chest-dip', name: 'Chest Dip', muscleGroup: 'chest', equipment: 'bodyweight', icon: '🤸' },
    ],
  },
  {
    id: 'back',
    name: 'Back',
    icon: '🔙',
    exercises: [
      { id: 'conventional-barbell-deadlift', name: 'Conventional Barbell Deadlift', muscleGroup: 'back', equipment: 'barbell', icon: '🏋️' },
      { id: 'barbell-bent-over-row', name: 'Barbell Bent-Over Row', muscleGroup: 'back', equipment: 'barbell', icon: '🏋️' },
      { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-t-bar-row', name: 'Barbell T-Bar Row', muscleGroup: 'back', equipment: 'barbell', icon: '🏋️' },
      { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'single-arm-seated-cable-row', name: 'Single-Arm Seated Cable Row', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'straight-arm-cable-pulldown', name: 'Straight-Arm Cable Pulldown', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'barbell-shrug', name: 'Barbell Shrug', muscleGroup: 'back', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-shrug', name: 'Dumbbell Shrug', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'chest-supported-dumbbell-shrug', name: 'Chest-Supported Dumbbell Shrug', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'cable-face-pull', name: 'Cable Face Pull', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'pull-up-chin-up', name: 'Pull-Up / Chin-Up', muscleGroup: 'back', equipment: 'bodyweight', icon: '🤸' },
      { id: 'hyperextension-back-extension', name: 'Hyperextension (Back Extension)', muscleGroup: 'back', equipment: 'bodyweight', icon: '🤸' },
    ],
  },
  {
    id: 'shoulders',
    name: 'Shoulders',
    icon: '🔝',
    exercises: [
      { id: 'overhead-press', name: 'Overhead Press (OHP)', muscleGroup: 'shoulders', equipment: 'barbell', icon: '🏋️' },
      { id: 'seated-dumbbell-shoulder-press', name: 'Seated Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscleGroup: 'shoulders', equipment: 'cable', icon: '🔗' },
      { id: 'front-raise', name: 'Front Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-rear-delt-fly', name: 'Dumbbell Rear Delt Fly (Bent-Over)', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'upright-row', name: 'Upright Row', muscleGroup: 'shoulders', equipment: 'barbell', icon: '🏋️' },
    ],
  },
  {
    id: 'biceps-forearms',
    name: 'Biceps & Forearms',
    icon: '💪',
    exercises: [
      { id: 'standing-barbell-curl', name: 'Standing Barbell Curl', muscleGroup: 'biceps', equipment: 'barbell', icon: '🏋️' },
      { id: 'standing-ez-bar-curl', name: 'Standing EZ-Bar Curl', muscleGroup: 'biceps', equipment: 'barbell', icon: '🏋️' },
      { id: 'standing-dumbbell-curl', name: 'Standing Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'alternating-dumbbell-curl', name: 'Alternating Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-dumbbell-preacher-curl', name: 'Single-Arm Dumbbell Preacher Curl', muscleGroup: 'biceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-preacher-curl', name: 'Barbell Preacher Curl', muscleGroup: 'biceps', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-incline-curl', name: 'Dumbbell Incline Curl', muscleGroup: 'biceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-hammer-curl', name: 'Dumbbell Hammer Curl', muscleGroup: 'biceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-dumbbell-hammer-curl', name: 'Single-Arm Dumbbell Hammer Curl', muscleGroup: 'biceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-concentration-curl', name: 'Dumbbell Concentration Curl', muscleGroup: 'biceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'cable-bicep-curl', name: 'Cable Bicep Curl (Rope or Bar)', muscleGroup: 'biceps', equipment: 'cable', icon: '🔗' },
      { id: 'single-arm-cable-curl', name: 'Single-Arm Cable Curl', muscleGroup: 'biceps', equipment: 'cable', icon: '🔗' },
      { id: 'barbell-reverse-curl', name: 'Barbell Reverse Curl', muscleGroup: 'forearms', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-reverse-curl', name: 'Dumbbell Reverse Curl', muscleGroup: 'forearms', equipment: 'dumbbell', icon: '💪' },
      { id: 'seated-barbell-wrist-curl', name: 'Seated Barbell Wrist Curl', muscleGroup: 'forearms', equipment: 'barbell', icon: '🏋️' },
      { id: 'seated-barbell-wrist-extension', name: 'Seated Barbell Wrist Extension', muscleGroup: 'forearms', equipment: 'barbell', icon: '🏋️' },
    ],
  },
  {
    id: 'triceps',
    name: 'Triceps',
    icon: '💪',
    exercises: [
      { id: 'close-grip-barbell-bench-press', name: 'Close-Grip Barbell Bench Press', muscleGroup: 'triceps', equipment: 'barbell', icon: '🏋️' },
      { id: 'barbell-skull-crusher', name: 'Barbell Skull Crusher (Lying Extension)', muscleGroup: 'triceps', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-skull-crusher', name: 'Dumbbell Skull Crusher', muscleGroup: 'triceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-dumbbell-skull-crusher', name: 'Single-Arm Dumbbell Skull Crusher', muscleGroup: 'triceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'overhead-dumbbell-triceps-extension', name: 'Overhead Dumbbell Triceps Extension', muscleGroup: 'triceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-overhead-dumbbell-extension', name: 'Single-Arm Overhead Dumbbell Extension', muscleGroup: 'triceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'overhead-cable-triceps-extension', name: 'Overhead Cable Triceps Extension', muscleGroup: 'triceps', equipment: 'cable', icon: '🔗' },
      { id: 'cable-triceps-pushdown', name: 'Cable Triceps Pushdown (Rope or Bar)', muscleGroup: 'triceps', equipment: 'cable', icon: '🔗' },
      { id: 'single-arm-cable-triceps-pushdown', name: 'Single-Arm Cable Triceps Pushdown', muscleGroup: 'triceps', equipment: 'cable', icon: '🔗' },
      { id: 'dumbbell-triceps-kickback', name: 'Dumbbell Triceps Kickback', muscleGroup: 'triceps', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-cable-triceps-kickback', name: 'Single-Arm Cable Triceps Kickback', muscleGroup: 'triceps', equipment: 'cable', icon: '🔗' },
      { id: 'triceps-bench-dip', name: 'Triceps Bench Dip', muscleGroup: 'triceps', equipment: 'bodyweight', icon: '🤸' },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    icon: '🦵',
    exercises: [
      { id: 'barbell-back-squat', name: 'Barbell Back Squat', muscleGroup: 'quads', equipment: 'barbell', icon: '🏋️' },
      { id: 'barbell-front-squat', name: 'Barbell Front Squat', muscleGroup: 'quads', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-goblet-squat', name: 'Dumbbell Goblet Squat', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'lunges', name: 'Lunges', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'leg-press', name: 'Leg Press', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'single-leg-leg-press', name: 'Single-Leg Leg Press', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'hack-squat', name: 'Hack Squat', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'single-leg-leg-extension', name: 'Single-Leg Leg Extension', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell', icon: '🏋️' },
      { id: 'barbell-sumo-deadlift', name: 'Barbell Sumo Deadlift', muscleGroup: 'glutes', equipment: 'barbell', icon: '🏋️' },
      { id: 'hip-thrust', name: 'Hip Thrust', muscleGroup: 'glutes', equipment: 'barbell', icon: '🏋️' },
      { id: 'seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', icon: '⚙️' },
      { id: 'lying-leg-curl', name: 'Lying Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', icon: '⚙️' },
      { id: 'cable-glute-kickback', name: 'Cable Glute Kickback', muscleGroup: 'glutes', equipment: 'cable', icon: '🔗' },
      { id: 'machine-hip-abduction', name: 'Machine Hip Abduction', muscleGroup: 'glutes', equipment: 'machine', icon: '⚙️' },
      { id: 'standing-calf-raise', name: 'Standing Calf Raise', muscleGroup: 'calves', equipment: 'dumbbell', icon: '💪' },
      { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'calves', equipment: 'machine', icon: '⚙️' },
    ],
  },
  {
    id: 'core',
    name: 'Core (Abs & Obliques)',
    icon: '🧘',
    exercises: [
      { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'abs', equipment: 'bodyweight', icon: '🤸' },
      { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', muscleGroup: 'abs', equipment: 'other', icon: '🎡' },
      { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'abs', equipment: 'cable', icon: '🔗' },
      { id: 'dumbbell-russian-twist', name: 'Dumbbell Russian Twist', muscleGroup: 'abs', equipment: 'dumbbell', icon: '💪' },
      { id: 'weighted-decline-bench-crunch', name: 'Weighted Decline Bench Crunch', muscleGroup: 'abs', equipment: 'dumbbell', icon: '💪' },
    ],
  },
];

export const getAllExercises = (): ExerciseItem[] => {
  return exerciseCategories.flatMap((cat) => cat.exercises);
};

// Helper function to calculate Levenshtein Distance for fuzzy matching
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1,     // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(dumble|dumbel|dumbell|dumbl)\b/g, 'dumbbell')
    .replace(/\b(barbel|barble)\b/g, 'barbell')
    .replace(/\b(bicep)\b/g, 'biceps')
    .replace(/\b(tricep)\b/g, 'triceps')
    .replace(/\b(sqat|sqats)\b/g, 'squat')
    .replace(/\b(pulup|pullup)\b/g, 'pull up')
    .replace(/\b(chinup)\b/g, 'chin up')
    .replace(/\b(benchpres)\b/g, 'bench press')
    .replace(/\b(quad|quads)\b/g, 'quads')
    .replace(/\b(hams|hamstring)\b/g, 'hamstrings')
    .trim();
};

export const searchExercises = (query: string): ExerciseItem[] => {
  const rawQuery = query.trim().toLowerCase();
  if (!rawQuery) return [];

  const normalizedQuery = normalizeText(rawQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const scoredExercises = getAllExercises().map((exercise) => {
    const rawName = exercise.name.toLowerCase();
    const normalizedName = normalizeText(exercise.name);
    const normalizedMuscle = normalizeText(exercise.muscleGroup);
    const normalizedEquipment = normalizeText(exercise.equipment);
    const nameTokens = normalizedName.split(/\s+/);

    let score = 0;

    // 1. Direct raw substring match
    if (rawName.includes(rawQuery)) score += 100;
    if (normalizedName.includes(normalizedQuery)) score += 80;
    if (normalizedMuscle.includes(normalizedQuery)) score += 50;
    if (normalizedEquipment.includes(normalizedQuery)) score += 40;

    // 2. Token level matching (exact, prefix, and fuzzy)
    for (const qToken of queryTokens) {
      let tokenMatched = false;
      for (const nToken of nameTokens) {
        if (nToken === qToken) {
          score += 30;
          tokenMatched = true;
          break;
        }
        if (nToken.startsWith(qToken)) {
          score += 20;
          tokenMatched = true;
          break;
        }
        // Fuzzy Levenshtein check for typos (for words longer than 3 characters)
        if (qToken.length >= 3 && nToken.length >= 3) {
          const dist = levenshteinDistance(qToken, nToken);
          const maxAllowedDist = qToken.length > 5 ? 2 : 1;
          if (dist <= maxAllowedDist) {
            score += 15 - dist * 3;
            tokenMatched = true;
            break;
          }
        }
      }

      if (!tokenMatched) {
        // Also check against muscle group and equipment
        if (normalizedMuscle.includes(qToken)) score += 10;
        if (normalizedEquipment.includes(qToken)) score += 10;
      }
    }

    return { exercise, score };
  });

  return scoredExercises
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.exercise);
};
