-- ===========================================================================
-- Delve Dungeons — initial schema
-- Run this in the Supabase SQL editor (or via the Supabase CLI) to provision
-- the database, row-level-security policies, and realtime publication.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- characters: a player's adventurers
-- ---------------------------------------------------------------------------
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  race text not null default 'Human',
  klass text not null default 'Fighter',
  level int not null default 1,
  abilities jsonb not null default
    '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
  max_hp int not null default 10,
  current_hp int not null default 10,
  armor_class int not null default 10,
  background text,
  bio text,
  created_at timestamptz not null default now()
);
create index if not exists characters_user_id_idx on public.characters (user_id);

-- ---------------------------------------------------------------------------
-- campaigns: a table/adventure run by the AI Dungeon Master
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  setting text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  status text not null default 'active',
  active_character_id uuid references public.characters (id) on delete set null,
  -- A pending skill check, surfaced to every connected player in realtime.
  pending_check jsonb,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_owner_id_idx on public.campaigns (owner_id);

-- ---------------------------------------------------------------------------
-- campaign_members: who is at the table, in what turn order
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  role text not null default 'player',
  turn_order int not null default 0,
  joined_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);
create index if not exists campaign_members_campaign_idx
  on public.campaign_members (campaign_id);

-- ---------------------------------------------------------------------------
-- messages: the shared narrative log
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  sender_type text not null default 'player', -- player | dm | system
  user_id uuid references auth.users (id) on delete set null,
  character_id uuid references public.characters (id) on delete set null,
  character_name text,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_campaign_idx
  on public.messages (campaign_id, created_at);

-- ---------------------------------------------------------------------------
-- dice_rolls: every roll made at the table
-- ---------------------------------------------------------------------------
create table if not exists public.dice_rolls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  character_name text,
  notation text not null,
  rolls int[] not null default '{}',
  modifier int not null default 0,
  total int not null,
  skill text,
  dc int,
  success boolean,
  created_at timestamptz not null default now()
);
create index if not exists dice_rolls_campaign_idx
  on public.dice_rolls (campaign_id, created_at);

-- ---------------------------------------------------------------------------
-- Helper: is the current user a member of a campaign?
-- SECURITY DEFINER avoids recursive RLS evaluation on campaign_members.
-- ---------------------------------------------------------------------------
create or replace function public.is_campaign_member(p_campaign_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.campaign_members m
    where m.campaign_id = p_campaign_id
      and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.messages enable row level security;
alter table public.dice_rolls enable row level security;

-- profiles -----------------------------------------------------------------
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "users manage their own profile" on public.profiles;
create policy "users manage their own profile"
  on public.profiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- characters ----------------------------------------------------------------
drop policy if exists "owners read their characters" on public.characters;
create policy "owners read their characters"
  on public.characters for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.campaign_members me
      join public.campaign_members them
        on them.campaign_id = me.campaign_id
      where me.user_id = auth.uid()
        and them.character_id = characters.id
    )
  );

drop policy if exists "owners write their characters" on public.characters;
create policy "owners write their characters"
  on public.characters for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- campaigns -----------------------------------------------------------------
drop policy if exists "members read campaigns" on public.campaigns;
create policy "members read campaigns"
  on public.campaigns for select
  to authenticated
  using (owner_id = auth.uid() or public.is_campaign_member(id));

drop policy if exists "anyone authenticated can create a campaign" on public.campaigns;
create policy "anyone authenticated can create a campaign"
  on public.campaigns for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "members update campaigns" on public.campaigns;
create policy "members update campaigns"
  on public.campaigns for update
  to authenticated
  using (owner_id = auth.uid() or public.is_campaign_member(id))
  with check (owner_id = auth.uid() or public.is_campaign_member(id));

drop policy if exists "owners delete campaigns" on public.campaigns;
create policy "owners delete campaigns"
  on public.campaigns for delete
  to authenticated
  using (owner_id = auth.uid());

-- campaign_members ----------------------------------------------------------
drop policy if exists "members read membership" on public.campaign_members;
create policy "members read membership"
  on public.campaign_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_campaign_member(campaign_id));

drop policy if exists "users join campaigns" on public.campaign_members;
create policy "users join campaigns"
  on public.campaign_members for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users update their membership" on public.campaign_members;
create policy "users update their membership"
  on public.campaign_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users leave campaigns" on public.campaign_members;
create policy "users leave campaigns"
  on public.campaign_members for delete
  to authenticated
  using (user_id = auth.uid());

-- messages ------------------------------------------------------------------
drop policy if exists "members read messages" on public.messages;
create policy "members read messages"
  on public.messages for select
  to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists "members post messages" on public.messages;
create policy "members post messages"
  on public.messages for insert
  to authenticated
  with check (public.is_campaign_member(campaign_id));

-- dice_rolls ----------------------------------------------------------------
drop policy if exists "members read rolls" on public.dice_rolls;
create policy "members read rolls"
  on public.dice_rolls for select
  to authenticated
  using (public.is_campaign_member(campaign_id));

drop policy if exists "members post rolls" on public.dice_rolls;
create policy "members post rolls"
  on public.dice_rolls for insert
  to authenticated
  with check (public.is_campaign_member(campaign_id) and user_id = auth.uid());

-- ===========================================================================
-- Realtime: broadcast inserts/updates to connected clients
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end$$;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.dice_rolls;
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.campaign_members;

-- Ensure UPDATE/DELETE payloads include the full previous row for realtime.
alter table public.campaigns replica identity full;
alter table public.campaign_members replica identity full;
