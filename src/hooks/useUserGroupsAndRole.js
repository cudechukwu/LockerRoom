/**
 * useUserGroupsAndRole Hook
 * Fetches user's attendance group IDs and role for event filtering
 * 
 * Simplified caching (v1):
 * - Cache for 60 seconds (not 10 minutes)
 * - Invalidate on: role changed, group membership changed, team switch
 * - No predictive/pre-warming
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../providers/SupabaseProvider';
import { getUserTeamRole } from '../api/roles';
import { queryKeys } from './queryKeys';
import { useEffect, useState } from 'react';

/**
 * Hook to fetch user's attendance group IDs and role
 * @param {string|null} teamId - Team ID
 * @param {boolean} enabled - Whether to enable the query
 * @returns {Object} { userGroupIds, userRole, isLoading, error }
 */
export function useUserGroupsAndRole(teamId, enabled = true) {
  const supabase = useSupabase();
  const shouldFetch = enabled && !!teamId;
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Get current user ID
  useEffect(() => {
    if (!shouldFetch || !supabase) return;
    
    setIsLoadingUser(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      setIsLoadingUser(false);
    }).catch((error) => {
      console.error('Error getting current user:', error);
      setIsLoadingUser(false);
    });
  }, [shouldFetch, supabase]);

  // Fetch user's attendance group IDs using RPC function
  const groupsQuery = useQuery({
    queryKey: queryKeys.userGroups(teamId, currentUser?.id),
    queryFn: async () => {
      if (!supabase || !currentUser?.id) {
        throw new Error('Supabase client or user ID not available');
      }

      // Use RPC function to get group IDs (faster than fetching full group objects)
      const { data, error } = await supabase.rpc('get_user_attendance_groups', {
        p_team_id: teamId,
        p_user_id: currentUser.id,
      });

      if (error) throw error;

      // RPC returns UUID[] or null, normalize to array
      return Array.isArray(data) ? data : [];
    },
    enabled: shouldFetch && !!currentUser?.id,
    staleTime: 60 * 1000, // 60 seconds (simplified v1 caching)
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Error fetching user groups:', error);
    },
  });

  // Fetch user's role
  const roleQuery = useQuery({
    queryKey: queryKeys.eventRole(teamId, currentUser?.id),
    queryFn: async () => {
      const { data: role } = await getUserTeamRole(supabase, teamId);
      return role;
    },
    enabled: shouldFetch && !!currentUser?.id,
    staleTime: 60 * 1000, // 60 seconds (simplified v1 caching)
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Error fetching user role:', error);
    },
  });

  return {
    userGroupIds: groupsQuery.data || [],
    userRole: roleQuery.data || null,
    isLoading: isLoadingUser || groupsQuery.isLoading || roleQuery.isLoading,
    error: groupsQuery.error || roleQuery.error || null,
  };
}

