-- ============================================================================
-- FiTrack — Predefined Exercise Library (Seed Data) — v2
-- ----------------------------------------------------------------------------
-- Regenerated to match the full exercise list in src/utils/exerciseData.ts
-- (exerciseCategories). These are global/system exercises (user_id = NULL,
-- is_custom = false), readable by everyone, editable by no one.
--
-- The app resolves an exercise by `slug`, so slug values below match the
-- `id` field used in exerciseCategories exactly — do not change them.
--
-- Columns not present in the source TS data (description, secondary_muscles,
-- difficulty, instructions) are left at their schema defaults / null so no
-- exercise data is invented beyond what exerciseData.ts defines.
-- ============================================================================

insert into public.exercises
  (user_id, name, slug, muscle_group, equipment, is_custom)
values
-- ---------- CHEST ----------
  (null, 'Barbell Bench Press', 'barbell-bench-press', 'chest', 'barbell', false),
  (null, 'Dumbbell Bench Press', 'dumbbell-bench-press', 'chest', 'dumbbell', false),
  (null, 'Incline Barbell Bench Press', 'incline-barbell-bench-press', 'chest', 'barbell', false),
  (null, 'Incline Dumbbell Press', 'incline-dumbbell-press', 'chest', 'dumbbell', false),
  (null, 'Decline Barbell Bench Press', 'decline-barbell-bench-press', 'chest', 'barbell', false),
  (null, 'Decline Dumbbell Press', 'decline-dumbbell-press', 'chest', 'dumbbell', false),
  (null, 'Dumbbell Chest Fly', 'dumbbell-chest-fly', 'chest', 'dumbbell', false),
  (null, 'Incline Dumbbell Fly', 'incline-dumbbell-fly', 'chest', 'dumbbell', false),
  (null, 'Standing Cable Crossover', 'standing-cable-crossover', 'chest', 'cable', false),
  (null, 'Low-to-High Cable Fly', 'low-to-high-cable-fly', 'chest', 'cable', false),
  (null, 'Single-Arm Cable Chest Press', 'single-arm-cable-chest-press', 'chest', 'cable', false),
  (null, 'Chest Press Machine', 'chest-press-machine', 'chest', 'machine', false),
  (null, 'Pec Deck Fly', 'pec-deck-fly', 'chest', 'machine', false),
  (null, 'Bodyweight Push-Up', 'bodyweight-push-up', 'chest', 'bodyweight', false),
  (null, 'Deficit Push-Up', 'deficit-push-up', 'chest', 'bodyweight', false),
  (null, 'Chest Dip', 'chest-dip', 'chest', 'bodyweight', false),
-- ---------- BACK ----------
  (null, 'Conventional Barbell Deadlift', 'conventional-barbell-deadlift', 'back', 'barbell', false),
  (null, 'Barbell Bent-Over Row', 'barbell-bent-over-row', 'back', 'barbell', false),
  (null, 'One-Arm Dumbbell Row', 'one-arm-dumbbell-row', 'back', 'dumbbell', false),
  (null, 'Chest-Supported Dumbbell Row', 'chest-supported-dumbbell-row', 'back', 'dumbbell', false),
  (null, 'Barbell T-Bar Row', 'barbell-t-bar-row', 'back', 'barbell', false),
  (null, 'Lat Pulldown', 'lat-pulldown', 'back', 'cable', false),
  (null, 'Seated Cable Row', 'seated-cable-row', 'back', 'cable', false),
  (null, 'Single-Arm Seated Cable Row', 'single-arm-seated-cable-row', 'back', 'cable', false),
  (null, 'Straight-Arm Cable Pulldown', 'straight-arm-cable-pulldown', 'back', 'cable', false),
  (null, 'Barbell Shrug', 'barbell-shrug', 'back', 'barbell', false),
  (null, 'Dumbbell Shrug', 'dumbbell-shrug', 'back', 'dumbbell', false),
  (null, 'Chest-Supported Dumbbell Shrug', 'chest-supported-dumbbell-shrug', 'back', 'dumbbell', false),
  (null, 'Cable Face Pull', 'cable-face-pull', 'back', 'cable', false),
  (null, 'Pull-Up / Chin-Up', 'pull-up-chin-up', 'back', 'bodyweight', false),
  (null, 'Hyperextension (Back Extension)', 'hyperextension-back-extension', 'back', 'bodyweight', false),
