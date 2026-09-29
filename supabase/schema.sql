-- Key & BPM Finder: run this once in Supabase → SQL Editor → New query → Run.
-- Stores analysis RESULTS only (never audio). Each user can only see and change their own rows.

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null,
  bpm integer not null,
  key text not null,    -- e.g. "F", "C#", "Bb"
  scale text not null,  -- "major" or "minor"
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_created_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

drop policy if exists "Users can read their own analyses" on public.analyses;
create policy "Users can read their own analyses"
  on public.analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own analyses" on public.analyses;
create policy "Users can add their own analyses"
  on public.analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
