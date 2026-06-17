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
      { id: 'single-arm-dumbbell-bench-press', name: 'Single-Arm Dumbbell Bench Press', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
      { id: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', icon: '🏋️' },
      { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-incline-dumbbell-press', name: 'Single-Arm Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', icon: '💪' },
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
      { id: 'pendlay-row', name: 'Pendlay Row', muscleGroup: 'back', equipment: 'barbell', icon: '🏋️' },
      { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-t-bar-row', name: 'Barbell T-Bar Row', muscleGroup: 'back', equipment: 'barbell', icon: '🏋️' },
      { id: 'wide-grip-lat-pulldown', name: 'Wide-Grip Lat Pulldown', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'close-grip-lat-pulldown', name: 'Close-Grip Lat Pulldown', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'single-arm-lat-pulldown', name: 'Single-Arm Lat Pulldown', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'single-arm-seated-cable-row', name: 'Single-Arm Seated Cable Row', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'straight-arm-cable-pulldown', name: 'Straight-Arm Cable Pulldown', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'barbell-shrug', name: 'Barbell Shrug', muscleGroup: 'back', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-shrug', name: 'Dumbbell Shrug', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'chest-supported-dumbbell-shrug', name: 'Chest-Supported Dumbbell Shrug', muscleGroup: 'back', equipment: 'dumbbell', icon: '💪' },
      { id: 'cable-face-pull', name: 'Cable Face Pull', muscleGroup: 'back', equipment: 'cable', icon: '🔗' },
      { id: 'pull-up-chin-up', name: 'Pull-Up / Chin-Up', muscleGroup: 'back', equipment: 'bodyweight', icon: '🤸' },
      { id: 'inverted-row', name: 'Inverted Row', muscleGroup: 'back', equipment: 'bodyweight', icon: '🤸' },
      { id: 'hyperextension-back-extension', name: 'Hyperextension (Back Extension)', muscleGroup: 'back', equipment: 'bodyweight', icon: '🤸' },
    ],
  },
  {
    id: 'shoulders',
    name: 'Shoulders',
    icon: '🔝',
    exercises: [
      { id: 'standing-barbell-overhead-press', name: 'Standing Barbell Overhead Press (OHP)', muscleGroup: 'shoulders', equipment: 'barbell', icon: '🏋️' },
      { id: 'seated-barbell-overhead-press', name: 'Seated Barbell Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', icon: '🏋️' },
      { id: 'seated-dumbbell-shoulder-press', name: 'Seated Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-dumbbell-shoulder-press', name: 'Single-Arm Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-arm-leaning-lateral-raise', name: 'Single-Arm Leaning Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscleGroup: 'shoulders', equipment: 'cable', icon: '🔗' },
      { id: 'dumbbell-front-raise', name: 'Dumbbell Front Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-front-raise', name: 'Barbell Front Raise', muscleGroup: 'shoulders', equipment: 'barbell', icon: '🏋️' },
      { id: 'cable-front-raise', name: 'Cable Front Raise', muscleGroup: 'shoulders', equipment: 'cable', icon: '🔗' },
      { id: 'dumbbell-rear-delt-fly', name: 'Dumbbell Rear Delt Fly (Bent-Over)', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
      { id: 'seated-machine-rear-delt-fly', name: 'Seated Machine Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'machine', icon: '⚙️' },
      { id: 'barbell-upright-row', name: 'Barbell Upright Row', muscleGroup: 'shoulders', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-upright-row', name: 'Dumbbell Upright Row', muscleGroup: 'shoulders', equipment: 'dumbbell', icon: '💪' },
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
    id: 'quads',
    name: 'Legs: Quadriceps',
    icon: '🦵',
    exercises: [
      { id: 'barbell-back-squat', name: 'Barbell Back Squat', muscleGroup: 'quads', equipment: 'barbell', icon: '🏋️' },
      { id: 'barbell-front-squat', name: 'Barbell Front Squat', muscleGroup: 'quads', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-goblet-squat', name: 'Dumbbell Goblet Squat', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-bulgarian-split-squat', name: 'Barbell Bulgarian Split Squat', muscleGroup: 'quads', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-bulgarian-split-squat', name: 'Dumbbell Bulgarian Split Squat', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-walking-lunge', name: 'Barbell Walking Lunge', muscleGroup: 'quads', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-walking-lunge', name: 'Dumbbell Walking Lunge', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-reverse-lunge', name: 'Dumbbell Reverse Lunge', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'deficit-dumbbell-reverse-lunge', name: 'Deficit Dumbbell Reverse Lunge', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-step-up', name: 'Dumbbell Step-Up', muscleGroup: 'quads', equipment: 'dumbbell', icon: '💪' },
      { id: 'leg-press', name: 'Leg Press', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'single-leg-leg-press', name: 'Single-Leg Leg Press', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'hack-squat', name: 'Hack Squat', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
      { id: 'single-leg-leg-extension', name: 'Single-Leg Leg Extension', muscleGroup: 'quads', equipment: 'machine', icon: '⚙️' },
    ],
  },
  {
    id: 'hamstrings-glutes',
    name: 'Legs: Hamstrings & Glutes',
    icon: '🦵',
    exercises: [
      { id: 'barbell-romanian-deadlift', name: 'Barbell Romanian Deadlift (RDL)', muscleGroup: 'hamstrings', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift (RDL)', muscleGroup: 'hamstrings', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-leg-barbell-rdl', name: 'Single-Leg Barbell RDL', muscleGroup: 'hamstrings', equipment: 'barbell', icon: '🏋️' },
      { id: 'single-leg-dumbbell-rdl', name: 'Single-Leg Dumbbell RDL', muscleGroup: 'hamstrings', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-sumo-deadlift', name: 'Barbell Sumo Deadlift', muscleGroup: 'glutes', equipment: 'barbell', icon: '🏋️' },
      { id: 'barbell-hip-thrust', name: 'Barbell Hip Thrust', muscleGroup: 'glutes', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-hip-thrust', name: 'Dumbbell Hip Thrust', muscleGroup: 'glutes', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-leg-hip-thrust', name: 'Single-Leg Hip Thrust', muscleGroup: 'glutes', equipment: 'bodyweight', icon: '🤸' },
      { id: 'seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', icon: '⚙️' },
      { id: 'lying-leg-curl', name: 'Lying Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', icon: '⚙️' },
      { id: 'single-leg-lying-leg-curl', name: 'Single-Leg Lying Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', icon: '⚙️' },
      { id: 'cable-glute-kickback', name: 'Cable Glute Kickback', muscleGroup: 'glutes', equipment: 'cable', icon: '🔗' },
      { id: 'machine-hip-abduction', name: 'Machine Hip Abduction', muscleGroup: 'glutes', equipment: 'machine', icon: '⚙️' },
      { id: 'cable-hip-adduction', name: 'Cable Hip Adduction', muscleGroup: 'glutes', equipment: 'cable', icon: '🔗' },
    ],
  },
  {
    id: 'calves',
    name: 'Calves',
    icon: '🦵',
    exercises: [
      { id: 'barbell-standing-calf-raise', name: 'Barbell Standing Calf Raise', muscleGroup: 'calves', equipment: 'barbell', icon: '🏋️' },
      { id: 'dumbbell-standing-calf-raise', name: 'Dumbbell Standing Calf Raise', muscleGroup: 'calves', equipment: 'dumbbell', icon: '💪' },
      { id: 'single-leg-dumbbell-calf-raise', name: 'Single-Leg Dumbbell Calf Raise', muscleGroup: 'calves', equipment: 'dumbbell', icon: '💪' },
      { id: 'barbell-seated-calf-raise', name: 'Barbell Seated Calf Raise', muscleGroup: 'calves', equipment: 'barbell', icon: '🏋️' },
      { id: 'seated-calf-raise-machine', name: 'Seated Calf Raise Machine', muscleGroup: 'calves', equipment: 'machine', icon: '⚙️' },
      { id: 'calf-press-on-leg-press', name: 'Calf Press on Leg Press Machine', muscleGroup: 'calves', equipment: 'machine', icon: '⚙️' },
    ],
  },
  {
    id: 'core',
    name: 'Core (Abs & Obliques)',
    icon: '🧘',
    exercises: [
      { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'abs', equipment: 'bodyweight', icon: '🤸' },
      { id: 'hanging-knee-raise', name: 'Hanging Knee Raise', muscleGroup: 'abs', equipment: 'bodyweight', icon: '🤸' },
      { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', muscleGroup: 'abs', equipment: 'other', icon: '🎡' },
      { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'abs', equipment: 'cable', icon: '🔗' },
      { id: 'dumbbell-russian-twist', name: 'Dumbbell Russian Twist', muscleGroup: 'abs', equipment: 'dumbbell', icon: '💪' },
      { id: 'decline-bench-crunch', name: 'Decline Bench Crunch', muscleGroup: 'abs', equipment: 'bodyweight', icon: '🤸' },
      { id: 'weighted-decline-bench-crunch', name: 'Weighted Decline Bench Crunch', muscleGroup: 'abs', equipment: 'dumbbell', icon: '💪' },
      { id: 'dumbbell-side-bend', name: 'Dumbbell Side Bend', muscleGroup: 'abs', equipment: 'dumbbell', icon: '💪' },
      { id: 'cable-woodchopper', name: 'Cable Woodchopper', muscleGroup: 'abs', equipment: 'cable', icon: '🔗' },
      { id: 'standard-plank', name: 'Standard Plank', muscleGroup: 'abs', equipment: 'bodyweight', icon: '🤸' },
      { id: 'side-plank', name: 'Side Plank', muscleGroup: 'abs', equipment: 'bodyweight', icon: '🤸' },
      { id: 'captains-chair-knee-raise', name: "Captain's Chair Knee Raise", muscleGroup: 'abs', equipment: 'machine', icon: '⚙️' },
    ],
  },
];

export const getAllExercises = (): ExerciseItem[] => {
  return exerciseCategories.flatMap((cat) => cat.exercises);
};

export const searchExercises = (query: string): ExerciseItem[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return getAllExercises().filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.muscleGroup.toLowerCase().includes(q) ||
      e.equipment.toLowerCase().includes(q),
  );
};
