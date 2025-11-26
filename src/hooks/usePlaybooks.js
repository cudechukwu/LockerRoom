// Playbooks React Query Hook - Interactive animation data management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTeamPlaybooks, 
  getPlay, 
  createPlaybook, 
  createPlay, 
  sharePlay, 
  getSharedPlay 
} from '../api/playbooks';
import { useSupabase } from '../providers/SupabaseProvider';
import { queryKeys } from './queryKeys';
import { useAuthTeam } from './useAuthTeam';

/**
 * Hook to get all team playbooks with interactive animation data
 * This replaces multiple separate queries with a single optimized RPC call
 * @param {string} teamId - Team ID
 * @returns {Object} React Query result with playbooks data
 */
export const usePlaybooks = (teamId) => {
  const supabase = useSupabase();
  const { data: authData } = useAuthTeam();
  const userId = authData?.userId;

  const query = useQuery({
    queryKey: queryKeys.playbooks(teamId),
    queryFn: () => getTeamPlaybooks(supabase, teamId, userId),
    enabled: !!teamId && !!userId && !!supabase,
    staleTime: 5 * 60 * 1000, // 5 minutes - playbooks change moderately
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // We control this manually
    retry: 1,
    // Error handling with fallback data
    onError: (error) => {
      console.log('Playbooks error:', error.message);
    },
  });

  return {
    ...query,
    // Expose both isLoading and isFetching for better UI control
    isLoading: query.isLoading && !query.data,
    isFetching: query.isFetching,
  };
};

/**
 * Hook to get a specific play with full animation data
 * @param {string} playId - Play ID
 * @returns {Object} React Query result with play data
 */
export const usePlay = (playId) => {
  return useQuery({
    queryKey: queryKeys.play(playId),
    queryFn: () => getPlay(playId),
    enabled: !!playId,
    staleTime: 10 * 60 * 1000, // 10 minutes - plays rarely change
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Play error:', error.message);
    },
  });
};

/**
 * Hook to get a shared play by token
 * @param {string} shareToken - Share token
 * @returns {Object} React Query result with shared play data
 */
export const useSharedPlay = (shareToken) => {
  return useQuery({
    queryKey: queryKeys.sharedPlay(shareToken),
    queryFn: () => getSharedPlay(shareToken),
    enabled: !!shareToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    onError: (error) => {
      console.error('Shared play error:', error.message);
    },
  });
};

/**
 * Hook to create a new playbook
 * @returns {Object} Mutation for creating playbooks
 */
export const useCreatePlaybook = () => {
  const queryClient = useQueryClient();
  const { data: authData } = useAuthTeam();
  const teamId = authData?.teamId;

  return useMutation({
    mutationFn: (playbookData) => createPlaybook(teamId, playbookData),
    onSuccess: (data) => {
      console.log('✅ Playbook created:', data.data.name);
      // Invalidate and refetch playbooks
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks(teamId) });
    },
    onError: (error) => {
      console.error('❌ Failed to create playbook:', error.message);
    },
  });
};

/**
 * Hook to create a new play with animation data
 * @returns {Object} Mutation for creating plays
 */
export const useCreatePlay = () => {
  const queryClient = useQueryClient();
  const { data: authData } = useAuthTeam();
  const teamId = authData?.teamId;

  return useMutation({
    mutationFn: ({ playbookId, playData }) => createPlay(playbookId, teamId, playData),
    onSuccess: (data) => {
      console.log('✅ Play created:', data.data.name);
      // Invalidate and refetch playbooks
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks(teamId) });
    },
    onError: (error) => {
      console.error('❌ Failed to create play:', error.message);
    },
  });
};

/**
 * Hook to share a play
 * @returns {Object} Mutation for sharing plays
 */
export const useSharePlay = () => {
  return useMutation({
    mutationFn: ({ playId, shareOptions }) => sharePlay(playId, shareOptions),
    onSuccess: (data) => {
      console.log('✅ Play shared with token:', data.data.share_token);
    },
    onError: (error) => {
      console.error('❌ Failed to share play:', error.message);
    },
  });
};

/**
 * Hook to manually refresh playbooks data
 * @param {string} teamId - Team ID
 * @returns {Function} Refresh function
 */
export const useRefreshPlaybooks = (teamId) => {
  const queryClient = useQueryClient();
  
  return () => {
    console.log('🔄 Manually refreshing playbooks for team:', teamId);
    queryClient.refetchQueries({ queryKey: queryKeys.playbooks(teamId) });
  };
};

/**
 * Hook to prefetch playbooks data (for instant tab switching)
 * @param {string} teamId - Team ID
 * @returns {Function} Prefetch function
 */
export const usePrefetchPlaybooks = (teamId) => {
  const queryClient = useQueryClient();
  const { data: authData } = useAuthTeam();
  const userId = authData?.userId;
  
  return () => {
    console.log('⚡ Prefetching playbooks for team:', teamId);
    queryClient.prefetchQuery({
      queryKey: queryKeys.playbooks(teamId),
      queryFn: () => getTeamPlaybooks(teamId, userId),
      staleTime: 5 * 60 * 1000,
    });
  };
};
