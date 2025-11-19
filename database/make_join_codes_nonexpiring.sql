-- Allow team join codes to remain active indefinitely unless manually rotated
alter table team_join_codes
  alter column expires_at drop not null;

-- Clear any existing expiration timestamps to convert legacy codes
update team_join_codes
set expires_at = null;


