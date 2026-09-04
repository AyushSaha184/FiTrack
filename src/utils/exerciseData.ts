import type { MuscleGroup, Equipment } from '../models';
import { storage } from './storage';

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  icon: string;
  isCustom?: boolean;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  icon: string;
  exercises: ExerciseItem[];
}

export const getCustomExercises = (): ExerciseItem[] => {
  return storage.get<ExerciseItem[]>('workout.custom_exercises') || [];
};

export const saveCustomExercise = (item: {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}): ExerciseItem => {
  const current = getCustomExercises();
  const newItem: ExerciseItem = {
    id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: item.name,
    muscleGroup: item.muscleGroup,
    equipment: item.equipment,
    icon: '✨',
    isCustom: true,
  };
  const updated = [newItem, ...current];
  storage.set('workout.custom_exercises', updated);
  // Invalidate the cached search index so the new exercise becomes searchable
  // on the next query without restarting the app.
  invalidateSearchIndex();
  return newItem;
};

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

export const getExerciseCategories = (): ExerciseCategory[] => {
  const custom = getCustomExercises();
  const customCategory: ExerciseCategory = {
    id: 'custom',
    name: 'Custom',
    icon: '✨',
    exercises: custom,
  };
  return [...exerciseCategories, customCategory];
};

export const getAllExercises = (): ExerciseItem[] => {
  const custom = getCustomExercises();
  return [...custom, ...exerciseCategories.flatMap((cat) => cat.exercises)];
};

// ---------------------------------------------------------------------------
// Search index
// ---------------------------------------------------------------------------
//
// We precompute a normalized/tokenized form of every exercise once at module
// load (and on custom-exercise insertion) and reuse it for every keystroke.
// `searchExercises` then becomes a lightweight map+filter+sort over the
// precomputed records — no per-keystroke regex normalization or tokenization.

interface IndexedExercise {
  exercise: ExerciseItem;
  rawNameLower: string;
  normalizedName: string;
  nameTokens: string[];
  normalizedMuscle: string;
  normalizedEquipment: string;
}

const tokenize = (s: string): string[] => s.split(/\s+/).filter(Boolean);

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

let searchIndex: IndexedExercise[] | null = null;

const buildIndex = (): IndexedExercise[] => {
  return getAllExercises().map((exercise) => {
    const rawNameLower = exercise.name.toLowerCase();
    const normalizedName = normalizeText(exercise.name);
    return {
      exercise,
      rawNameLower,
      normalizedName,
      nameTokens: tokenize(normalizedName),
      normalizedMuscle: normalizeText(exercise.muscleGroup),
      normalizedEquipment: normalizeText(exercise.equipment),
    };
  });
};

const getSearchIndex = (): IndexedExercise[] => {
  if (searchIndex == null) {
    searchIndex = buildIndex();
  }
  return searchIndex;
};

const invalidateSearchIndex = (): void => {
  searchIndex = null;
};

// Test-only escape hatch: if the index is set to a non-null array (even an
// empty one) the builder will not run, so tests can supply a canned fixture
// without the production builder hitting MMKV.
export const __setSearchIndexForTests = (index: IndexedExercise[] | null): void => {
  if (index === null) {
    invalidateSearchIndex();
  } else {
    searchIndex = index;
  }
};

// Bumped whenever the scoring algorithm changes in an incompatible way.
const SEARCH_INDEX_VERSION = 2;

let searchIndexVersion = 0;
if (searchIndexVersion !== SEARCH_INDEX_VERSION) {
  searchIndex = null;
  searchIndexVersion = SEARCH_INDEX_VERSION;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
//
// Weights are deliberately gapped: an exact substring match on the raw name
// (100) is far above any fuzzy/typo match (~9–12). This prevents noisy
// short-token fuzzy matches (e.g. "leg" matching "hip") from outranking
// genuine exact hits.

const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use a single rolling row to keep memory O(min(a,b)).
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;

  let prev = new Array<number>(shorter.length + 1);
  let curr = new Array<number>(shorter.length + 1);
  for (let j = 0; j <= shorter.length; j++) prev[j] = j;

  for (let i = 1; i <= longer.length; i++) {
    curr[0] = i;
    const li = longer.charCodeAt(i - 1);
    for (let j = 1; j <= shorter.length; j++) {
      const cost = li === shorter.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[shorter.length];
};

const FUZZY_MIN_TOKEN_LENGTH = 4;
const FUZZY_BASE_WEIGHT = 12; // max weight at dist=0 (which is impossible since prefix/exact are caught first)

interface ScoredExercise {
  exercise: ExerciseItem;
  score: number;
  /** Lower is better; used as a tie-breaker. */
  matchPosition: number;
}

export const searchExercises = (query: string): ExerciseItem[] => {
  const rawQuery = query.trim();
  if (!rawQuery) return [];

  const rawQueryLower = rawQuery.toLowerCase();
  const normalizedQuery = normalizeText(rawQuery);
  if (!normalizedQuery) return [];

  const queryTokens = tokenize(normalizedQuery);
  const index = getSearchIndex();

  const scored: ScoredExercise[] = [];

  for (const item of index) {
    let score = 0;
    let matchPosition = Number.MAX_SAFE_INTEGER;

    // 1. Direct substring matches (these are the strongest signals).
    const rawIdx = item.rawNameLower.indexOf(rawQueryLower);
    if (rawIdx !== -1) {
      score += 100;
      if (rawIdx < matchPosition) matchPosition = rawIdx;
    }
    const normIdx = item.normalizedName.indexOf(normalizedQuery);
    if (normIdx !== -1) {
      score += 80;
      if (normIdx < matchPosition) matchPosition = normIdx;
    }
    if (item.normalizedMuscle.includes(normalizedQuery)) score += 50;
    if (item.normalizedEquipment.includes(normalizedQuery)) score += 40;

    // 2. Per-token matching.
    for (const qToken of queryTokens) {
      let tokenMatched = false;
      for (const nToken of item.nameTokens) {
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
        if (
          qToken.length >= FUZZY_MIN_TOKEN_LENGTH &&
          nToken.length >= FUZZY_MIN_TOKEN_LENGTH
        ) {
          const dist = levenshteinDistance(qToken, nToken);
          const maxAllowedDist = qToken.length > 6 ? 2 : 1;
          if (dist > 0 && dist <= maxAllowedDist) {
            // Short tokens pay an extra penalty so a typo on a 4-letter
            // word doesn't outrank a real exact match elsewhere.
            const lengthPenalty = qToken.length < 5 ? 3 : 0;
            score += Math.max(1, FUZZY_BASE_WEIGHT - dist * 4 - lengthPenalty);
            tokenMatched = true;
            break;
          }
        }
      }

      if (!tokenMatched) {
        if (item.normalizedMuscle.includes(qToken)) score += 10;
        if (item.normalizedEquipment.includes(qToken)) score += 10;
      }
    }

    if (score > 0) {
      scored.push({ exercise: item.exercise, score, matchPosition });
    }
  }

  // Primary sort: score desc. Tie-breakers: earlier substring position wins,
  // then alphabetical. This keeps ranking stable and predictable.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.matchPosition !== b.matchPosition) return a.matchPosition - b.matchPosition;
    return a.exercise.name.localeCompare(b.exercise.name);
  });

  return scored.map((s) => s.exercise);
};

// Test-only helper: re-export buildIndex version so tests can verify behavior.
export const __searchInternals = {
  invalidateSearchIndex,
  getSearchIndex,
  normalizeText,
  levenshteinDistance,
};
