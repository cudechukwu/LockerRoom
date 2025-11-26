/**
 * useTeamMembers Hook
 * Fetches team members using React Query with proper caching and stable references
 * 
 * Performance optimizations:
 * - Uses React Query for caching and deduplication
 * - Parallel queries instead of sequential (Promise.all)
 * - In-memory filtering via useMemo (not in async code)
 * - Stable array references to prevent unnecessary re-renders
 * - Proper cancellation support via React Query
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { useCurrentUser } from './useCurrentUser';

/**
 * Fetch team members with user profiles using parallel queries
 * This is much faster than sequential queries (runs in parallel)
 * 
 * @param {Object} supabase - Supabase client
 * @param {string} teamId - Team ID
 * @param {string} userId - Current user ID (from context, not auth.getUser())
 * @param {string|null} eventId - Event ID (optional)
 * @param {boolean} useExpectedAttendees - Whether to filter by expected attendees (only for full team events)
 */
async function fetchTeamMembersWithProfiles(supabase, teamId, userId, eventId = null, useExpectedAttendees = false) {
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Step 1: Fetch expected attendees ONLY if eventId provided AND we should use them
  // Step 2: Fetch team members
  // Run both in parallel for maximum performance
  const [expectedAttendeesResult, teamMembersResult] = await Promise.all([
    (eventId && useExpectedAttendees)
      ? supabase
        .from('event_expected_attendees')
        .select('user_id')
          .eq('event_id', eventId)
      : Promise.resolve({ data: null, error: null }),
    supabase
            .from('team_members')
      .select('user_id, role, joined_at')
            .eq('team_id', teamId)
      .eq('role', 'player')
      .neq('user_id', userId) // Exclude current user
  ]);

  // Filter team members by expected attendees if available
  const expectedAttendees = expectedAttendeesResult.data;
  let teamMembers = teamMembersResult.data;
  const membersError = teamMembersResult.error;

          if (membersError) {
    throw membersError;
  }

  // Filter by expected attendees ONLY if we're using them (full team events)
  if (useExpectedAttendees && expectedAttendees && expectedAttendees.length > 0) {
    const userIds = new Set(expectedAttendees.map(ea => ea.user_id));
    teamMembers = (teamMembers || []).filter(m => userIds.has(m.user_id));
          }

  if (!teamMembers || teamMembers.length === 0) {
    return [];
          }

  // Step 3: Fetch user profiles (runs after filtering, but still fast)
  const userIdsForProfiles = teamMembers.map(m => m.user_id);
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, display_name, avatar_url')
    .in('user_id', userIdsForProfiles);

  if (profilesError && __DEV__) {
            console.warn('Error fetching user profiles:', profilesError);
          }

          // Create profile map for fast lookup
          const profileMap = new Map(
            (profiles || []).map(profile => [profile.user_id, profile])
          );

  // Process members to match expected format
  return teamMembers.map((teamMember) => {
    const profile = profileMap.get(teamMember.user_id) || {};
            const displayName = profile?.display_name && profile.display_name.trim().length > 0
              ? profile.display_name.trim()
              : null;

            const fallbackName = `User ${teamMember.user_id.slice(0, 8)}`;
            const normalizedName = displayName || fallbackName;

            const normalizedHandle = displayName
              ? `@${displayName.replace(/\s+/g, '').toLowerCase()}`
              : `@user_${teamMember.user_id.slice(0, 8)}`;

            return {
              id: teamMember.user_id,
              name: normalizedName,
              handle: normalizedHandle,
              avatarUrl: profile?.avatar_url || null,
              role: teamMember.role || 'player',
              position: null,
              isActive: true,
              joinedAt: teamMember.joined_at,
            };
          });
}

/**
 * Fetch group members for filtering (used when event has assigned groups)
 */
async function fetchGroupMembers(supabase, groupIds) {
  if (!groupIds || groupIds.length === 0) return new Set();

  const { data: groupMembers, error } = await supabase
              .from('attendance_group_members')
              .select('user_id')
    .in('group_id', groupIds);

  if (error) {
    if (__DEV__) {
      console.warn('Error fetching group members:', error);
    }
    return new Set();
  }

  return new Set((groupMembers || []).map(gm => gm.user_id));
}

