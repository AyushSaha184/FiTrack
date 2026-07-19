-- ============================================================================
-- Migration 4: Fix RLS for Firebase Auth (non-UUID UIDs)
-- ============================================================================
-- Supabase's built-in auth.uid() casts the JWT `sub` claim to UUID, which
-- fails for Firebase UIDs (they are opaque strings, not UUIDs).
-- This migration:
--   1. Creates a firebase_uid() helper that reads `sub` as raw text.
--   2. Ensures the `authenticated` role has proper table grants.
--   3. Replaces every RLS policy to use firebase_uid() instead of auth.uid().
-- ============================================================================

-- 1. Helper: extract Firebase UID from the verified JWT as plain text
CREATE OR REPLACE FUNCTION public.firebase_uid()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$$;

-- Helper: extract email from the verified JWT as plain text
CREATE OR REPLACE FUNCTION public.firebase_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.email', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  );
$$;

-- 2. Ensure the `authenticated` Postgres role can access public tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- ============================================================================
-- 3. Drop ALL existing RLS policies (created by migration 3)
-- ============================================================================
-- 3.1 profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- 3.2 exercises
DROP POLICY IF EXISTS "exercises_select_visible" ON public.exercises;
DROP POLICY IF EXISTS "exercises_insert_own_custom" ON public.exercises;
DROP POLICY IF EXISTS "exercises_update_own_custom" ON public.exercises;
DROP POLICY IF EXISTS "exercises_delete_own_custom" ON public.exercises;

-- 3.3 user_exercise_stats
DROP POLICY IF EXISTS "user_exercise_stats_rw" ON public.user_exercise_stats;

-- 3.4 routines
DROP POLICY IF EXISTS "routines_select_own" ON public.workout_routines;
DROP POLICY IF EXISTS "routines_insert_own" ON public.workout_routines;
DROP POLICY IF EXISTS "routines_update_own" ON public.workout_routines;
DROP POLICY IF EXISTS "routines_delete_own" ON public.workout_routines;
DROP POLICY IF EXISTS "routine_exercises_rw" ON public.workout_routine_exercises;

-- 3.5 workouts / workout_exercises / sets
DROP POLICY IF EXISTS "workouts_select_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_insert_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_update_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_delete_own" ON public.workouts;
DROP POLICY IF EXISTS "workout_exercises_rw" ON public.workout_exercises;
DROP POLICY IF EXISTS "sets_rw" ON public.sets;

-- 3.6 weight_entries / steps / personal_records / achievements
DROP POLICY IF EXISTS "weight_entries_rw" ON public.weight_entries;
DROP POLICY IF EXISTS "steps_rw" ON public.steps;
DROP POLICY IF EXISTS "personal_records_rw" ON public.personal_records;
DROP POLICY IF EXISTS "achievements_rw" ON public.achievements;

-- 3.7 crash_reports
DROP POLICY IF EXISTS "crash_reports_insert_own" ON public.crash_reports;
DROP POLICY IF EXISTS "crash_reports_select_own" ON public.crash_reports;

-- ============================================================================
-- 4. Recreate ALL RLS policies using public.firebase_uid()
-- ============================================================================

-- 4.1 profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (
    public.firebase_uid() = id OR
    (public.firebase_email() IS NOT NULL AND public.firebase_email() = email)
  );

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.firebase_uid() = id OR
    (public.firebase_email() IS NOT NULL AND public.firebase_email() = email)
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (
    public.firebase_uid() = id OR
    (public.firebase_email() IS NOT NULL AND public.firebase_email() = email)
  )
  WITH CHECK (
    public.firebase_uid() = id OR
    (public.firebase_email() IS NOT NULL AND public.firebase_email() = email)
  );

-- 4.2 exercises
CREATE POLICY "exercises_select_visible"
  ON public.exercises FOR SELECT
  USING (user_id IS NULL OR user_id = public.firebase_uid());

CREATE POLICY "exercises_insert_own_custom"
  ON public.exercises FOR INSERT
  WITH CHECK (public.firebase_uid() = user_id AND is_custom = true);

