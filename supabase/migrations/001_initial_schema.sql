-- FiTrack Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"units":{"weight":"kg","height":"cm","temperature":"celsius"},"theme":"dark","notifications":{"workoutReminders":true,"weightLogReminders":true,"stepGoalReminders":true,"streakNotifications":true,"achievementNotifications":true,"restTimerSound":true,"restTimerVibration":true},"workout":{"defaultRestTime":90,"autoStartRestTimer":false,"keepScreenAwake":true,"autoSave":true,"defaultUnits":{"weight":"kg","height":"cm","temperature":"celsius"}}}'::jsonb,
  profile JSONB DEFAULT '{"fitnessLevel":"beginner"}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment TEXT DEFAULT 'other',
  difficulty TEXT DEFAULT 'intermediate',
  instructions TEXT[] DEFAULT '{}',
  video_url TEXT,
  is_custom BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ,
  total_times_performed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  day_of_week TEXT,
  date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration INTEGER,
  notes TEXT,
  completed BOOLEAN DEFAULT false,
  total_volume DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout exercises (join table)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sets table
CREATE TABLE IF NOT EXISTS sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID REFERENCES workout_exercises(id) ON DELETE CASCADE NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  weight DECIMAL(6,2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe INTEGER,
  completed BOOLEAN DEFAULT false,
  rest_time INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weight entries table
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  body_fat_percentage DECIMAL(4,2),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps table
CREATE TABLE IF NOT EXISTS steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  calories_burned INTEGER,
  distance DECIMAL(8,2),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Body measurements table
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  chest DECIMAL(5,2),
  arms DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  thighs DECIMAL(5,2),
  calves DECIMAL(5,2),
  neck DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  UNIQUE(user_id, type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise ON sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_steps_user_date ON steps(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for exercises
CREATE POLICY "Users can view own and public exercises" ON exercises
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises" ON exercises
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workouts
CREATE POLICY "Users can view own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workout_exercises
CREATE POLICY "Users can manage own workout exercises" ON workout_exercises
  FOR ALL USING (
    workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid())
  );

-- RLS Policies for sets
CREATE POLICY "Users can manage own sets" ON sets
  FOR ALL USING (
    workout_exercise_id IN (
      SELECT we.id FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = auth.uid()
    )
  );

-- RLS Policies for weight_entries
CREATE POLICY "Users can view own weight entries" ON weight_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries" ON weight_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries" ON weight_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries" ON weight_entries
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for steps
CREATE POLICY "Users can view own steps" ON steps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own steps" ON steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own steps" ON steps
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own steps" ON steps
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for body_measurements
CREATE POLICY "Users can manage own body measurements" ON body_measurements
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Users can manage own achievements" ON achievements
  FOR ALL USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sets_updated_at
  BEFORE UPDATE ON sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weight_entries_updated_at
  BEFORE UPDATE ON weight_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_steps_updated_at
  BEFORE UPDATE ON steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some predefined exercises
INSERT INTO exercises (name, muscle_group, equipment, is_custom) VALUES
  ('Barbell Bench Press', 'chest', 'barbell', false),
  ('Dumbbell Bench Press', 'chest', 'dumbbell', false),
  ('Single-Arm Dumbbell Bench Press', 'chest', 'dumbbell', false),
  ('Incline Barbell Bench Press', 'chest', 'barbell', false),
  ('Incline Dumbbell Press', 'chest', 'dumbbell', false),
  ('Single-Arm Incline Dumbbell Press', 'chest', 'dumbbell', false),
  ('Decline Barbell Bench Press', 'chest', 'barbell', false),
  ('Decline Dumbbell Press', 'chest', 'dumbbell', false),
  ('Dumbbell Chest Fly', 'chest', 'dumbbell', false),
  ('Incline Dumbbell Fly', 'chest', 'dumbbell', false),
  ('Standing Cable Crossover', 'chest', 'cable', false),
  ('Low-to-High Cable Fly', 'chest', 'cable', false),
  ('Single-Arm Cable Chest Press', 'chest', 'cable', false),
  ('Chest Press Machine', 'chest', 'machine', false),
  ('Pec Deck Fly', 'chest', 'machine', false),
  ('Bodyweight Push-Up', 'chest', 'bodyweight', false),
  ('Deficit Push-Up', 'chest', 'bodyweight', false),
  ('Chest Dip', 'chest', 'bodyweight', false),
  ('Conventional Barbell Deadlift', 'back', 'barbell', false),
  ('Barbell Bent-Over Row', 'back', 'barbell', false),
  ('Pendlay Row', 'back', 'barbell', false),
  ('One-Arm Dumbbell Row', 'back', 'dumbbell', false),
  ('Chest-Supported Dumbbell Row', 'back', 'dumbbell', false),
  ('Barbell T-Bar Row', 'back', 'barbell', false),
  ('Wide-Grip Lat Pulldown', 'back', 'cable', false),
  ('Close-Grip Lat Pulldown', 'back', 'cable', false),
  ('Single-Arm Lat Pulldown', 'back', 'cable', false),
  ('Seated Cable Row', 'back', 'cable', false),
  ('Single-Arm Seated Cable Row', 'back', 'cable', false),
  ('Straight-Arm Cable Pulldown', 'back', 'cable', false),
  ('Barbell Shrug', 'back', 'barbell', false),
  ('Dumbbell Shrug', 'back', 'dumbbell', false),
  ('Chest-Supported Dumbbell Shrug', 'back', 'dumbbell', false),
  ('Cable Face Pull', 'back', 'cable', false),
  ('Pull-Up / Chin-Up', 'back', 'bodyweight', false),
  ('Inverted Row', 'back', 'bodyweight', false),
  ('Hyperextension (Back Extension)', 'back', 'bodyweight', false),
  ('Standing Barbell Overhead Press (OHP)', 'shoulders', 'barbell', false),
  ('Seated Barbell Overhead Press', 'shoulders', 'barbell', false),
  ('Seated Dumbbell Shoulder Press', 'shoulders', 'dumbbell', false),
  ('Single-Arm Dumbbell Shoulder Press', 'shoulders', 'dumbbell', false),
  ('Arnold Press', 'shoulders', 'dumbbell', false),
  ('Dumbbell Lateral Raise', 'shoulders', 'dumbbell', false),
  ('Single-Arm Leaning Lateral Raise', 'shoulders', 'dumbbell', false),
  ('Cable Lateral Raise', 'shoulders', 'cable', false),
  ('Dumbbell Front Raise', 'shoulders', 'dumbbell', false),
  ('Barbell Front Raise', 'shoulders', 'barbell', false),
  ('Cable Front Raise', 'shoulders', 'cable', false),
  ('Dumbbell Rear Delt Fly (Bent-Over)', 'shoulders', 'dumbbell', false),
  ('Seated Machine Rear Delt Fly', 'shoulders', 'machine', false),
  ('Barbell Upright Row', 'shoulders', 'barbell', false),
  ('Dumbbell Upright Row', 'shoulders', 'dumbbell', false),
  ('Standing Barbell Curl', 'biceps', 'barbell', false),
  ('Standing EZ-Bar Curl', 'biceps', 'barbell', false),
  ('Standing Dumbbell Curl', 'biceps', 'dumbbell', false),
  ('Alternating Dumbbell Curl', 'biceps', 'dumbbell', false),
  ('Single-Arm Dumbbell Preacher Curl', 'biceps', 'dumbbell', false),
  ('Barbell Preacher Curl', 'biceps', 'barbell', false),
  ('Dumbbell Incline Curl', 'biceps', 'dumbbell', false),
  ('Dumbbell Hammer Curl', 'biceps', 'dumbbell', false),
  ('Single-Arm Dumbbell Hammer Curl', 'biceps', 'dumbbell', false),
  ('Dumbbell Concentration Curl', 'biceps', 'dumbbell', false),
  ('Cable Bicep Curl (Rope or Bar)', 'biceps', 'cable', false),
  ('Single-Arm Cable Curl', 'biceps', 'cable', false),
  ('Barbell Reverse Curl', 'forearms', 'barbell', false),
  ('Dumbbell Reverse Curl', 'forearms', 'dumbbell', false),
  ('Seated Barbell Wrist Curl', 'forearms', 'barbell', false),
  ('Seated Barbell Wrist Extension', 'forearms', 'barbell', false),
  ('Close-Grip Barbell Bench Press', 'triceps', 'barbell', false),
  ('Barbell Skull Crusher (Lying Extension)', 'triceps', 'barbell', false),
  ('Dumbbell Skull Crusher', 'triceps', 'dumbbell', false),
  ('Single-Arm Dumbbell Skull Crusher', 'triceps', 'dumbbell', false),
  ('Overhead Dumbbell Triceps Extension', 'triceps', 'dumbbell', false),
  ('Single-Arm Overhead Dumbbell Extension', 'triceps', 'dumbbell', false),
  ('Overhead Cable Triceps Extension', 'triceps', 'cable', false),
  ('Cable Triceps Pushdown (Rope or Bar)', 'triceps', 'cable', false),
  ('Single-Arm Cable Triceps Pushdown', 'triceps', 'cable', false),
  ('Dumbbell Triceps Kickback', 'triceps', 'dumbbell', false),
  ('Single-Arm Cable Triceps Kickback', 'triceps', 'cable', false),
  ('Triceps Bench Dip', 'triceps', 'bodyweight', false),
  ('Barbell Back Squat', 'quads', 'barbell', false),
  ('Barbell Front Squat', 'quads', 'barbell', false),
  ('Dumbbell Goblet Squat', 'quads', 'dumbbell', false),
  ('Barbell Bulgarian Split Squat', 'quads', 'barbell', false),
  ('Dumbbell Bulgarian Split Squat', 'quads', 'dumbbell', false),
  ('Barbell Walking Lunge', 'quads', 'barbell', false),
  ('Dumbbell Walking Lunge', 'quads', 'dumbbell', false),
  ('Dumbbell Reverse Lunge', 'quads', 'dumbbell', false),
  ('Deficit Dumbbell Reverse Lunge', 'quads', 'dumbbell', false),
  ('Dumbbell Step-Up', 'quads', 'dumbbell', false),
  ('Leg Press', 'quads', 'machine', false),
  ('Single-Leg Leg Press', 'quads', 'machine', false),
  ('Hack Squat', 'quads', 'machine', false),
  ('Leg Extension', 'quads', 'machine', false),
  ('Single-Leg Leg Extension', 'quads', 'machine', false),
  ('Barbell Romanian Deadlift (RDL)', 'hamstrings', 'barbell', false),
  ('Dumbbell Romanian Deadlift (RDL)', 'hamstrings', 'dumbbell', false),
  ('Single-Leg Barbell RDL', 'hamstrings', 'barbell', false),
  ('Single-Leg Dumbbell RDL', 'hamstrings', 'dumbbell', false),
  ('Barbell Sumo Deadlift', 'glutes', 'barbell', false),
  ('Barbell Hip Thrust', 'glutes', 'barbell', false),
  ('Dumbbell Hip Thrust', 'glutes', 'dumbbell', false),
  ('Single-Leg Hip Thrust', 'glutes', 'bodyweight', false),
  ('Seated Leg Curl', 'hamstrings', 'machine', false),
  ('Lying Leg Curl', 'hamstrings', 'machine', false),
  ('Single-Leg Lying Leg Curl', 'hamstrings', 'machine', false),
  ('Cable Glute Kickback', 'glutes', 'cable', false),
  ('Machine Hip Abduction', 'glutes', 'machine', false),
  ('Cable Hip Adduction', 'glutes', 'cable', false),
  ('Barbell Standing Calf Raise', 'calves', 'barbell', false),
  ('Dumbbell Standing Calf Raise', 'calves', 'dumbbell', false),
  ('Single-Leg Dumbbell Calf Raise', 'calves', 'dumbbell', false),
  ('Barbell Seated Calf Raise', 'calves', 'barbell', false),
  ('Seated Calf Raise Machine', 'calves', 'machine', false),
  ('Calf Press on Leg Press Machine', 'calves', 'machine', false),
  ('Hanging Leg Raise', 'abs', 'bodyweight', false),
  ('Hanging Knee Raise', 'abs', 'bodyweight', false),
  ('Ab Wheel Rollout', 'abs', 'other', false),
  ('Cable Crunch', 'abs', 'cable', false),
  ('Dumbbell Russian Twist', 'abs', 'dumbbell', false),
  ('Decline Bench Crunch', 'abs', 'bodyweight', false),
  ('Weighted Decline Bench Crunch', 'abs', 'dumbbell', false),
  ('Dumbbell Side Bend', 'abs', 'dumbbell', false),
  ('Cable Woodchopper', 'abs', 'cable', false),
  ('Standard Plank', 'abs', 'bodyweight', false),
  ('Side Plank', 'abs', 'bodyweight', false),
  ('Captain''s Chair Knee Raise', 'abs', 'machine', false)
ON CONFLICT DO NOTHING;

-- Automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Athlete'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'onboardingCompleted')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();