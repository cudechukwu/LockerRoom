-- RPC to insert a channel message (supports threads) and return parent metadata
-- Run after thread_schema.sql so triggers/indexes exist

begin;

create or replace function public.send_channel_message(
  p_channel_id uuid,
  p_content text default null,
  p_message_type text default 'text',
  p_parent_message_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_sender_id uuid := auth.uid();
  v_parent_context record;
  v_message record;
  v_parent record;
  v_parent_fetched boolean := false;
  v_parent_json jsonb := null;
begin
  if v_sender_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select team_id into v_team_id
  from channels
  where id = p_channel_id;

  if not found then
    raise exception 'CHANNEL_NOT_FOUND';
  end if;

  -- Ensure the user is a member of the channel before allowing post
  if not exists (
    select 1
    from channel_members
    where channel_id = p_channel_id
      and user_id = v_sender_id
  ) then
    raise exception 'CHANNEL_ACCESS_DENIED';
  end if;

  if p_parent_message_id is not null then
    select id,
           channel_id,
           team_id
      into v_parent_context
      from messages
      where id = p_parent_message_id;

    if not found then
      raise exception 'THREAD_PARENT_NOT_FOUND';
    end if;

    if v_parent_context.channel_id <> p_channel_id then
      raise exception 'THREAD_PARENT_CHANNEL_MISMATCH';
    end if;

    if v_parent_context.team_id is not null and v_parent_context.team_id <> v_team_id then
      raise exception 'THREAD_PARENT_TEAM_MISMATCH';
    end if;
  end if;

  insert into messages (
    channel_id,
    team_id,
    sender_id,
    content,
    message_type,
    reply_to_message_id,
    parent_message_id
  )
  values (
    p_channel_id,
    v_team_id,
    v_sender_id,
    nullif(trim(coalesce(p_content, '')),'') ,
    coalesce(p_message_type, 'text'),
    p_parent_message_id,
    p_parent_message_id
  )
  returning id,
            channel_id,
            team_id,
            sender_id,
            content,
            message_type,
            reply_to_message_id,
            parent_message_id,
            thread_reply_count,
            last_thread_reply_at,
            thread_last_reply_author_id,
            is_edited,
            is_pinned,
            created_at,
            updated_at
    into v_message;

  -- Update channel activity timestamp
  update channels
    set updated_at = now()
    where id = p_channel_id;

  if p_parent_message_id is not null then
    select id,
           channel_id,
           team_id,
           sender_id,
           content,
           message_type,
           reply_to_message_id,
           parent_message_id,
           thread_reply_count,
           last_thread_reply_at,
           thread_last_reply_author_id,
           is_edited,
           is_pinned,
           created_at,
           updated_at
      into v_parent
      from messages
      where id = p_parent_message_id;
    v_parent_fetched := found;
    
    -- Build parent JSON only if record was successfully fetched
    if v_parent_fetched then
      v_parent_json := jsonb_build_object(
        'id', v_parent.id,
        'channel_id', v_parent.channel_id,
        'team_id', v_parent.team_id,
        'sender_id', v_parent.sender_id,
        'content', v_parent.content,
        'message_type', v_parent.message_type,
        'reply_to_message_id', v_parent.reply_to_message_id,
        'parent_message_id', v_parent.parent_message_id,
        'thread_reply_count', coalesce(v_parent.thread_reply_count, 0),
        'last_thread_reply_at', v_parent.last_thread_reply_at,
        'thread_last_reply_author_id', v_parent.thread_last_reply_author_id,
        'is_edited', v_parent.is_edited,
        'is_pinned', v_parent.is_pinned,
        'created_at', v_parent.created_at,
        'updated_at', v_parent.updated_at
      );
    end if;
  end if;

  return jsonb_build_object(
    'message', jsonb_build_object(
      'id', v_message.id,
      'channel_id', v_message.channel_id,
      'team_id', v_message.team_id,
      'sender_id', v_message.sender_id,
      'content', v_message.content,
      'message_type', v_message.message_type,
      'reply_to_message_id', v_message.reply_to_message_id,
      'parent_message_id', v_message.parent_message_id,
      'thread_reply_count', coalesce(v_message.thread_reply_count, 0),
      'last_thread_reply_at', v_message.last_thread_reply_at,
      'thread_last_reply_author_id', v_message.thread_last_reply_author_id,
      'is_edited', v_message.is_edited,
      'is_pinned', v_message.is_pinned,
      'created_at', v_message.created_at,
      'updated_at', v_message.updated_at
    ),
    'parent', v_parent_json
  );
end;
$$;

commit;
