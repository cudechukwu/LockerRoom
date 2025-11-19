-- Helper view for resolving a user's team memberships
drop view if exists user_teams;

create view user_teams as
select
  tm.user_id,
  tm.team_id,
  t.name as team_name,
  t.logo_url as team_logo_url,
  t.primary_color,
  t.secondary_color,
  t.sport,
  tm.role,
  tm.is_admin,
  tm.joined_at
from team_members tm
join teams t on t.id = tm.team_id;

grant select on user_teams to authenticated, service_role;


