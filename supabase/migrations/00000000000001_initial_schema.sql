-- ============================================================================
-- FiTrack — Initial Database Schema  (v2, post-audit)
-- ----------------------------------------------------------------------------
-- PostgreSQL schema for the FiTrack fitness app (React Native + Supabase).
-- Designed to match the TypeScript models in src/models/ and the service
-- queries in src/services/supabase/*.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";    -- trigram indexes for ilike search
create extension if not exists "btree_gin";  -- for composite GIN indexes

-- ============================================================================
-- 1. ENUMS
-- ============================================================================
create type muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'traps', 'lats', 'cardio'
);

create type equipment as enum (
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight',
  'kettlebell', 'resistance_band', 'other'
);

create type difficulty as enum ('beginner', 'intermediate', 'advanced');

create type workout_type as enum (
  'push', 'pull', 'legs', 'upper', 'lower', 'fullbody', 'cardio', 'rest', 'custom'
);

create type day_of_week as enum (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

create type step_source as enum ('manual', 'apple_health', 'google_fit');

create type record_type as enum (
  'one_rep_max',    -- heaviest single rep
  'max_weight',     -- heaviest weight at any rep count
  'max_reps',       -- most reps at any weight
  'max_volume'      -- weight * reps in a single set
);

create type achievement_type as enum (
  'first_workout',
  'streak_7',
  'streak_30',
  'workouts_100',
  'volume_milestone',
  'pr_achieved',
  'step_goal_30',
  'weight_goal_reached'
);

create type app_theme as enum ('light', 'dark', 'auto');
create type gender    as enum ('male', 'female', 'other');
create type weight_unit as enum ('kg', 'lbs');
create type height_unit as enum ('cm', 'ft');
create type temp_unit   as enum ('celsius', 'fahrenheit');

-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================

-- 2.1  Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2.2  Slugify a string (used for exercise slugs like "barbell-bench-press")
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(coalesce(input, '')), '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- 2.3  Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    coalesce(
      new.email,
      'no-email+' || replace(new.id::text, '-', '') || '@placeholder.local'
    ),
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      case when new.phone is not null
           then 'User ' || right(new.phone, 4)
           else null end,
      split_part(coalesce(new.email, new.phone, 'user'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update
  set email = coalesce(excluded.email, public.profiles.email),
      name = coalesce(excluded.name, public.profiles.name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

-- 2.4  Per-user exercise usage stats.
create or replace function public.bump_user_exercise_stats()
returns trigger
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
    from public.workouts
   where id = new.workout_id;

  if v_user_id is null then
    return new;
  end if;

  insert into public.user_exercise_stats
    (user_id, exercise_id, last_used_at, first_used_at, total_times_performed)
  values
    (v_user_id, new.exercise_id, now(), now(), 1)
  on conflict (user_id, exercise_id) do update
    set last_used_at          = now(),
        total_times_performed = public.user_exercise_stats.total_times_performed + 1;

  return new;
end;
$$;

-- 2.5  Statement-level volume recalculation triggers to eliminate locking contention
create or replace function public.recompute_workout_volume_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.workouts w
     set total_volume = coalesce((
           select sum(s.weight * s.reps)
             from public.sets s
            where s.workout_id = w.id
              and s.completed = true
         ), 0)
   where w.id in (select distinct workout_id from new_table);
  return null;
end;
$$;

create or replace function public.recompute_workout_volume_update()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.workouts w
     set total_volume = coalesce((
           select sum(s.weight * s.reps)
             from public.sets s
            where s.workout_id = w.id
              and s.completed = true
         ), 0)
   where w.id in (
     select distinct workout_id from (
       select workout_id from old_table
       union
       select workout_id from new_table
     ) as combined
   );
  return null;
end;
$$;

create or replace function public.recompute_workout_volume_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.workouts w
     set total_volume = coalesce((
           select sum(s.weight * s.reps)
             from public.sets s
            where s.workout_id = w.id
              and s.completed = true
         ), 0)
   where w.id in (select distinct workout_id from old_table);
  return null;
end;
$$;

-- 2.6  Recompute workout total_volume after a workout_exercise is deleted (statement-level)
create or replace function public.recompute_workout_volume_on_we_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.workouts w
     set total_volume = coalesce((
           select sum(s.weight * s.reps)
             from public.sets s
             join public.workout_exercises we on we.id = s.workout_exercise_id
            where we.workout_id = w.id
              and s.completed = true
         ), 0)
   where w.id in (select distinct workout_id from old_table);
  return null;
end;
$$;

-- 2.6.b  Validate avatar URL matches user's storage folder path
create or replace function public.validate_avatar_url()
returns trigger
language plpgsql
as $$
begin
  if new.avatar_url is not null and new.avatar_url like '%/storage/v1/object/public/avatars/%' then
    if split_part(new.avatar_url, '/', 9) <> new.id::text then
      raise exception 'Unauthorized avatar URL path';
    end if;
  end if;
  return new;
end;
$$;

-- 2.7  Auto-populate sets.workout_id from parent workout_exercises
create or replace function public.populate_set_workout_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.workout_id is null then
    select workout_id into new.workout_id
      from public.workout_exercises
     where id = new.workout_exercise_id;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- 3. CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1  profiles
-- ----------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text,                    -- nullable on purpose
  name                  text not null,
  avatar_url            text,

  -- profile (matches UserProfile in User.ts)
  age                   int,
  gender                gender,
  height                numeric(6,2),
  fitness_level         difficulty not null default 'beginner',
  goal_weight           numeric(6,2),
  weekly_goal           int,

  -- preferences
  weight_unit           weight_unit not null default 'kg',
  height_unit           height_unit not null default 'cm',
  temp_unit             temp_unit   not null default 'celsius',
  theme                 app_theme   not null default 'dark',

  notif_workout_reminders    boolean not null default true,
  notif_weight_log_reminders boolean not null default true,
  notif_step_goal_reminders  boolean not null default true,
  notif_streak_notifications boolean not null default true,
  notif_achievement_notifs   boolean not null default true,
  notif_rest_timer_sound     boolean not null default true,
  notif_rest_timer_vibration boolean not null default true,

  default_rest_time     int not null default 90,
  auto_start_rest_timer boolean not null default false,
  keep_screen_awake     boolean not null default true,
  auto_save             boolean not null default true,

  daily_step_goal       int not null default 10000,

  onboarding_completed  boolean not null default false,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index uq_profiles_email_not_null
  on public.profiles (email)
  where email is not null;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

create trigger trg_profiles_validate_avatar
before insert or update of avatar_url on public.profiles
for each row execute function public.validate_avatar_url();

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3.2  exercises
-- ----------------------------------------------------------------------------
create table public.exercises (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles(id) on delete cascade,
  name                  text not null,
  slug                  text not null,
  description           text,
  muscle_group          muscle_group not null,
  secondary_muscles     muscle_group[] not null default '{}',
  equipment             equipment not null,
  difficulty            difficulty not null default 'intermediate',
  instructions          text[] not null default '{}',
  video_url             text,
  is_custom             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (user_id, slug)
);

create index idx_exercises_user_id         on public.exercises (user_id);
create index idx_exercises_muscle_group    on public.exercises (muscle_group);
create index idx_exercises_equipment       on public.exercises (equipment);
create index idx_exercises_is_custom       on public.exercises (is_custom);
create index idx_exercises_user_name_trgm   on public.exercises using gin (user_id, name gin_trgm_ops);
create index idx_exercises_secondary       on public.exercises using gin (secondary_muscles);

create unique index uq_exercises_predefined_slug
  on public.exercises (slug)
  where user_id is null;

create trigger trg_exercises_updated_at
before update on public.exercises
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3.3  user_exercise_stats
-- ----------------------------------------------------------------------------
create table public.user_exercise_stats (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  exercise_id           uuid not null references public.exercises(id) on delete cascade,
  first_used_at         timestamptz not null default now(),
  last_used_at          timestamptz,
  total_times_performed int not null default 0,
  max_weight            numeric(8,2),
  max_reps              int,
  max_volume            numeric(10,2),
  max_weight_at         timestamptz,
  max_reps_at           timestamptz,
  max_volume_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique (user_id, exercise_id)
);

create index idx_user_exercise_stats_user on public.user_exercise_stats (user_id);
create index idx_user_exercise_stats_ex   on public.user_exercise_stats (exercise_id);
create index idx_user_exercise_stats_last_used
  on public.user_exercise_stats (user_id, last_used_at desc);

create trigger trg_user_exercise_stats_updated_at
before update on public.user_exercise_stats
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3.4  workout_routines  +  workout_routine_exercises
-- ----------------------------------------------------------------------------
create table public.workout_routines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  type          workout_type not null default 'custom',
  day_of_week   day_of_week,
  is_template   boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_routines_user_id      on public.workout_routines (user_id);
create index idx_routines_day_of_week  on public.workout_routines (day_of_week);

create trigger trg_routines_updated_at
before update on public.workout_routines
for each row execute function public.handle_updated_at();

create table public.workout_routine_exercises (
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references public.workout_routines(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  order_index  int  not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (routine_id, exercise_id, order_index)
);

create index idx_routine_exercises_routine  on public.workout_routine_exercises (routine_id);
create index idx_routine_exercises_exercise on public.workout_routine_exercises (exercise_id);

create trigger trg_routine_exercises_updated_at
before update on public.workout_routine_exercises
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3.5  workouts
-- ----------------------------------------------------------------------------
create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  type          workout_type not null default 'custom',
  day_of_week   day_of_week,
  date          date not null,
  start_time    timestamptz,
  end_time      timestamptz,
  duration      int,         -- seconds
  notes         text,
  completed     boolean not null default false,
  total_volume  numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_workouts_user_id        on public.workouts (user_id);
create index idx_workouts_date           on public.workouts (date desc);
create index idx_workouts_completed      on public.workouts (completed) where completed = true;
create index idx_workouts_user_date      on public.workouts (user_id, date desc);

create trigger trg_workouts_updated_at
before update on public.workouts
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3.6  workout_exercises
-- ----------------------------------------------------------------------------
create table public.workout_exercises (
  id            uuid primary key default gen_random_uuid(),
  workout_id    uuid not null references public.workouts(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id) on delete cascade,
  order_index   int  not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (workout_id, exercise_id, order_index)
);

create index idx_workout_exercises_workout  on public.workout_exercises (workout_id);
create index idx_workout_exercises_exercise on public.workout_exercises (exercise_id);

create trigger trg_workout_exercises_updated_at
before update on public.workout_exercises
for each row execute function public.handle_updated_at();

create trigger trg_workout_exercises_bump_user_stats
after insert on public.workout_exercises
for each row execute function public.bump_user_exercise_stats();

create trigger trg_workout_exercises_recompute_volume
after delete on public.workout_exercises
referencing old table as old_table
for each statement execute function public.recompute_workout_volume_on_we_delete();

-- ----------------------------------------------------------------------------
-- 3.7  sets
-- ----------------------------------------------------------------------------
create table public.sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_id          uuid not null references public.workouts(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  order_index         int  not null default 0,
  weight              numeric(8,2) not null default 0,
  weight_unit         weight_unit not null default 'kg',
  reps                int          not null default 0,
  rpe                 numeric(3,1),
  completed           boolean not null default false,
  rest_time           int,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint sets_reps_nonneg  check (reps  >= 0),
  constraint sets_weight_nonneg check (weight >= 0),
  constraint sets_rpe_range    check (rpe is null or (rpe >= 1.0 and rpe <= 10.0))
);

create index idx_sets_workout           on public.sets (workout_id);
create index idx_sets_workout_exercise  on public.sets (workout_exercise_id);
create index idx_sets_completed         on public.sets (completed);

create trigger trg_sets_populate_workout_id
before insert on public.sets
for each row execute function public.populate_set_workout_id();

create trigger trg_sets_updated_at
before update on public.sets
for each row execute function public.handle_updated_at();

create trigger trg_sets_recompute_volume_insert
after insert on public.sets
referencing new table as new_table
for each statement execute function public.recompute_workout_volume_insert();

create trigger trg_sets_recompute_volume_update
after update on public.sets
referencing old table as old_table new table as new_table
for each statement execute function public.recompute_workout_volume_update();

create trigger trg_sets_recompute_volume_delete
after delete on public.sets
referencing old table as old_table
for each statement execute function public.recompute_workout_volume_delete();

-- ----------------------------------------------------------------------------
-- 3.8  weight_entries
-- ----------------------------------------------------------------------------
create table public.weight_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  weight               numeric(6,2) not null,
  body_fat_percentage  numeric(4,2),
  date                 date not null,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint weight_entries_positive check (weight > 0),
  constraint weight_entries_bf_range check (
    body_fat_percentage is null
    or (body_fat_percentage >= 0 and body_fat_percentage <= 100)
  )
);

create index idx_weight_user_date on public.weight_entries (user_id, date desc);

create unique index uq_weight_user_date on public.weight_entries (user_id, date);

create trigger trg_weight_entries_updated_at
before update on public.weight_entries
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3.9  steps
-- ----------------------------------------------------------------------------
create table public.steps (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  date            date not null,
  steps           int  not null default 0,
  calories_burned numeric(8,2),
  distance        numeric(8,2),
  source          step_source not null default 'manual',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint steps_nonneg check (steps >= 0),
  unique (user_id, date)
);

create index idx_steps_user_date on public.steps (user_id, date desc);

create trigger trg_steps_updated_at
before update on public.steps
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3.10  personal_records
-- ----------------------------------------------------------------------------
create table public.personal_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id) on delete cascade,
  record_type     record_type not null,
  weight          numeric(8,2),
  reps            int,
  value           numeric(10,2) not null,
  set_id          uuid references public.sets(id) on delete set null,
  workout_id      uuid references public.workouts(id) on delete set null,
  achieved_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (user_id, exercise_id, record_type)
);

create index idx_pr_user_exercise on public.personal_records (user_id, exercise_id);

create trigger trg_personal_records_updated_at
before update on public.personal_records
for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3.11  achievements
-- ----------------------------------------------------------------------------
create table public.achievements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          achievement_type not null,
  progress      int not null default 0,
  target        int not null default 1,
  unlocked_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, type)
);

create index idx_achievements_user on public.achievements (user_id);

create trigger trg_achievements_updated_at
before update on public.achievements
for each row execute function public.handle_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

-- 4.1  profiles
alter table public.profiles enable row level security;

create policy if not exists "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy if not exists "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy if not exists "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4.2  exercises
alter table public.exercises enable row level security;

create policy if not exists "exercises_select_visible"
  on public.exercises for select
  using (
    user_id is null
    or user_id = auth.uid()
  );

create policy if not exists "exercises_insert_own_custom"
  on public.exercises for insert
  with check (
    auth.uid() = user_id
    and is_custom = true
  );

create policy if not exists "exercises_update_own_custom"
  on public.exercises for update
  using (auth.uid() = user_id and is_custom = true)
  with check (auth.uid() = user_id and is_custom = true);

create policy if not exists "exercises_delete_own_custom"
  on public.exercises for delete
  using (auth.uid() = user_id and is_custom = true);

-- 4.3  user_exercise_stats
alter table public.user_exercise_stats enable row level security;

create policy if not exists "user_exercise_stats_rw"
  on public.user_exercise_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4.4  routines
alter table public.workout_routines          enable row level security;
alter table public.workout_routine_exercises  enable row level security;

create policy if not exists "routines_select_own"  on public.workout_routines          for select using (auth.uid() = user_id);
create policy if not exists "routines_insert_own"  on public.workout_routines          for insert with check (auth.uid() = user_id);
create policy if not exists "routines_update_own"  on public.workout_routines          for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "routines_delete_own"  on public.workout_routines          for delete using (auth.uid() = user_id);

create policy if not exists "routine_exercises_rw"
  on public.workout_routine_exercises for all
  using (
    exists (
      select 1 from public.workout_routines r
       where r.id = routine_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_routines r
       where r.id = routine_id and r.user_id = auth.uid()
    )
  );

-- 4.5  workouts + workout_exercises + sets
alter table public.workouts            enable row level security;
alter table public.workout_exercises   enable row level security;
alter table public.sets                enable row level security;

create policy if not exists "workouts_select_own" on public.workouts for select using (auth.uid() = user_id);
create policy if not exists "workouts_insert_own" on public.workouts for insert with check (auth.uid() = user_id);
create policy if not exists "workouts_update_own" on public.workouts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "workouts_delete_own" on public.workouts for delete using (auth.uid() = user_id);

create policy if not exists "workout_exercises_rw"
  on public.workout_exercises for all
  using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

create policy if not exists "sets_rw"
  on public.sets for all
  using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- 4.6  weight_entries
alter table public.weight_entries enable row level security;
create policy if not exists "weight_entries_rw"
  on public.weight_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4.7  steps
alter table public.steps enable row level security;
create policy if not exists "steps_rw"
  on public.steps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4.8  personal_records
alter table public.personal_records enable row level security;
create policy if not exists "personal_records_rw"
  on public.personal_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4.9  achievements
alter table public.achievements enable row level security;
create policy if not exists "achievements_rw"
  on public.achievements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 5. STORAGE  (avatars)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy if not exists "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy if not exists "avatars_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "avatars_update_own_folder"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "avatars_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- 6. GRANTS
-- ============================================================================
grant usage on schema public to authenticated, anon;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant select
  on all tables in schema public
  to anon;

grant usage, select
  on all sequences in schema public
  to authenticated;
