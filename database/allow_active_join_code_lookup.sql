-- Allow anyone who can reach the API (anon/auth) to validate an active join code
drop policy if exists "Anyone can look up active join codes" on team_join_codes;

create policy "Anyone can look up active join codes"
on team_join_codes
for select
using (is_active = true);


