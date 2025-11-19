-- Threaded chat schema migration
-- Date: 2025-02-21

begin;

-- 1. Add thread metadata columns to messages table
alter table messages
  add column if not exists parent_message_id uuid references messages(id) on delete cascade,
  add column if not exists thread_reply_count integer not null default 0,
  add column if not exists last_thread_reply_at timestamptz,
  add column if not exists thread_last_reply_author_id uuid;

-- Ensure thread counter stays non-null for existing rows
update messages set thread_reply_count = 0 where thread_reply_count is null;

-- 2. Indexes for threaded queries
create index if not exists messages_parent_created_idx
  on messages (parent_message_id, created_at);

create index if not exists messages_channel_last_thread_reply_idx
  on messages (channel_id, last_thread_reply_at desc);

-- Index to accelerate fetching top-level messages (parent_message_id null)
create index if not exists messages_channel_top_level_idx
  on messages (channel_id, created_at desc)
  where parent_message_id is null;

-- 3. Trigger to bump parent metadata when a reply is inserted
create or replace function bump_thread_metadata()
returns trigger as $$
begin
  if new.parent_message_id is null then
    return new;
  end if;

  update messages
    set thread_reply_count = coalesce(thread_reply_count, 0) + 1,
        last_thread_reply_at = greatest(coalesce(last_thread_reply_at, new.created_at), new.created_at),
        thread_last_reply_author_id = new.sender_id
  where id = new.parent_message_id;

  return new;
end;
$$ language plpgsql;

create trigger trg_messages_thread_counter
  after insert on messages
  for each row execute function bump_thread_metadata();

-- Ensure replies belong to the same channel as the parent
create or replace function validate_thread_parent_channel()
returns trigger as $$
declare
  parent_channel uuid;
begin
  if new.parent_message_id is null then
    return new;
  end if;

  select channel_id into parent_channel
  from messages
  where id = new.parent_message_id;

  if parent_channel is null then
    raise exception 'Parent message % does not exist', new.parent_message_id;
  end if;

  if parent_channel <> new.channel_id then
    raise exception 'Thread reply must belong to the same channel as its parent';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_messages_validate_thread_parent
  before insert on messages
  for each row execute function validate_thread_parent_channel();

-- 4. Optional: decrement counter on delete
create or replace function reduce_thread_metadata()
returns trigger as $$
begin
  if old.parent_message_id is null then
    return old;
  end if;

  update messages
    set thread_reply_count = greatest(coalesce(thread_reply_count, 1) - 1, 0)
  where id = old.parent_message_id;

  return old;
end;
$$ language plpgsql;

create trigger trg_messages_thread_counter_delete
  after delete on messages
  for each row execute function reduce_thread_metadata();

-- 5. Optional: thread_reads table for future per-thread read tracking
create table if not exists thread_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_message_id uuid not null references messages(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, parent_message_id)
);

commit;
