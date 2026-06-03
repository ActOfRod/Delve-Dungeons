-- Account vault for tradable items (separate from hero-carried gear).
alter table public.profiles
  add column if not exists vault_inventory jsonb not null default '[]'::jsonb;
