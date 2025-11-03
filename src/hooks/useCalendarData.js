import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataCache } from '../utils/dataCache';
import { queryKeys } from './queryKeys';
import { supabase } from '../lib/supabase';
import { 
  getEventsForMonth, 
  getEventsForWeek, 
  getEventsForDay, 
  getUpcomingEvents,
  getTeamColors,
  getEventColor
} from '../api/events';

const CALENDAR_VIEWS = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
};

/**
 * Hook for fetching and composing calendar-related data
 * Uses React Query with SWR pattern for instant rendering and background refresh
 * Includes AsyncStorage persistence for app restart survival
 */
export function useCalendarData(currentView, currentDate) {
  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get user's team membership
  const { data: teamMembership } = useQuery({
    queryKey: queryKeys.userTeamMembership(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check cache first
      const cacheKey = `teamMembership_${user.id}`;
      const cached = await dataCache.get(cacheKey);
      if (cached) {
        if (__DEV__) console.log('📱 Using cached team membership');
        return cached;
      }

      const { data: teamMember, error } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      const result = teamMember || null;
      await dataCache.set(cacheKey, result, 5 * 60 * 1000); // 5 min cache
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
      
      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const teamId = teamMembership?.team_id;

  // Parallel queries for calendar data using React Query
  const queries = useQueries({
    queries: [
      // Team colors
      {
        queryKey: queryKeys.teamColors(teamId),
        queryFn: async () => {
          if (!teamId) return null;
          
          const cacheKey = `teamColors_${teamId}`;
          const cached = await dataCache.get(cacheKey);
          if (cached) {
            if (__DEV__) console.log('🎨 Using cached team colors');
            return cached;
          }

          const colors = await getTeamColors(teamId);
          await dataCache.set(cacheKey, colors, 10 * 60 * 1000); // 10 min cache
          await AsyncStorage.setItem(cacheKey, JSON.stringify(colors));
          
          return colors;
        },
        enabled: !!teamId,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        keepPreviousData: true, // Keep previous data while fetching new
      },
      // Calendar events based on current view
      {
        queryKey: queryKeys.calendarEvents(teamId, currentView, currentDate?.toISOString()),
        queryFn: async () => {
          if (!teamId || !currentDate) return [];
          
          const cacheKey = `calendarEvents_${teamId}_${currentView}_${currentDate.toISOString().split('T')[0]}`;
          const cached = await dataCache.get(cacheKey);
          if (cached) {
            if (__DEV__) console.log('📅 Using cached calendar events');
            return cached;
          }

          let eventsData = [];
          
          switch (currentView) {
            case CALENDAR_VIEWS.MONTH:
              const { data: monthEvents, error: monthError } = await getEventsForMonth(teamId, currentDate);
              if (monthError) throw monthError;
              eventsData = monthEvents || [];
              break;
              
            case CALENDAR_VIEWS.WEEK:
              const weekStart = new Date(currentDate);
              weekStart.setDate(currentDate.getDate() - currentDate.getDay());
              const { data: weekEvents, error: weekError } = await getEventsForWeek(teamId, weekStart);
              if (weekError) throw weekError;
              eventsData = weekEvents || [];
              break;
              
            case CALENDAR_VIEWS.DAY:
              const { data: dayEvents, error: dayError } = await getEventsForDay(teamId, currentDate);
              if (dayError) throw dayError;
              eventsData = dayEvents || [];
              break;
              
            default:
              eventsData = [];
          }

          // Transform database events to match the expected format
          const transformedEvents = eventsData.map(event => ({
            id: event.id,
            title: event.title || '',
            description: event.description || '',
            eventType: event.event_type,
            event_type: event.event_type, // Keep both for compatibility
            startTime: new Date(event.start_time),
            endTime: new Date(event.end_time),
            location: event.location || '',
            color: event.color || getEventColor(event.event_type, teamColors),
            type: event.visibility === 'personal' ? 'personal' : 'team',
            isAllDay: event.is_all_day,
            recurring: event.is_recurring,
            createdBy: event.created_by,
            attending: event.attending_count || 0,
            total: event.total_invited || 0,
            date: new Date(event.start_time), // Add date property for compatibility
            notes: event.description || '', // Add notes for compatibility
            postTo: event.visibility === 'personal' ? 'Personal' : 'Team'
          }));

          await dataCache.set(cacheKey, transformedEvents, 2 * 60 * 1000); // 2 min cache
          await AsyncStorage.setItem(cacheKey, JSON.stringify(transformedEvents));
          
          return transformedEvents;
        },
        enabled: !!teamId && !!currentDate,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        keepPreviousData: true, // Smooth transitions between views
      },
      // Upcoming events
      {
        queryKey: queryKeys.upcomingEvents(teamId),
        queryFn: async () => {
          if (!teamId) return [];
          
          const cacheKey = `upcomingEvents_${teamId}`;
          const cached = await dataCache.get(cacheKey);
          if (cached) {
            if (__DEV__) console.log('⏰ Using cached upcoming events');
            return cached;
          }

          const { data, error } = await getUpcomingEvents(teamId, 5);
          if (error) throw error;
          
          const upcomingEvents = (data || []).map(event => ({
            id: event.id,
            title: event.title,
            date: new Date(event.start_time),
            time: new Date(event.start_time).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            location: event.location,
            type: event.event_type,
            color: event.color || getEventColor(event.event_type, teamColors)
          }));

          await dataCache.set(cacheKey, upcomingEvents, 2 * 60 * 1000); // 2 min cache
          await AsyncStorage.setItem(cacheKey, JSON.stringify(upcomingEvents));
          
          return upcomingEvents;
        },
        enabled: !!teamId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        keepPreviousData: true, // Keep previous data while fetching
      },
    ],
  });

  const [teamColorsQuery, calendarEventsQuery, upcomingEventsQuery] = queries;

  // Combine all data into a single object
  const calendarData = useMemo(() => {
    const teamColors = teamColorsQuery?.data || { primary: '#FF4444', secondary: '#000000' };
    const events = calendarEventsQuery?.data || [];
    const upcomingEvents = upcomingEventsQuery?.data || [];

    const combined = {
      teamId,
      teamColors,
      events,
      upcomingEvents,
      isLoading: queries.some(q => q.isLoading),
      isFetching: queries.some(q => q.isFetching),
      error: queries.find(q => q.error)?.error || null,
      refetch: () => queries.forEach(q => q.refetch()),
    };

    if (__DEV__) {
      console.log('✅ Combined calendar data:', {
        teamId: combined.teamId,
        eventsCount: combined.events.length,
        upcomingEventsCount: combined.upcomingEvents.length,
        teamColors: combined.teamColors,
        isLoading: combined.isLoading,
        isFetching: combined.isFetching,
      });
    }

    return combined;
  }, [queries, teamId]);

  return calendarData;
}
