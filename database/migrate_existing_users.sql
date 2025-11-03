-- Migration script to populate existing users with profile data
-- This creates basic profiles for users who were created before the profile system

-- First, create user_profiles for all existing users who don't have them
INSERT INTO user_profiles (user_id, display_name, bio, created_at, updated_at)
SELECT 
    u.id as user_id,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) as display_name,
    'Profile created during migration' as bio,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- Create team_member_profiles for all existing team members who don't have them
INSERT INTO team_member_profiles (
    team_id, 
    user_id, 
    jersey_number, 
    position, 
    class_year, 
    staff_title, 
    department, 
    is_complete, 
    created_at, 
    updated_at
)
SELECT 
    tm.team_id,
    tm.user_id,
    CASE 
        WHEN tm.role = 'player' THEN 
            -- Generate a random jersey number between 1-99 for players
            (RANDOM() * 98 + 1)::INTEGER
        ELSE NULL 
    END as jersey_number,
    CASE 
        WHEN tm.role = 'player' THEN 
            -- Assign common football positions
            CASE (RANDOM() * 10)::INT
                WHEN 0 THEN 'Quarterback'
                WHEN 1 THEN 'Running Back'
                WHEN 2 THEN 'Wide Receiver'
                WHEN 3 THEN 'Tight End'
                WHEN 4 THEN 'Offensive Line'
                WHEN 5 THEN 'Defensive Line'
                WHEN 6 THEN 'Linebacker'
                WHEN 7 THEN 'Cornerback'
                WHEN 8 THEN 'Safety'
                ELSE 'Special Teams'
            END
        ELSE NULL 
    END as position,
    CASE 
        WHEN tm.role = 'player' THEN 
            -- Assign random class year
            CASE (RANDOM() * 4)::INT
                WHEN 0 THEN 'Freshman'
                WHEN 1 THEN 'Sophomore'
                WHEN 2 THEN 'Junior'
                ELSE 'Senior'
            END
        ELSE NULL 
    END as class_year,
    CASE 
        WHEN tm.role = 'coach' THEN 'Assistant Coach'
        WHEN tm.role = 'trainer' THEN 'Athletic Trainer'
        WHEN tm.role = 'assistant' THEN 'Assistant Coach'
        ELSE NULL 
    END as staff_title,
    CASE 
        WHEN tm.role IN ('coach', 'trainer', 'assistant') THEN 'Football'
        ELSE NULL 
    END as department,
    -- Mark as complete if we have the required fields
    CASE 
        WHEN tm.role = 'player' THEN true  -- We're providing jersey, position, class_year
        WHEN tm.role IN ('coach', 'trainer', 'assistant') THEN true  -- We're providing title, department
        ELSE false
    END as is_complete,
    NOW() as created_at,
    NOW() as updated_at
FROM team_members tm
LEFT JOIN team_member_profiles tmp ON tm.team_id = tmp.team_id AND tm.user_id = tmp.user_id
WHERE tmp.team_id IS NULL;

-- Create some sample player stats for existing players
INSERT INTO player_stats (team_id, user_id, season, games_played, metrics, created_at, updated_at)
SELECT 
    tm.team_id,
    tm.user_id,
    '2024-2025' as season,
    (RANDOM() * 10 + 5)::INTEGER as games_played,  -- 5-15 games
    jsonb_build_object(
        'passing_yards', (RANDOM() * 2000 + 500)::INTEGER,
        'rushing_yards', (RANDOM() * 800 + 100)::INTEGER,
        'touchdowns', (RANDOM() * 15 + 2)::INTEGER,
        'completion_percentage', (RANDOM() * 20 + 70)::NUMERIC(5,2),
        'tackles', (RANDOM() * 50 + 10)::INTEGER,
        'interceptions', (RANDOM() * 5)::INTEGER
    ) as metrics,
    NOW() as created_at,
    NOW() as updated_at
FROM team_members tm
LEFT JOIN player_stats ps ON tm.team_id = ps.team_id AND tm.user_id = ps.user_id AND ps.season = '2024-2025'
WHERE tm.role = 'player' AND ps.team_id IS NULL;

-- Show summary of what was created
SELECT 
    'Migration Summary' as status,
    (SELECT COUNT(*) FROM user_profiles) as user_profiles_created,
    (SELECT COUNT(*) FROM team_member_profiles) as team_profiles_created,
    (SELECT COUNT(*) FROM player_stats) as player_stats_created;