-- ---------- SHOULDERS ----------
  (null, 'Overhead Press (OHP)', 'overhead-press', 'shoulders', 'barbell', false),
  (null, 'Seated Dumbbell Shoulder Press', 'seated-dumbbell-shoulder-press', 'shoulders', 'dumbbell', false),
  (null, 'Dumbbell Lateral Raise', 'dumbbell-lateral-raise', 'shoulders', 'dumbbell', false),
  (null, 'Cable Lateral Raise', 'cable-lateral-raise', 'shoulders', 'cable', false),
  (null, 'Front Raise', 'front-raise', 'shoulders', 'dumbbell', false),
  (null, 'Dumbbell Rear Delt Fly (Bent-Over)', 'dumbbell-rear-delt-fly', 'shoulders', 'dumbbell', false),
  (null, 'Upright Row', 'upright-row', 'shoulders', 'barbell', false),
-- ---------- BICEPS-FOREARMS ----------
  (null, 'Standing Barbell Curl', 'standing-barbell-curl', 'biceps', 'barbell', false),
  (null, 'Standing EZ-Bar Curl', 'standing-ez-bar-curl', 'biceps', 'barbell', false),
  (null, 'Standing Dumbbell Curl', 'standing-dumbbell-curl', 'biceps', 'dumbbell', false),
  (null, 'Alternating Dumbbell Curl', 'alternating-dumbbell-curl', 'biceps', 'dumbbell', false),
  (null, 'Single-Arm Dumbbell Preacher Curl', 'single-arm-dumbbell-preacher-curl', 'biceps', 'dumbbell', false),
  (null, 'Barbell Preacher Curl', 'barbell-preacher-curl', 'biceps', 'barbell', false),
  (null, 'Dumbbell Incline Curl', 'dumbbell-incline-curl', 'biceps', 'dumbbell', false),
  (null, 'Dumbbell Hammer Curl', 'dumbbell-hammer-curl', 'biceps', 'dumbbell', false),
  (null, 'Single-Arm Dumbbell Hammer Curl', 'single-arm-dumbbell-hammer-curl', 'biceps', 'dumbbell', false),
  (null, 'Dumbbell Concentration Curl', 'dumbbell-concentration-curl', 'biceps', 'dumbbell', false),
  (null, 'Cable Bicep Curl (Rope or Bar)', 'cable-bicep-curl', 'biceps', 'cable', false),
  (null, 'Single-Arm Cable Curl', 'single-arm-cable-curl', 'biceps', 'cable', false),
  (null, 'Barbell Reverse Curl', 'barbell-reverse-curl', 'forearms', 'barbell', false),
  (null, 'Dumbbell Reverse Curl', 'dumbbell-reverse-curl', 'forearms', 'dumbbell', false),
  (null, 'Seated Barbell Wrist Curl', 'seated-barbell-wrist-curl', 'forearms', 'barbell', false),
  (null, 'Seated Barbell Wrist Extension', 'seated-barbell-wrist-extension', 'forearms', 'barbell', false),
