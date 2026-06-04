-- The Hearth: daily riddle / puzzle progress and riddle streak (per account).

alter table public.profiles
  add column if not exists hearth_state jsonb not null default '{}'::jsonb;
