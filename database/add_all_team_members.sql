-- Add all 34 Wesleyan Cardinals team members to the team_members table
-- Run this in your Supabase SQL editor

-- COACHES (4)
INSERT INTO team_members (team_id, user_id, role) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e0b53182-d8ca-491e-9a8c-f24db1ebd8df', 'coach'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<USER_ID>', 'coach'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6', 'coach'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6', 'coach')
ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- TRAINERS (3)
INSERT INTO team_members (team_id, user_id, role) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7', 'trainer'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8', 'trainer'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9', 'trainer')
ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- PLAYERS (27)
INSERT INTO team_members (team_id, user_id, role) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'h8i9j0k1-l2m3-n4o5-p6q7-r8s9t0u1v2w3', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'j0k1l2m3-n4o5-p6q7-r8s9-t0u1v2w3x4y5', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'k1l2m3n4-o5p6-q7r8-s9t0-u1v2w3x4y5z6', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'l2m3n4o5-p6q7-r8s9-t0u1-v2w3x4y5z6a7', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'm3n4o5p6-q7r8-s9t0-u1v2-w3x4y5z6a7b8', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'n4o5p6q7-r8s9-t0u1-v2w3-x4y5z6a7b8c9', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'o5p6q7r8-s9t0-u1v2-w3x4-y5z6a7b8c9d0', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'p6q7r8s9-t0u1-v2w3-x4y5-z6a7b8c9d0e1', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'q7r8s9t0-u1v2-w3x4-y5z6-a7b8c9d0e1f2', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'r8s9t0u1-v2w3-x4y5-z6a7-b8c9d0e1f2g3', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 's9t0u1v2-w3x4-y5z6-a7b8-c9d0e1f2g3h4', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 't0u1v2w3-x4y5-z6a7-b8c9-d0e1f2g3h4i5', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'u1v2w3x4-y5z6-a7b8-c9d0-e1f2g3h4i5j6', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v2w3x4y5-z6a7-b8c9-d0e1-f2g3h4i5j6k7', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'w3x4y5z6-a7b8-c9d0-e1f2-g3h4i5j6k7l8', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x4y5z6a7-b8c9-d0e1-f2g3-h4i5j6k7l8m9', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'y5z6a7b8-c9d0-e1f2-g3h4-i5j6k7l8m9n0', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'z6a7b8c9-d0e1-f2g3-h4i5-j6k7l8m9n0o1', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a7b8c9d0-e1f2-g3h4-i5j6-k7l8m9n0o1p2', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b8c9d0e1-f2g3-h4i5-j6k7-l8m9n0o1p2q3', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c9d0e1f2-g3h4-i5j6-k7l8-m9n0o1p2q3r4', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd0e1f2g3-h4i5-j6k7-l8m9-n0o1p2q3r4s5', 'player'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e1f2g3h4-i5j6-k7l8-m9n0-o1p2q3r4s5t6', 'player')
ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Show the results
SELECT 
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.joined_at,
  t.name as team_name
FROM team_members tm
LEFT JOIN teams t ON tm.team_id = t.id
ORDER BY tm.role, tm.joined_at;

-- Count by role
SELECT 
  role,
  COUNT(*) as count
FROM team_members 
WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
GROUP BY role
ORDER BY role;


