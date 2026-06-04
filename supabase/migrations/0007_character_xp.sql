-- Experience points and leveling for heroes.

alter table public.characters
  add column if not exists xp int not null default 0;

create or replace function public.award_character_xp(
  p_character_id uuid,
  p_amount int,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_char public.characters%rowtype;
  v_old_level int;
  v_new_level int;
  v_new_xp int;
  v_thresholds int[] := array[
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
  ];
  v_hit_die int;
  v_con_mod int;
  v_hp_gain int;
  v_level int;
  v_max_level int := 20;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'XP amount must be positive';
  end if;

  if not exists (
    select 1
    from public.campaign_members cm_me
    join public.campaign_members cm_char
      on cm_char.campaign_id = cm_me.campaign_id
    where cm_me.user_id = auth.uid()
      and cm_char.character_id = p_character_id
  ) then
    raise exception 'Not authorized to award XP to this character';
  end if;

  select * into v_char
  from public.characters
  where id = p_character_id
  for update;

  if not found then
    raise exception 'Character not found';
  end if;

  v_old_level := v_char.level;
  v_new_xp := v_char.xp + p_amount;

  v_new_level := 1;
  for v_level in reverse array_length(v_thresholds, 1)..1 loop
    if v_new_xp >= v_thresholds[v_level] then
      v_new_level := v_level;
      exit;
    end if;
  end loop;

  if v_new_level > v_max_level then
    v_new_level := v_max_level;
  end if;

  v_hit_die := case v_char.klass
    when 'Barbarian' then 12
    when 'Fighter' then 10
    when 'Paladin' then 10
    when 'Ranger' then 10
    when 'Bard' then 8
    when 'Cleric' then 8
    when 'Druid' then 8
    when 'Monk' then 8
    when 'Rogue' then 8
    when 'Warlock' then 8
    when 'Sorcerer' then 6
    when 'Wizard' then 6
    else 8
  end;

  v_con_mod := floor(((v_char.abilities->>'con')::int - 10) / 2.0);
  v_hp_gain := greatest(1, (v_hit_die / 2) + 1 + v_con_mod);

  if v_new_level > v_old_level then
    v_char.max_hp := v_char.max_hp + (v_hp_gain * (v_new_level - v_old_level));
    v_char.current_hp := least(v_char.max_hp, v_char.current_hp + (v_hp_gain * (v_new_level - v_old_level)));
    v_char.level := v_new_level;
  end if;

  v_char.xp := v_new_xp;

  update public.characters
  set
    xp = v_char.xp,
    level = v_char.level,
    max_hp = v_char.max_hp,
    current_hp = v_char.current_hp
  where id = p_character_id;

  return jsonb_build_object(
    'character_id', p_character_id,
    'character_name', v_char.name,
    'xp_awarded', p_amount,
    'xp_total', v_new_xp,
    'level', v_char.level,
    'previous_level', v_old_level,
    'leveled_up', v_char.level > v_old_level,
    'max_hp', v_char.max_hp,
    'current_hp', v_char.current_hp,
    'reason', p_reason
  );
end;
$$;

revoke all on function public.award_character_xp(uuid, int, text) from public;
grant execute on function public.award_character_xp(uuid, int, text) to authenticated;

alter table public.characters replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.characters;
  end if;
exception
  when duplicate_object then null;
end$$;
