-- ===========================================================================
-- Delve Dungeons — invite-only sign-up (closed testing)
-- Account creation now requires a valid invite code. Existing players can
-- generate codes from the app to share with new testers.
-- Run this in the Supabase SQL editor AFTER 0001 and 0002. Safe to re-run.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- invite_codes
-- ---------------------------------------------------------------------------
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  label text,
  -- null = unlimited uses
  max_uses int,
  uses int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invite_codes_created_by_idx
  on public.invite_codes (created_by);

alter table public.invite_codes enable row level security;

drop policy if exists "read own invite codes" on public.invite_codes;
create policy "read own invite codes"
  on public.invite_codes for select
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "create invite codes" on public.invite_codes;
create policy "create invite codes"
  on public.invite_codes for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "delete own invite codes" on public.invite_codes;
create policy "delete own invite codes"
  on public.invite_codes for delete
  to authenticated
  using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Availability check — callable by anonymous (sign-up) users without exposing
-- the table itself.
-- ---------------------------------------------------------------------------
create or replace function public.invite_code_available(p_code text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.invite_codes
    where code = upper(trim(p_code))
      and (max_uses is null or uses < max_uses)
  );
$$;
grant execute on function public.invite_code_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enforce a valid invite code on every new sign-up, consuming one use.
-- Raising here makes Supabase reject the sign-up at the database level.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_invite_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
begin
  v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));

  if v_code = '' then
    raise exception 'An invite code is required to join the test.'
      using errcode = 'check_violation';
  end if;

  select id into v_id
  from public.invite_codes
  where code = v_code
    and (max_uses is null or uses < max_uses)
  for update;

  if v_id is null then
    raise exception 'That invite code is invalid or has been used up.'
      using errcode = 'check_violation';
  end if;

  update public.invite_codes set uses = uses + 1 where id = v_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_invite on auth.users;
create trigger on_auth_user_invite
  before insert on auth.users
  for each row execute function public.enforce_invite_on_signup();

-- ---------------------------------------------------------------------------
-- NOTE: To re-open public sign-ups later, drop the trigger:
--   drop trigger if exists on_auth_user_invite on auth.users;
-- ---------------------------------------------------------------------------
