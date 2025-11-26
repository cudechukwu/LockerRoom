-- Test the exact policy condition with your actual values
-- This simulates what the RLS policy checks

-- Simulate the INSERT values
WITH insert_values AS (
    SELECT 
        'ddced7b8-e45b-45f9-ac31-96b2045f40e8'::uuid AS team_id,
        'e163e9b2-55ea-49aa-a8e7-3c83bf550d74'::uuid AS user_id,
        '8d99f216-1454-4500-9652-f87922774f5c'::uuid AS auth_user_id
)
SELECT 
    'Policy condition test' AS test_name,
    iv.auth_user_id AS current_user,
    iv.user_id AS target_user,
    iv.team_id AS team_id,
    -- Check 1: auth.uid() IS NOT NULL
    (iv.auth_user_id IS NOT NULL) AS check1_auth_not_null,
    -- Check 2: Current user is coach/admin
    (
        EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = iv.team_id
            AND tmr.user_id = iv.auth_user_id
            AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
        )
        OR EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = iv.team_id
            AND tm.user_id = iv.auth_user_id
            AND (tm.role = 'coach' OR tm.is_admin = TRUE)
        )
    ) AS check2_is_coach,
    -- Check 3: Target user is in team
    (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = iv.team_id
            AND tm.user_id = iv.user_id
        )
        OR EXISTS (
            SELECT 1 FROM team_member_roles tmr
            WHERE tmr.team_id = iv.team_id
            AND tmr.user_id = iv.user_id
        )
    ) AS check3_target_in_team,
    -- Full policy check
    (
        (iv.auth_user_id IS NOT NULL)
        AND (
            EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = iv.team_id
                AND tmr.user_id = iv.auth_user_id
                AND tmr.role IN ('head_coach', 'assistant_coach', 'team_admin')
            )
            OR EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = iv.team_id
                AND tm.user_id = iv.auth_user_id
                AND (tm.role = 'coach' OR tm.is_admin = TRUE)
            )
        )
        AND (
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = iv.team_id
                AND tm.user_id = iv.user_id
            )
            OR EXISTS (
                SELECT 1 FROM team_member_roles tmr
                WHERE tmr.team_id = iv.team_id
                AND tmr.user_id = iv.user_id
            )
        )
    ) AS full_policy_should_pass
FROM insert_values iv;

