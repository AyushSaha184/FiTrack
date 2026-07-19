-- Migration to convert profiles.id and user_id columns from UUID to TEXT for Firebase UID compatibility.

-- 1. Drop all RLS policies that reference profiles.id or user_id
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

DROP POLICY IF EXISTS "exercises_select_visible" ON public.exercises;
DROP POLICY IF EXISTS "exercises_insert_own_custom" ON public.exercises;
DROP POLICY IF EXISTS "exercises_update_own_custom" ON public.exercises;
DROP POLICY IF EXISTS "exercises_delete_own_custom" ON public.exercises;

DROP POLICY IF EXISTS "user_exercise_stats_rw" ON public.user_exercise_stats;

DROP POLICY IF EXISTS "routines_select_own" ON public.workout_routines;
DROP POLICY IF EXISTS "routines_insert_own" ON public.workout_routines;
DROP POLICY IF EXISTS "routines_update_own" ON public.workout_routines;
DROP POLICY IF EXISTS "routines_delete_own" ON public.workout_routines;

DROP POLICY IF EXISTS "routine_exercises_rw" ON public.workout_routine_exercises;

DROP POLICY IF EXISTS "workouts_select_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_insert_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_update_own" ON public.workouts;
DROP POLICY IF EXISTS "workouts_delete_own" ON public.workouts;

DROP POLICY IF EXISTS "workout_exercises_rw" ON public.workout_exercises;
DROP POLICY IF EXISTS "sets_rw" ON public.sets;

DROP POLICY IF EXISTS "weight_entries_rw" ON public.weight_entries;
DROP POLICY IF EXISTS "steps_rw" ON public.steps;
DROP POLICY IF EXISTS "personal_records_rw" ON public.personal_records;
DROP POLICY IF EXISTS "achievements_rw" ON public.achievements;

DROP POLICY IF EXISTS "crash_reports_insert_own" ON public.crash_reports;
DROP POLICY IF EXISTS "crash_reports_select_own" ON public.crash_reports;

-- 2. Drop foreign key constraints referencing profiles(id)
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_user_id_fkey;
ALTER TABLE public.user_exercise_stats DROP CONSTRAINT IF EXISTS user_exercise_stats_user_id_fkey;
ALTER TABLE public.workout_routines DROP CONSTRAINT IF EXISTS workout_routines_user_id_fkey;
ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_user_id_fkey;
ALTER TABLE public.weight_entries DROP CONSTRAINT IF EXISTS weight_entries_user_id_fkey;
ALTER TABLE public.steps DROP CONSTRAINT IF EXISTS steps_user_id_fkey;
ALTER TABLE public.personal_records DROP CONSTRAINT IF EXISTS personal_records_user_id_fkey;
ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS achievements_user_id_fkey;
ALTER TABLE public.crash_reports DROP CONSTRAINT IF EXISTS crash_reports_user_id_fkey;

-- 3. Drop the foreign key on profiles.id referencing auth.users(id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. Alter primary key in public.profiles to text
ALTER TABLE public.profiles ALTER COLUMN id TYPE text;

-- 5. Alter user_id columns in all tables to text
ALTER TABLE public.exercises ALTER COLUMN user_id TYPE text;
ALTER TABLE public.user_exercise_stats ALTER COLUMN user_id TYPE text;
ALTER TABLE public.workout_routines ALTER COLUMN user_id TYPE text;
ALTER TABLE public.workouts ALTER COLUMN user_id TYPE text;
ALTER TABLE public.weight_entries ALTER COLUMN user_id TYPE text;
ALTER TABLE public.steps ALTER COLUMN user_id TYPE text;
ALTER TABLE public.personal_records ALTER COLUMN user_id TYPE text;
ALTER TABLE public.achievements ALTER COLUMN user_id TYPE text;
ALTER TABLE public.crash_reports ALTER COLUMN user_id TYPE text;

-- 6. Recreate foreign key constraints referencing profiles(id)
ALTER TABLE public.exercises ADD CONSTRAINT exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_exercise_stats ADD CONSTRAINT user_exercise_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.workout_routines ADD CONSTRAINT workout_routines_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.workouts ADD CONSTRAINT workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.weight_entries ADD CONSTRAINT weight_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.steps ADD CONSTRAINT steps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.personal_records ADD CONSTRAINT personal_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.crash_reports ADD CONSTRAINT crash_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 7. Update bump_user_exercise_stats function to support text user_id
CREATE OR REPLACE FUNCTION public.bump_user_exercise_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id text;
BEGIN
  SELECT user_id INTO v_user_id
    FROM public.workouts
   WHERE id = new.workout_id;

  IF v_user_id IS NULL THEN
    RETURN new;
  END IF;

  INSERT INTO public.user_exercise_stats
    (user_id, exercise_id, last_used_at, first_used_at, total_times_performed)
  VALUES
    (v_user_id, new.exercise_id, now(), now(), 1)
  ON CONFLICT (user_id, exercise_id) DO UPDATE
    SET last_used_at          = now(),
        total_times_performed = public.user_exercise_stats.total_times_performed + 1;

  RETURN new;
END;
$$;

-- 8. Recreate all RLS policies with text type support
-- 8.1 profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

-- 8.2 exercises
CREATE POLICY "exercises_select_visible" ON public.exercises FOR SELECT USING (user_id IS NULL OR user_id = auth.uid()::text);
CREATE POLICY "exercises_insert_own_custom" ON public.exercises FOR INSERT WITH CHECK (auth.uid()::text = user_id AND is_custom = true);
CREATE POLICY "exercises_update_own_custom" ON public.exercises FOR UPDATE USING (auth.uid()::text = user_id AND is_custom = true) WITH CHECK (auth.uid()::text = user_id AND is_custom = true);
CREATE POLICY "exercises_delete_own_custom" ON public.exercises FOR DELETE USING (auth.uid()::text = user_id AND is_custom = true);

-- 8.3 user_exercise_stats
CREATE POLICY "user_exercise_stats_rw" ON public.user_exercise_stats FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 8.4 routines
CREATE POLICY "routines_select_own" ON public.workout_routines FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "routines_insert_own" ON public.workout_routines FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "routines_update_own" ON public.workout_routines FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "routines_delete_own" ON public.workout_routines FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "routine_exercises_rw" ON public.workout_routine_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workout_routines r WHERE r.id = routine_id AND r.user_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_routines r WHERE r.id = routine_id AND r.user_id = auth.uid()::text));

-- 8.5 workouts + workout_exercises + sets
CREATE POLICY "workouts_select_own" ON public.workouts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "workouts_insert_own" ON public.workouts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "workouts_update_own" ON public.workouts FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "workouts_delete_own" ON public.workouts FOR DELETE USING (auth.uid()::text = user_id);

CREATE POLICY "workout_exercises_rw" ON public.workout_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()::text));

CREATE POLICY "sets_rw" ON public.sets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()::text));

-- 8.6 weight_entries
CREATE POLICY "weight_entries_rw" ON public.weight_entries FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 8.7 steps
CREATE POLICY "steps_rw" ON public.steps FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 8.8 personal_records
CREATE POLICY "personal_records_rw" ON public.personal_records FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 8.9 achievements
CREATE POLICY "achievements_rw" ON public.achievements FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 8.10 crash_reports
CREATE POLICY "crash_reports_insert_own" ON public.crash_reports FOR INSERT WITH CHECK ((auth.uid()::text = user_id) OR (user_id IS NULL));
CREATE POLICY "crash_reports_select_own" ON public.crash_reports FOR SELECT USING (auth.uid()::text = user_id);
