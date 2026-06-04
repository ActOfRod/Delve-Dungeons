-- Track which General shop slots a character bought per calendar day (UTC).
-- Shape: { "2026-06-03": [1, 3], "2026-06-04": [2] }

alter table public.characters
  add column if not exists general_shop_purchases jsonb not null default '{}'::jsonb;
