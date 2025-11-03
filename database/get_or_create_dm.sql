-- Atomic get-or-create for a 1:1 direct message channel
-- Params:
--   p_team_id      uuid
--   p_user_a       uuid
--   p_user_b       uuid
--   p_channel_name text  -- display name fallback
-- Returns: channels row

create or replace function public.get_or_create_dm(
  p_team_id uuid,
  p_user_a uuid,
  p_user_b uuid,
  p_channel_name text default 'Direct Message'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_channel channels;
  v_user1   uuid;
  v_user2   uuid;
begin
  -- Serialize by team+pair to avoid races under concurrency
  perform pg_advisory_xact_lock(
    ('x' || substr(md5(p_team_id::text || ':' || p_user_a::text || ':' || p_user_b::text), 1, 16))::bit(64)::bigint
  );

  -- normalize order to avoid race conditions on parameter order
  if p_user_a <= p_user_b then
    v_user1 := p_user_a;
    v_user2 := p_user_b;
  else
    v_user1 := p_user_b;
    v_user2 := p_user_a;
  end if;

  -- look for an existing dm that has both users as members
  select c.* into v_channel
  from channels c
    join channel_members m1 on m1.channel_id = c.id and m1.user_id = v_user1
    join channel_members m2 on m2.channel_id = c.id and m2.user_id = v_user2
  where c.team_id = p_team_id and c.type = 'dm'
  limit 1;

  if found then
    return (
      select jsonb_build_object(
        'channel', to_jsonb(c.*),
        'members', coalesce(jsonb_agg(to_jsonb(m.*)) filter (where m.user_id is not null), '[]'::jsonb)
      )
      from channels c
      left join channel_members m on m.channel_id = c.id
      where c.id = v_channel.id
      group by c.id
    );
  end if;

  begin
    -- create the channel
    insert into channels (team_id, name, description, type, is_private, visibility, created_by)
    values (p_team_id, p_channel_name, 'Direct message', 'dm', true, 'hidden', v_user1)
    returning * into v_channel;

    -- add both members
    insert into channel_members (channel_id, user_id, role, added_by)
    values
      (v_channel.id, v_user1, 'admin', v_user1),
      (v_channel.id, v_user2, 'member', v_user1);
  exception when unique_violation then
    -- If a concurrent tx created it, fetch and return existing
    select c.* into v_channel
    from channels c
      join channel_members m1 on m1.channel_id = c.id and m1.user_id = v_user1
      join channel_members m2 on m2.channel_id = c.id and m2.user_id = v_user2
    where c.team_id = p_team_id and c.type = 'dm'
    limit 1;
  end;

  return (
    select jsonb_build_object(
      'channel', to_jsonb(c.*),
      'members', coalesce(jsonb_agg(to_jsonb(m.*)) filter (where m.user_id is not null), '[]'::jsonb)
    )
    from channels c
    left join channel_members m on m.channel_id = c.id
    where c.id = v_channel.id
    group by c.id
  );
end;
$$;


