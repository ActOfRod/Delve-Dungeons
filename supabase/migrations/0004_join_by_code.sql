-- ===========================================================================
-- Delve Dungeons — join a campaign by invite code
-- A non-member can't read a campaign row under RLS, so they can't look it up
-- by code to join. This SECURITY DEFINER function performs the lookup and the
-- join with elevated privileges, while still acting as the calling user.
-- Run this in the Supabase SQL editor after 0001–0003. Safe to re-run.
-- ===========================================================================

create or replace function public.join_campaign_by_code(
  p_code text,
  p_character_id uuid
)
returns table (
  campaign_id uuid,
  campaign_name text,
  owner_id uuid,
  is_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns;
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select * into v_campaign
  from public.campaigns
  where invite_code = upper(trim(p_code));

  -- No campaign for that code → return no rows (caller shows "not found").
  if v_campaign.id is null then
    return;
  end if;

  select cm.id into v_existing
  from public.campaign_members cm
  where cm.campaign_id = v_campaign.id and cm.user_id = v_uid;

  select count(*) into v_count
  from public.campaign_members cm
  where cm.campaign_id = v_campaign.id;

  if v_existing is null then
    insert into public.campaign_members (campaign_id, user_id, character_id, role, turn_order)
    values (v_campaign.id, v_uid, p_character_id, 'player', v_count);
    is_new := true;
  else
    update public.campaign_members
      set character_id = p_character_id
      where id = v_existing;
    is_new := false;
  end if;

  campaign_id := v_campaign.id;
  campaign_name := v_campaign.name;
  owner_id := v_campaign.owner_id;
  return next;
end;
$$;

grant execute on function public.join_campaign_by_code(text, uuid) to authenticated;
