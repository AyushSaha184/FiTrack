-- Disable RLS on Fitrack tables
-- Firebase Auth handles authentication; Supabase RLS is no longer needed
-- Run this in Supabase SQL Editor

ALTER TABLE IF EXISTS profiles DROP POLICY IF EXISTS "Users can view own profile";
ALTER TABLE IF EXISTS profiles DROP POLICY IF EXISTS "Users can insert own profile";
ALTER TABLE IF EXISTS profiles DROP POLICY IF EXISTS "Users can update own profile";

ALTER TABLE IF EXISTS exercises DROP POLICY IF EXISTS "Users can view own and public exercises";
ALTER TABLE IF EXISTS exercises DROP POLICY IF EXISTS "Users can insert own exercises";
ALTER TABLE IF EXISTS exercises DROP POLICY IF EXISTS "Users can update own exercises";
ALTER TABLE IF EXISTS exercises DROP POLICY IF EXISTS "Users can delete own exercises";

ALTER TABLE IF EXISTS workouts DROP POLICY IF EXISTS "Users can view own workouts";
ALTER TABLE IF EXISTS workouts DROP POLICY IF EXISTS "Users can insert own workouts";
ALTER TABLE IF EXISTS workouts DROP POLICY IF EXISTS "Users can update own workouts";
ALTER TABLE IF EXISTS workouts DROP POLICY IF EXISTS "Users can delete own workouts";

ALTER TABLE IF EXISTS workout_exercises DROP POLICY IF EXISTS "Users can manage own workout exercises";

ALTER TABLE IF EXISTS sets DROP POLICY IF EXISTS "Users can manage own sets";

ALTER TABLE IF EXISTS weight_entries DROP POLICY IF EXISTS "Users can view own weight entries";
ALTER TABLE IF EXISTS weight_entries DROP POLICY IF EXISTS "Users can insert own weight entries";
ALTER TABLE IF EXISTS weight_entries DROP POLICY IF EXISTS "Users can update own weight entries";
ALTER TABLE IF EXISTS weight_entries DROP POLICY IF EXISTS "Users can delete own weight entries";

ALTER TABLE IF EXISTS steps DROP POLICY IF EXISTS "Users can view own steps";
ALTER TABLE IF EXISTS steps DROP POLICY IF EXISTS "Users can insert own steps";
ALTER TABLE IF EXISTS steps DROP POLICY IF EXISTS "Users can update own steps";
ALTER TABLE IF EXISTS steps DROP POLICY IF EXISTS "Users can delete own steps";

ALTER TABLE IF EXISTS body_measurements DROP POLICY IF EXISTS "Users can manage own body measurements";

ALTER TABLE IF EXISTS achievements DROP POLICY IF EXISTS "Users can manage own achievements";

ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weight_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS body_measurements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievements DISABLE ROW LEVEL SECURITY;