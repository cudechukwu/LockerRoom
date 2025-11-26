import { useQuery } from '@tanstack/react-query';
import { getTeamConversationSummary } from '../api/channels';
import { useSupabase } from '../providers/SupabaseProvider';
import { queryKeys } from './queryKeys';
import { useAuthTeam } from './useAuthTeam';

/**
 * Hook to get all team conversations (channels + DMs) with unread counts
 * This replaces multiple separate queries with a single optimized RPC call
 * @param {string} teamId - Team ID
 * @returns {Object} React Query result with conversations data
 */
export const useTeamConversations = (teamId) => {
  const supabase = useSupabase();
  const { data: authData } = useAuthTeam();
  const userId = authData?.userId;

  return useQuery({
    queryKey: queryKeys.teamConversations(teamId, userId),
    queryFn: () => getTeamConversationSummary(supabase, teamId),
    enabled: !!teamId && !!userId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes - conversations change frequently
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // We control this manually
    retry: 1,
    // Error handling with fallback data
    onError: (error) => {
      console.error('Team conversations error:', error.message);
    },
  });
};