CREATE POLICY "exercises_update_own_custom"
  ON public.exercises FOR UPDATE
  USING (public.firebase_uid() = user_id AND is_custom = true)
  WITH CHECK (public.firebase_uid() = user_id AND is_custom = true);

CREATE POLICY "exercises_delete_own_custom"
  ON public.exercises FOR DELETE
  USING (public.firebase_uid() = user_id AND is_custom = true);

-- 4.3 user_exercise_stats
CREATE POLICY "user_exercise_stats_rw"
  ON public.user_exercise_stats FOR ALL
  USING (public.firebase_uid() = user_id)
  WITH CHECK (public.firebase_uid() = user_id);

-- 4.4 routines
CREATE POLICY "routines_select_own"
  ON public.workout_routines FOR SELECT
  USING (public.firebase_uid() = user_id);

CREATE POLICY "routines_insert_own"
  ON public.workout_routines FOR INSERT
  WITH CHECK (public.firebase_uid() = user_id);

CREATE POLICY "routines_update_own"
  ON public.workout_routines FOR UPDATE
  USING (public.firebase_uid() = user_id)
  WITH CHECK (public.firebase_uid() = user_id);

CREATE POLICY "routines_delete_own"
  ON public.workout_routines FOR DELETE
  USING (public.firebase_uid() = user_id);

CREATE POLICY "routine_exercises_rw"
  ON public.workout_routine_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workout_routines r
     WHERE r.id = routine_id AND r.user_id = public.firebase_uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_routines r
     WHERE r.id = routine_id AND r.user_id = public.firebase_uid()
  ));

-- 4.5 workouts + workout_exercises + sets
CREATE POLICY "workouts_select_own"
  ON public.workouts FOR SELECT
  USING (public.firebase_uid() = user_id);

CREATE POLICY "workouts_insert_own"
  ON public.workouts FOR INSERT
  WITH CHECK (public.firebase_uid() = user_id);

CREATE POLICY "workouts_update_own"
  ON public.workouts FOR UPDATE
  USING (public.firebase_uid() = user_id)
  WITH CHECK (public.firebase_uid() = user_id);

CREATE POLICY "workouts_delete_own"
  ON public.workouts FOR DELETE
  USING (public.firebase_uid() = user_id);

CREATE POLICY "workout_exercises_rw"
  ON public.workout_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
     WHERE w.id = workout_id AND w.user_id = public.firebase_uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts w
     WHERE w.id = workout_id AND w.user_id = public.firebase_uid()
  ));

CREATE POLICY "sets_rw"
  ON public.sets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
     WHERE w.id = workout_id AND w.user_id = public.firebase_uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts w
     WHERE w.id = workout_id AND w.user_id = public.firebase_uid()
  ));

-- 4.6 weight_entries
CREATE POLICY "weight_entries_rw"
  ON public.weight_entries FOR ALL
  USING (public.firebase_uid() = user_id)
  WITH CHECK (public.firebase_uid() = user_id);

-- 4.7 steps
CREATE POLICY "steps_rw"
  ON public.steps FOR ALL
  USING (public.firebase_uid() = user_id)
  WITH CHECK (public.firebase_uid() = user_id);

-- 4.8 personal_records
CREATE POLICY "personal_records_rw"
  ON public.personal_records FOR ALL
  USING (public.firebase_uid() = user_id)
  WITH CHECK (public.firebase_uid() = user_id);

-- 4.9 achievements
CREATE POLICY "achievements_rw"
  ON public.achievements FOR ALL
  USING (public.firebase_uid() = user_id)
  WITH CHECK (public.firebase_uid() = user_id);

-- 4.10 crash_reports
CREATE POLICY "crash_reports_insert_own"
  ON public.crash_reports FOR INSERT
  WITH CHECK ((public.firebase_uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "crash_reports_select_own"
  ON public.crash_reports FOR SELECT
  USING (public.firebase_uid() = user_id);
