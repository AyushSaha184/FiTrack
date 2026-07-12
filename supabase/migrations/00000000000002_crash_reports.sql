create table public.crash_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  report_data   jsonb not null,
  app_version   text,
  os            text,
  os_version    text,
  created_at    timestamptz not null default now()
);

create index idx_crash_reports_user_id  on public.crash_reports (user_id);
create index idx_crash_reports_created  on public.crash_reports (created_at desc);

alter table public.crash_reports enable row level security;

create policy "crash_reports_insert_own"
  on public.crash_reports for insert
  with check (
    (auth.uid() = user_id) or (user_id is null)
  );

create policy "crash_reports_select_own"
  on public.crash_reports for select
  using (auth.uid() = user_id);

grant insert on public.crash_reports to authenticated, anon;
grant select on public.crash_reports to authenticated;
