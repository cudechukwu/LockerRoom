-- Allow All Team Members to Create Attendance Groups
-- Previously only coaches could create groups, but now anyone can create their own groups

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Coaches can insert attendance groups" ON attendance_groups;
DROP POLICY IF EXISTS "Coaches can update attendance groups" ON attendance_groups;
DROP POLICY IF EXISTS "Coaches can delete attendance groups" ON attendance_groups;
DROP POLICY IF EXISTS "Coaches can insert group members" ON attendance_group_members;
DROP POLICY IF EXISTS "Coaches can delete group members" ON attendance_group_members;

-- New policies: All team members can create groups
-- Users can only edit/delete groups they created (unless they're coaches/admins)

-- All team members can insert groups
CREATE POLICY "Team members can insert attendance groups" ON attendance_groups
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_groups.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Users can update groups they created, or coaches/admins can update any group
CREATE POLICY "Users can update their own groups or coaches can update any" ON attendance_groups
    FOR UPDATE
    USING (
        -- User created the group
        created_by = auth.uid()
        OR
        -- User is a coach/admin
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR
        -- Fallback: Check team_members table
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_groups.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = true)
        )
    )
    WITH CHECK (
        -- User created the group
        created_by = auth.uid()
        OR
        -- User is a coach/admin
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR
        -- Fallback: Check team_members table
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_groups.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = true)
        )
    );

-- Users can delete groups they created, or coaches/admins can delete any group
CREATE POLICY "Users can delete their own groups or coaches can delete any" ON attendance_groups
    FOR DELETE
    USING (
        -- User created the group
        created_by = auth.uid()
        OR
        -- User is a coach/admin
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_groups.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR
        -- Fallback: Check team_members table
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_groups.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = true)
        )
    );

-- All team members can add members to groups (they can add themselves or others to their own groups)
-- Coaches can add members to any group
CREATE POLICY "Team members can add members to groups" ON attendance_group_members
    FOR INSERT
    WITH CHECK (
        -- User is a team member
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_group_members.team_id
            AND tm.user_id = auth.uid()
        )
        AND
        (
            -- User created the group (can add anyone)
            EXISTS (
                SELECT 1 FROM attendance_groups ag
                WHERE ag.id = attendance_group_members.group_id
                AND ag.created_by = auth.uid()
            )
            OR
            -- User is a coach/admin (can add to any group)
            EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = attendance_group_members.team_id
                AND tmr.user_id = auth.uid()
                AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
            )
            OR
            -- Fallback: Check team_members table for coach/admin
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = attendance_group_members.team_id
                AND tm.user_id = auth.uid()
                AND (tm.role = 'coach' OR tm.is_admin = true)
            )
        )
    );

-- Users can remove members from groups they created, or coaches can remove from any group
CREATE POLICY "Users can remove members from their groups or coaches can remove from any" ON attendance_group_members
    FOR DELETE
    USING (
        -- User created the group
        EXISTS (
            SELECT 1 FROM attendance_groups ag
            WHERE ag.id = attendance_group_members.group_id
            AND ag.created_by = auth.uid()
        )
        OR
        -- User is a coach/admin
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = attendance_group_members.team_id
            AND tmr.user_id = auth.uid()
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR
        -- Fallback: Check team_members table
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = attendance_group_members.team_id
            AND tm.user_id = auth.uid()
            AND (tm.role = 'coach' OR tm.is_admin = true)
        )
    );

