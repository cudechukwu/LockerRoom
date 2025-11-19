-- Allow users entering a valid join code to insert themselves into team_members
drop policy if exists "Join by code" on team_members;

create policy "Join by code"
on team_members
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from team_join_codes
    where team_join_codes.team_id = team_members.team_id
      and team_join_codes.is_active = true
  )
);