/**
 * Hook to fetch team members for an event using React Query
 * @param {string} teamId - Team ID
 * @param {Object} event - Event object with id and assigned_attendance_groups
 * @returns {Object} { members, filteredMembers, isLoading, error }
 */
export function useTeamMembers(teamId, event = null) {
  const supabase = useSupabase();
  const { data: user } = useCurrentUser();
  const userId = user?.id || null;
  const eventId = event?.id || null;
  
  // Create stable string representation of assigned groups for query key
  // Sort to ensure same groups = same key even if order differs
  // IMPORTANT: Empty array, undefined, or null all mean "all" (full team event)
  const assignedGroupsKey = useMemo(() => {
    const groups = event?.assigned_attendance_groups;
    // Treat empty array, undefined, or null as "all" (full team event)
    if (!Array.isArray(groups) || groups.length === 0) {
      return 'all';
    }
    // Sort to ensure stable key regardless of array order
    return groups.slice().sort().join(',');
  }, [event?.assigned_attendance_groups]);

  // Determine if this is a full team event (no assigned groups)
  const isFullTeamEvent = assignedGroupsKey === 'all';
  
  // Expected attendees should ONLY be used for full team events
  // When groups are assigned, we filter by groups instead (groups take precedence)
  const shouldUseExpectedAttendees = isFullTeamEvent && !!eventId;

  // Fetch team members with React Query (cached, deduplicated)
  // CRITICAL: Do NOT include assignedGroupsKey in query key
  // Team members data doesn't change when groups change - only visibility changes
  // This prevents unnecessary refetches and cache misses when groups are edited
  const membersQuery = useQuery({
    queryKey: ['teamMembers', teamId, eventId],
    queryFn: () => fetchTeamMembersWithProfiles(supabase, teamId, userId, eventId, shouldUseExpectedAttendees),
    enabled: !!teamId && !!supabase && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch group members ONLY if event has assigned groups (not full team event)
  // CRITICAL: Never fetch when assignedGroupsKey === 'all' to prevent ghost cache entries
  // The enabled guard prevents the query from running, but we also guard in queryFn for safety
  const groupMembersQuery = useQuery({
    queryKey: ['groupMembers', assignedGroupsKey],
    queryFn: () => {
      // CRITICAL: Never fetch for "all" - this should be prevented by enabled guard
      // but we check here too to prevent any edge cases or stale cache entries
      if (assignedGroupsKey === 'all') {
        return new Set();
      }
      
      const groups = event?.assigned_attendance_groups;
      // Double-check: should never happen due to enabled guard, but be safe
      if (!Array.isArray(groups) || groups.length === 0) {
        return new Set();
      }
      return fetchGroupMembers(supabase, groups);
    },
    // CRITICAL: Only enable when we have groups AND it's explicitly NOT "all"
    // This prevents unnecessary queries for full team events and ghost cache entries
    enabled: !!teamId && !!supabase && !!event && assignedGroupsKey !== 'all',
    staleTime: 5 * 60 * 1000, // 5 minutes cache (groups change less frequently)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Filter members by assigned groups in-memory (not in async code)
  // This is memoized and only recomputes when data actually changes
  const filteredMembers = useMemo(() => {
    const allMembers = membersQuery.data || [];
    
    // If no event or full team event, return all members
    if (!event || assignedGroupsKey === 'all') {
      return allMembers;
    }

    // Filter by group membership
    const userIdsInGroups = groupMembersQuery.data || new Set();
    if (userIdsInGroups.size === 0) {
      return allMembers; // Fallback to all if group fetch failed
    }

    return allMembers.filter(member => userIdsInGroups.has(member.id));
  }, [membersQuery.data, groupMembersQuery.data, event, assignedGroupsKey]);

  // Stabilize return object to prevent unnecessary re-renders
  // This makes React.memo() actually work in components using this hook
  return useMemo(() => ({
    members: filteredMembers,
    filteredMembers, // Same as members since filtering is done in-memory
    isLoading: membersQuery.isLoading || groupMembersQuery.isLoading,
    error: membersQuery.error || groupMembersQuery.error,
  }), [filteredMembers, membersQuery.isLoading, groupMembersQuery.isLoading, membersQuery.error, groupMembersQuery.error]);
}
