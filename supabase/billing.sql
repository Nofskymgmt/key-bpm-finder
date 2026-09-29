-- Key & BPM Finder billing: run this once in Supabase → SQL Editor → New query → Run
-- (after schema.sql). Safe to re-run.
--
-- profiles: one row per user with their plan. Only the server (Stripe webhook, using the
-- secret key) writes it; users can read their own row but never change it.
-- Free plan: 5 analyses per calendar month (UTC), counted from the analyses (History) table.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);
-- No insert/update/delete policies: only the secret (service role) key can write profiles.

create or replace function public.is_pro(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and uid = auth.uid() and p.plan = 'pro'
  );
$$;

create or replace function public.analyses_this_month(uid uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.analyses a
  where a.user_id = uid
    and uid = auth.uid()
    and a.created_at >= (date_trunc('month', now() at time zone 'utc') at time zone 'utc');
$$;

-- What the app shows: plan, how many analyses used this month, and the free limit.
create or replace function public.my_usage()
returns table (plan text, used integer, monthly_limit integer, cancel_at_period_end boolean, current_period_end timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when public.is_pro(auth.uid()) then 'pro' else 'free' end,
    public.analyses_this_month(auth.uid()),
    5,
    coalesce(p.cancel_at_period_end, false),
    p.current_period_end
  from (select auth.uid() as uid) me
  left join public.profiles p on p.id = me.uid;
$$;

revoke execute on function public.is_pro(uuid) from public, anon;
revoke execute on function public.analyses_this_month(uuid) from public, anon;
revoke execute on function public.my_usage() from public, anon;
grant execute on function public.is_pro(uuid) to authenticated;
grant execute on function public.analyses_this_month(uuid) to authenticated;
grant execute on function public.my_usage() to authenticated;

-- Enforce the free limit in the database itself: a free user's 6th save this month is rejected.
drop policy if exists "Users can add their own analyses" on public.analyses;
create policy "Users can add their own analyses"
  on public.analyses for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (public.is_pro(user_id) or public.analyses_this_month(user_id) < 5)
  );