-- ---------- TRICEPS ----------
  (null, 'Close-Grip Barbell Bench Press', 'close-grip-barbell-bench-press', 'triceps', 'barbell', false),
  (null, 'Barbell Skull Crusher (Lying Extension)', 'barbell-skull-crusher', 'triceps', 'barbell', false),
  (null, 'Dumbbell Skull Crusher', 'dumbbell-skull-crusher', 'triceps', 'dumbbell', false),
  (null, 'Single-Arm Dumbbell Skull Crusher', 'single-arm-dumbbell-skull-crusher', 'triceps', 'dumbbell', false),
  (null, 'Overhead Dumbbell Triceps Extension', 'overhead-dumbbell-triceps-extension', 'triceps', 'dumbbell', false),
  (null, 'Single-Arm Overhead Dumbbell Extension', 'single-arm-overhead-dumbbell-extension', 'triceps', 'dumbbell', false),
  (null, 'Overhead Cable Triceps Extension', 'overhead-cable-triceps-extension', 'triceps', 'cable', false),
  (null, 'Cable Triceps Pushdown (Rope or Bar)', 'cable-triceps-pushdown', 'triceps', 'cable', false),
  (null, 'Single-Arm Cable Triceps Pushdown', 'single-arm-cable-triceps-pushdown', 'triceps', 'cable', false),
  (null, 'Dumbbell Triceps Kickback', 'dumbbell-triceps-kickback', 'triceps', 'dumbbell', false),
  (null, 'Single-Arm Cable Triceps Kickback', 'single-arm-cable-triceps-kickback', 'triceps', 'cable', false),
  (null, 'Triceps Bench Dip', 'triceps-bench-dip', 'triceps', 'bodyweight', false),
-- ---------- LEGS ----------
  (null, 'Barbell Back Squat', 'barbell-back-squat', 'quads', 'barbell', false),
  (null, 'Barbell Front Squat', 'barbell-front-squat', 'quads', 'barbell', false),
  (null, 'Dumbbell Goblet Squat', 'dumbbell-goblet-squat', 'quads', 'dumbbell', false),
  (null, 'Bulgarian Split Squat', 'bulgarian-split-squat', 'quads', 'dumbbell', false),
  (null, 'Lunges', 'lunges', 'quads', 'dumbbell', false),
  (null, 'Leg Press', 'leg-press', 'quads', 'machine', false),
  (null, 'Single-Leg Leg Press', 'single-leg-leg-press', 'quads', 'machine', false),
  (null, 'Hack Squat', 'hack-squat', 'quads', 'machine', false),
  (null, 'Leg Extension', 'leg-extension', 'quads', 'machine', false),
  (null, 'Single-Leg Leg Extension', 'single-leg-leg-extension', 'quads', 'machine', false),
  (null, 'Romanian Deadlift', 'romanian-deadlift', 'hamstrings', 'barbell', false),
  (null, 'Barbell Sumo Deadlift', 'barbell-sumo-deadlift', 'glutes', 'barbell', false),
  (null, 'Hip Thrust', 'hip-thrust', 'glutes', 'barbell', false),
  (null, 'Seated Leg Curl', 'seated-leg-curl', 'hamstrings', 'machine', false),
  (null, 'Lying Leg Curl', 'lying-leg-curl', 'hamstrings', 'machine', false),
  (null, 'Cable Glute Kickback', 'cable-glute-kickback', 'glutes', 'cable', false),
  (null, 'Machine Hip Abduction', 'machine-hip-abduction', 'glutes', 'machine', false),
  (null, 'Standing Calf Raise', 'standing-calf-raise', 'calves', 'dumbbell', false),
  (null, 'Seated Calf Raise', 'seated-calf-raise', 'calves', 'machine', false),
-- ---------- CORE ----------
  (null, 'Hanging Leg Raise', 'hanging-leg-raise', 'abs', 'bodyweight', false),
  (null, 'Ab Wheel Rollout', 'ab-wheel-rollout', 'abs', 'other', false),
  (null, 'Cable Crunch', 'cable-crunch', 'abs', 'cable', false),
  (null, 'Dumbbell Russian Twist', 'dumbbell-russian-twist', 'abs', 'dumbbell', false),
  (null, 'Weighted Decline Bench Crunch', 'weighted-decline-bench-crunch', 'abs', 'dumbbell', false)

on conflict (slug) where user_id is null do nothing;
