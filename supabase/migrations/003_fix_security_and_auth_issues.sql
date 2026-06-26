-- Fix 003: Address Supabase security warnings for Firebase Auth setup

-- 1. Fix search_path on update_updated_at_column (clears lint warning)
-- Note: ALTER FUNCTION doesn't support IF EXISTS, so we skip if function missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
  END IF;
END $$;

-- 2. Drop rls_auto_enable function with CASCADE to handle dependencies
-- It depends on an event trigger "ensure_rls"
DROP FUNCTION IF EXISTS public.rls_auto_enable() CASCADE;

-- 3. Drop handle_new_user since it's dead code with Firebase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Revoke SELECT from anon/authenticated for internal tables
-- These new tables shouldn't be directly accessible
REVOKE SELECT ON generation_jobs FROM anon;
REVOKE SELECT ON generation_jobs FROM authenticated;
REVOKE SELECT ON generation_job_feedback FROM anon;
REVOKE SELECT ON generation_job_feedback FROM authenticated;
REVOKE SELECT ON test_run_results FROM anon;
REVOKE SELECT ON test_run_results FROM authenticated;

-- 5. RLS STATUS: Intentionally DISABLED for Firebase Auth
-- Your app uses Firebase Auth + Supabase client SDK directly.
-- RLS using auth.uid() would block all queries since auth.uid() returns NULL.
-- The linter will continue to flag RLS disabled, but this is the correct choice.
-- 
-- ALTERNATIVE: If you want RLS, you MUST use one of:
--   A) Supabase Edge Functions to proxy DB calls (set app.firebase_uid context)
--   B) Switch to Supabase Auth (delete migration 002)
--   C) Use a private schema (e.g., fitrack) instead of public
--
-- To re-enable RLS later, run:
--   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
--   ... etc for each table
--
-- Then add policies that check your Firebase UID via custom JWT claims or
-- application-level security in an Edge Function.

-- 6. Password protection: Enable in Supabase Dashboard
-- Navigate to: Authentication → Providers → Password Protection → Enable "Check for leaked passwords"
-- Note: Only available on Pro Plan and above