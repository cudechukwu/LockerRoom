import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';
import { TeamContext } from '../contexts/TeamContext';
import { queryKeys } from './queryKeys';

/**
 * Returns the active team context for the authenticated user.
 * Backed by React Query so existing consumers keep the same API shape.
 */
export function useAuthTeam() {
  const { user, userTeams } = React.useContext(AppBootstrapContext);
  const { activeTeamId } = React.useContext(TeamContext);

  const query = useQuery({
    queryKey: [...queryKeys.authTeam(), user?.id, activeTeamId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) {
        throw new Error('NO_USER');
      }

      if (!activeTeamId) {
        throw new Error('NO_TEAM');
      }

      const team = userTeams?.find((membership) => membership.team_id === activeTeamId) || null;

      return {
        userId: user.id,
        user,
        teamId: activeTeamId,
        team,
      };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: (count, error) => {
      if (!error?.message) {
        return count < 1;
      }
      if (error.message.includes('NO_USER') || error.message.includes('NO_TEAM')) {
        return false;
      }
      return count < 1;
    },
  });

  React.useEffect(() => {
    console.log('📊 useAuthTeam state:', {
      hasUser: !!user,
      activeTeamId,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isError: query.isError,
      error: query.error?.message,
      data: query.data ? { userId: query.data.userId, teamId: query.data.teamId } : null,
    });
  }, [user, activeTeamId, query.isLoading, query.isFetching, query.isError, query.data, query.error]);

  return query;
}
