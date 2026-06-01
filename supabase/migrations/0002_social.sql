-- ===========================================================================
-- Delve Dungeons — social layer
-- Friend codes, friendships, notifications, and character inventory.
-- Run this in the Supabase SQL editor AFTER 0001_init.sql. Safe to re-run.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Friend codes on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists friend_code text;

-- Generates a unique, human-friendly 8-character friend code.
create or replace function public.gen_friend_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;

-- Backfill existing profiles and default new ones.
update public.profiles set friend_code = public.gen_friend_code() where friend_code is null;
alter table public.profiles alter column friend_code set default public.gen_friend_code();
create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);

-- ---------------------------------------------------------------------------
-- Character inventory (groundwork for future item trading)
-- ---------------------------------------------------------------------------
alter table public.characters
  add column if not exists inventory jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  -- Reference profiles (not auth.users) so PostgREST can embed the profile.
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending', -- pending | accepted | declined
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.friendships enable row level security;
alter table public.notifications enable row level security;

-- friendships ---------------------------------------------------------------
drop policy if exists "read own friendships" on public.friendships;
create policy "read own friendships"
  on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "send friend request" on public.friendships;
create policy "send friend request"
  on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

drop policy if exists "respond to friendship" on public.friendships;
create policy "respond to friendship"
  on public.friendships for update
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "delete friendship" on public.friendships;
create policy "delete friendship"
  on public.friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- notifications -------------------------------------------------------------
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Any authenticated user may create a notification for another user (e.g. a
-- friend request or campaign invite). Acceptable for this early testing build.
drop policy if exists "create notifications" on public.notifications;
create policy "create notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ===========================================================================
-- Realtime
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end$$;

alter table public.notifications replica identity full;
alter table public.friendships replica identity full;
