-- AI Dungeon Master voice narration (Gemini TTS), toggled per campaign.
alter table public.campaigns
  add column if not exists dm_voice_enabled boolean not null default false;
