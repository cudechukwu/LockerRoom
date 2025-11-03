import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from './queryKeys';

/**
 * Hook to get current user and their team information
 * This replaces the auth + team lookup logic from loadTeamData
 */
export function useAuthTeam() {
  return useQuery({
    queryKey: queryKeys.authTeam(),
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('NO_USER');
      }

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) {
        throw new Error('NO_TEAM');
      }

      return { 
        userId: user.id, 
        teamId: teamMember.team_id 
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - auth/team rarely changes
    retry: 1,
    // Better error handling for predictable UX
    onError: (error) => {
      console.log('Auth/Team error:', error.message);
      // Could trigger login redirect here if needed
    },
  });
}
