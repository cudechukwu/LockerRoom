import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { getTeamInfo } from '../api/teamMembers';
import { getTeamNotificationSummary } from '../api/notifications';
import { getUpcomingEvents, getEventColor } from '../api/events';
import { getUserProfile } from '../api/profiles';
import { useAuthTeam } from './useAuthTeam';
import { useSupabase } from '../providers/SupabaseProvider';
import { queryKeys } from './queryKeys';
import { COLORS } from '../constants/colors';

/**
 * Hook to get all HomeScreen data with parallel queries and different TTLs
 * This replaces the loadTeamData function with SWR pattern
 */
export function useHomeData() {
  const supabase = useSupabase();
  const { data: ids, isLoading: idsLoading, error: idsError } = useAuthTeam();
  const teamId = ids?.teamId;
  const userId = ids?.userId;

  // Guard against invalid/placeholder team IDs
  const isValidTeamId = teamId && teamId.length === 36;
  const validTeamId = isValidTeamId ? teamId : null;

  // Parallel queries with individualized TTLs and enabled flags
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.teamInfo(validTeamId),
        queryFn: () => getTeamInfo(supabase, validTeamId),
        enabled: !!validTeamId && !!supabase,
        staleTime: 5 * 60 * 1000, // 5 minutes - team info changes rarely
      },
      {
        queryKey: queryKeys.notifications(validTeamId, userId),
        queryFn: () => getTeamNotificationSummary(supabase, validTeamId),
        enabled: !!validTeamId && !!userId && !!supabase,
        staleTime: 120 * 1000, // 2 minutes - notifications refresh faster
      },
      {
        queryKey: queryKeys.nextEvent(validTeamId),
        queryFn: async () => {
          const res = await getUpcomingEvents(supabase, validTeamId, 1);
          // Handle different return shapes explicitly
          return Array.isArray(res) ? res[0] : res?.data?.[0] ?? null;
        },
        enabled: !!validTeamId && !!supabase,
        staleTime: 5 * 60 * 1000, // 5 minutes - events don't change often
      },
      {
        queryKey: queryKeys.profile(userId),
        queryFn: () => getUserProfile(supabase, userId),
        enabled: !!userId,
        staleTime: 10 * 60 * 1000, // 10 minutes - profile changes rarely
      },
    ],
  });

  const [teamInfoQ, notifQ, nextEventQ, profileQ] = results;
  
  // Loading state: only show loading if we have no cached data
  // Add timeout: if loading for more than 10 seconds, show error instead
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  React.useEffect(() => {
    if (idsLoading) {
      console.log('⏳ useHomeData: idsLoading is true, starting timeout...');
      const timeout = setTimeout(() => {
        console.warn('⚠️ useHomeData: Loading timeout after 10 seconds');
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [idsLoading]);
  
  // Debug logging
  React.useEffect(() => {
    if (idsError) {
      console.error('❌ useHomeData: idsError detected:', idsError.message);
    }
    if (idsLoading) {
      console.log('⏳ useHomeData: Still loading auth/team data...');
    } else if (ids) {
      console.log('✅ useHomeData: Auth/team data loaded:', { 
        teamId: ids.teamId, 
        userId: ids.userId,
        hasUser: !!ids.user,
      });
      console.log('📊 useHomeData: Query states:', {
        teamInfoLoading: teamInfoQ.isLoading,
        teamInfoError: teamInfoQ.error?.message,
        teamInfoData: teamInfoQ.data ? 'has data' : 'no data',
        profileLoading: profileQ.isLoading,
        profileError: profileQ.error?.message,
        profileData: profileQ.data ? 'has data' : 'no data',
      });
    }
  }, [idsLoading, idsError, ids, teamInfoQ.isLoading, teamInfoQ.error, teamInfoQ.data, profileQ.isLoading, profileQ.error, profileQ.data]);
  
  const isLoading = (idsLoading || results.some(q => q?.isLoading && !q?.data)) && !loadingTimeout;
  
  // Fetching state: for background refresh indicators
  const isFetching = results.some(q => q?.isFetching);
  
  // Error handling
  const error = idsError || results.find(q => q?.error)?.error;

  // Process next event data (same logic as original loadTeamData)
  const processedNextEvent = React.useMemo(() => {
    if (!nextEventQ?.data?.start_time) return null;
    
    return {
      id: nextEventQ.data.id,
      title: nextEventQ.data.title,
      startTime: new Date(nextEventQ.data.start_time),
      location: nextEventQ.data.location,
      eventType: nextEventQ.data.event_type,
      color: nextEventQ.data.color || getEventColor(nextEventQ.data.event_type, { 
        primary: COLORS.BRAND_ACCENT, 
        secondary: COLORS.PRIMARY_BLACK 
      })
    };
  }, [nextEventQ?.data]);

  // Memoized consolidated data object to prevent unnecessary re-renders
  const data = React.useMemo(() => ({
    teamId: validTeamId,
    teamInfo: teamInfoQ?.data ?? null,
    notificationCount: notifQ?.data?.total_notifications ?? 0,
    unreadMessages: notifQ?.data?.unread_messages ?? 0,
    priorityAlerts: notifQ?.data?.priority_alerts ?? 0,
    nextEvent: processedNextEvent,
    userProfile: profileQ?.data?.data ?? null, // getUserProfile returns {data}
    userName: profileQ?.data?.data?.display_name || 'Player',
    userAvatar: profileQ?.data?.data?.avatar_url || null,
  }), [validTeamId, teamInfoQ?.data, notifQ?.data, processedNextEvent, profileQ?.data]);

  return { 
    data, 
    isLoading, 
    isFetching, 
    error,
    // Individual query states for debugging
    queries: {
      teamInfo: teamInfoQ,
      notifications: notifQ,
      nextEvent: nextEventQ,
      profile: profileQ,
    }
  };
}
