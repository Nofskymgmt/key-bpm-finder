-- Key & BPM Finder security fixes (from the 2026-09-29 security review). Run once after billing.sql.
-- Safe to re-run. Changes no existing rows.
--
-- H1  Backdating bypass: users could insert rows with an old created_at, which didn't count toward
--     this month. The database now always sets created_at itself.
-- M2  Race: many simultaneous saves could all see "4 used". Saves for the same user now take a lock
--     and re-count with fresh data before inserting.
-- M1  Junk data: limits on file name length and valid key/scale/BPM values.
-- L2  Remove table permissions the app never uses (defense in depth on top of row-level security).

-- ---------- H1 + M2: enforce the free limit in a trigger ----------
create or replace function public.enforce_analysis_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  -- Never trust a client-supplied timestamp.
  new.created_at := now();

  -- One save at a time per user, so parallel requests can't all see the same count.
  perform pg_advisory_xact_lock(hashtextextended('analyses:' || new.user_id::text, 0));

  if not exists (select 1 from public.profiles p where p.id = new.user_id and p.plan = 'pro') then
    -- plpgsql runs this with a fresh snapshot, so it sees saves committed while we waited for the lock.
    select count(*) into used from public.analyses a
    where a.user_id = new.user_id
      and a.created_at >= (date_trunc('month', now() at time zone 'utc') at time zone 'utc');
    if used >= 5 then
      raise exception 'Free plan limit reached: 5 analyses this month'
        using errcode = '42501', hint = 'Upgrade to Pro for unlimited analyses.';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_analysis_rules() from public, anon, authenticated;

drop trigger if exists enforce_analysis_rules on public.analyses;
create trigger enforce_analysis_rules
  before insert on public.analyses
  for each row execute function public.enforce_analysis_rules();

-- ---------- M1: valid values only ----------
alter table public.analyses drop constraint if exists analyses_file_name_len;
alter table public.analyses add constraint analyses_file_name_len
  check (char_length(file_name) between 1 and 255);

alter table public.analyses drop constraint if exists analyses_key_valid;
alter table public.analyses add constraint analyses_key_valid
  check (key ~ '^[A-G](#|b)?$');

alter table public.analyses drop constraint if exists analyses_scale_valid;
alter table public.analyses add constraint analyses_scale_valid
  check (scale in ('major', 'minor'));

alter table public.analyses drop constraint if exists analyses_bpm_range;
alter table public.analyses add constraint analyses_bpm_range
  check (bpm between 20 and 400);

-- ---------- L2: least privilege ----------
-- The app only ever reads + inserts its own analyses and reads its own profile. Everything else
-- (including TRUNCATE, which row-level security does not cover) is removed for browser roles.
revoke all on public.analyses from anon;
revoke all on public.profiles from anon;
revoke update, delete, truncate, references, trigger on public.analyses from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.profiles from authenticated;
grant select, insert on public.analyses to authenticated;
grant select on public.profiles to authenticated;
