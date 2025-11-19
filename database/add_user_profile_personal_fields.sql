-- Add personal fields to user_profiles for onboarding
alter table user_profiles
  add column if not exists primary_role member_role,
  add column if not exists preferred_jersey_number integer,
  add column if not exists primary_position varchar(100),
  add column if not exists last_active_team_id uuid references teams(id) on delete set null,
  add column if not exists updated_at timestamptz default now();

create or replace function update_user_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_profiles_updated_at on user_profiles;
create trigger trg_user_profiles_updated_at
before update on user_profiles
for each row
execute function update_user_profiles_updated_at();

-- Seed sensible defaults for existing profiles
update user_profiles
set primary_role = coalesce(primary_role, 'player')
where primary_role is null;

update user_profiles
set last_active_team_id = null
where last_active_team_id is not null
  and last_active_team_id not in (select id from teams);

alter table user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can view and edit their own profiles'
  ) then
    create policy "Users can view and edit their own profiles"
    on user_profiles
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;


