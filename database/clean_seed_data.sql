-- Clean Seed Data for Chat System
-- This script clears existing data and creates fresh sample data

-- =============================================
-- CLEAR EXISTING DATA (in reverse dependency order)
-- =============================================

-- Clear all existing data
DELETE FROM device_tokens WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
DELETE FROM message_reads WHERE message_id IN (SELECT id FROM messages WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
DELETE FROM message_tombstones WHERE message_id IN (SELECT id FROM messages WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
DELETE FROM message_edits WHERE message_id IN (SELECT id FROM messages WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
DELETE FROM message_attachments WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM messages WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM channel_members WHERE channel_id IN (SELECT id FROM channels WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
DELETE FROM channels WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM team_members WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DELETE FROM teams WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- =============================================
-- CREATE FRESH SAMPLE DATA
-- =============================================

DO $$
DECLARE
    -- Real user IDs from your auth.users table
    admin_user_id UUID := 'e0b53182-d8ca-491e-9a8c-f24db1ebd8df';
    coach_user_id UUID := '8d99f216-1454-4500-9652-f87922774f5c';
    
    -- Team and channel IDs
    sample_team_id UUID;
    team_channel_id UUID;
    coach_channel_id UUID;
    trainer_channel_id UUID;
    offense_channel_id UUID;
    defense_channel_id UUID;
    casual_channel_id UUID;
    announcements_channel_id UUID;
BEGIN
    -- =============================================
    -- CREATE SAMPLE TEAM
    -- =============================================
    
    INSERT INTO teams (id, name, sport, school, primary_color, secondary_color, restrict_domain, created_by) VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Wesleyan Cardinals Football',
        'football',
        'Wesleyan University',
        '#8B0000',
        '#FFFFFF',
        FALSE,
        admin_user_id
    ) RETURNING id INTO sample_team_id;
    
    -- =============================================
    -- ADD TEAM MEMBERS
    -- =============================================
    
    INSERT INTO team_members (team_id, user_id, role) VALUES
    (sample_team_id, admin_user_id, 'coach'),
    (sample_team_id, coach_user_id, 'coach');
    
    -- =============================================
    -- CREATE CHANNELS
    -- =============================================
    
    -- Main Team Chat
    INSERT INTO channels (id, team_id, name, description, type, is_private, created_by) VALUES (
        '11111111-1111-1111-1111-111111111111',
        sample_team_id,
        'general',
        'Main team chat for everyone',
        'team',
        FALSE,
        admin_user_id
    ) RETURNING id INTO team_channel_id;
    
    -- Coach Chat
    INSERT INTO channels (id, team_id, name, description, type, is_private, created_by) VALUES (
        '22222222-2222-2222-2222-222222222222',
        sample_team_id,
        'coaches',
        'Private chat for coaching staff',
        'coach',
        TRUE,
        coach_user_id
    ) RETURNING id INTO coach_channel_id;
    
    -- Trainer Chat
    INSERT INTO channels (id, team_id, name, description, type, is_private, created_by) VALUES (
        '33333333-3333-3333-3333-333333333333',
        sample_team_id,
        'trainers',
        'Private chat for training staff',
        'trainer',
        TRUE,
        admin_user_id
    ) RETURNING id INTO trainer_channel_id;
    
    -- Offense Position Group
    INSERT INTO channels (id, team_id, name, description, type, is_private, created_by) VALUES (
        '44444444-4444-4444-4444-444444444444',
        sample_team_id,
        'offense',
        'Offensive players and coaches',
        'position',
        FALSE,
        coach_user_id
    ) RETURNING id INTO offense_channel_id;
    
    -- Defense Position Group
    INSERT INTO channels (id, team_id, name, description, type, is_private, created_by) VALUES (
        '55555555-5555-5555-5555-555555555555',
        sample_team_id,
        'defense',
        'Defensive players and coaches',
        'position',
        FALSE,
        coach_user_id
    ) RETURNING id INTO defense_channel_id;
    
    -- Casual LockerRoom Chat
    INSERT INTO channels (id, team_id, name, description, type, is_private, created_by) VALUES (
        '66666666-6666-6666-6666-666666666666',
        sample_team_id,
        'locker-room',
        'Casual chat, memes, and team bonding',
        'casual',
        FALSE,
        admin_user_id
    ) RETURNING id INTO casual_channel_id;
    
    -- Announcements Channel
    INSERT INTO channels (id, team_id, name, description, type, is_private, is_announcements, created_by) VALUES (
        '77777777-7777-7777-7777-777777777777',
        sample_team_id,
        'announcements',
        'Important team announcements and priority alerts',
        'team',
        FALSE,
        TRUE,
        admin_user_id
    ) RETURNING id INTO announcements_channel_id;
    
    -- =============================================
    -- ADD CHANNEL MEMBERS
    -- =============================================
    
    -- Main Team Chat - Both users
    INSERT INTO channel_members (channel_id, user_id, role) VALUES
    (team_channel_id, admin_user_id, 'admin'),
    (team_channel_id, coach_user_id, 'moderator');
    
    -- Coach Chat - Both users (since both are coaches)
    INSERT INTO channel_members (channel_id, user_id, role) VALUES
    (coach_channel_id, admin_user_id, 'admin'),
    (coach_channel_id, coach_user_id, 'admin');
    
    -- Trainer Chat - Admin user only
    INSERT INTO channel_members (channel_id, user_id, role) VALUES
    (trainer_channel_id, admin_user_id, 'admin');
    
    -- Offense - Both users
    INSERT INTO channel_members (channel_id, user_id, role) VALUES
    (offense_channel_id, admin_user_id, 'admin'),
    (offense_channel_id, coach_user_id, 'moderator');
    
    -- Defense - Both users
    INSERT INTO channel_members (channel_id, user_id, role) VALUES
    (defense_channel_id, admin_user_id, 'admin'),
    (defense_channel_id, coach_user_id, 'moderator');
    
    -- Casual Chat - Both users
    INSERT INTO channel_members (channel_id, user_id, role) VALUES
    (casual_channel_id, admin_user_id, 'admin'),
    (casual_channel_id, coach_user_id, 'moderator');
    
    -- Announcements - Both users
    INSERT INTO channel_members (channel_id, user_id, role) VALUES
    (announcements_channel_id, admin_user_id, 'admin'),
    (announcements_channel_id, coach_user_id, 'moderator');
    
    -- =============================================
    -- SAMPLE MESSAGES
    -- =============================================
    
    -- Welcome message in general chat
    INSERT INTO messages (channel_id, team_id, sender_id, content, message_type) VALUES
    (team_channel_id, sample_team_id, admin_user_id, 'Welcome to the team chat! This is where we communicate as a team.', 'text'),
    (team_channel_id, sample_team_id, coach_user_id, 'Practice is at 3 PM today. Be ready!', 'text');
    
    -- Coach chat message
    INSERT INTO messages (channel_id, team_id, sender_id, content, message_type) VALUES
    (coach_channel_id, sample_team_id, coach_user_id, 'Need to discuss the game plan for Saturday.', 'text');
    
    -- Offense chat message
    INSERT INTO messages (channel_id, team_id, sender_id, content, message_type) VALUES
    (offense_channel_id, sample_team_id, coach_user_id, 'Offense, let''s work on the new playbook today.', 'text');
    
    -- Casual chat message
    INSERT INTO messages (channel_id, team_id, sender_id, content, message_type) VALUES
    (casual_channel_id, sample_team_id, admin_user_id, 'Anyone want to grab food after practice?', 'text');
    
    -- Announcement
    INSERT INTO messages (channel_id, team_id, sender_id, content, message_type) VALUES
    (announcements_channel_id, sample_team_id, admin_user_id, 'Team meeting tomorrow at 2 PM in the locker room. Attendance required.', 'announcement');
    
    -- =============================================
    -- SAMPLE REACTIONS
    -- =============================================
    
    -- Add some reactions to messages
    INSERT INTO reactions (message_id, user_id, emoji) 
    SELECT m.id, coach_user_id, '👍'
    FROM messages m 
    WHERE m.sender_id = admin_user_id AND m.channel_id = team_channel_id
    LIMIT 1;
    
    INSERT INTO reactions (message_id, user_id, emoji) 
    SELECT m.id, admin_user_id, '🔥'
    FROM messages m 
    WHERE m.sender_id = admin_user_id AND m.channel_id = casual_channel_id
    LIMIT 1;
    
    -- =============================================
    -- SAMPLE DEVICE TOKENS (for push notifications)
    -- =============================================
    
    INSERT INTO device_tokens (user_id, team_id, token, platform) VALUES
    (admin_user_id, sample_team_id, 'sample_admin_token_123', 'ios'),
    (coach_user_id, sample_team_id, 'sample_coach_token_456', 'android');
    
    RAISE NOTICE 'Clean seed data created successfully!';
    RAISE NOTICE 'Team ID: %', sample_team_id;
    RAISE NOTICE 'Channels created: general, coaches, trainers, offense, defense, locker-room, announcements';
    RAISE NOTICE 'Users: admin (coach), coach';
    
END $$;
