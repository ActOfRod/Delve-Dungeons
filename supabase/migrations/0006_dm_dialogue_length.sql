-- How verbose the AI Dungeon Master should narrate (set at campaign creation).
alter table public.campaigns
  add column if not exists dm_dialogue_length text not null default 'measured'
  check (dm_dialogue_length in ('brief', 'measured', 'long_winded'));
