import { useQueries, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo } from 'react';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';
import { TeamContext } from '../contexts/TeamContext';
import { useSupabase } from '../providers/SupabaseProvider';
import { queryKeys } from './queryKeys';
import { useUserGroupsAndRole } from './useUserGroupsAndRole';
import { 
  getEventsForMonth, 
  getEventsForWeek, 
  getEventsForDay, 
  getEventsInRange,
  getUpcomingEvents,
  getTeamColors,
  getEventColor,
} from '../api/events';
import { dataCache } from '../utils/dataCache';
import { getTodayAnchor, normalizeDate, addDays, getEndOfDay } from '../utils/dateUtils';

const CALENDAR_VIEWS = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
};

const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,
  MEDIUM: 10 * 60 * 1000,
  LONG: 30 * 60 * 1000,
};

const devLog = (...args) => {
  if (__DEV__) console.log(...args);
};

const devWarn = (...args) => {
  if (__DEV__) console.warn(...args);
};

async function cacheGet(key) {
  return dataCache.get(key);
}

async function cacheSet(key, value, ttl = CACHE_TTL.MEDIUM) {
  return dataCache.set(key, value, ttl);
}

async function safeFetch(fetchFn, ...args) {
  const result = await fetchFn(...args);

  if (result && typeof result === 'object' && 'data' in result && 'error' in result) {
    if (result.error) throw result.error;
    return result.data ?? null;
  }

  return result ?? null;
          }

const useTeamContextIds = () => {
  const { user } = React.useContext(AppBootstrapContext);
  const { activeTeamId } = React.useContext(TeamContext);
  return { user, teamId: activeTeamId };
};

const createEventsCacheKey = (teamId, currentView, dayKey) => `calendarEvents_${teamId}_${currentView}_${dayKey}`;

const buildEventPayload = (eventsData = [], teamColors = {}) =>
  eventsData.map((event) => ({
            id: event.id,
            title: event.title || '',
            description: event.description || '',
            eventType: event.event_type,
    event_type: event.event_type,
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
    date: new Date(event.start_time),
    notes: event.description || '',
    postTo: event.visibility === 'personal' ? 'Personal' : 'Team',
  }));

const fetchEventsByView = async (supabase, teamId, currentView, currentDate) => {
  if (!teamId || !currentDate || !supabase) return [];

  switch (currentView) {
    case CALENDAR_VIEWS.MONTH:
      return (await safeFetch(getEventsForMonth, supabase, teamId, currentDate)) || [];
    case CALENDAR_VIEWS.WEEK: {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      return (await safeFetch(getEventsForWeek, supabase, teamId, weekStart)) || [];
    }
    case CALENDAR_VIEWS.DAY:
      // 🔥 FIXED: Fetch full year range (-365 to +365 days) to include past events
      // This matches the DateSelector range and ensures past events are available
      // Uses session anchor for consistent date calculations
      const today = getTodayAnchor();
      
      const startDate = addDays(today, -365);
      const endDate = getEndOfDay(addDays(today, 365));
      
      return (await safeFetch(getEventsInRange, supabase, teamId, startDate, endDate)) || [];
    default:
      return [];
  }
};

const fetchAndCacheEvents = async (supabase, teamId, currentView, currentDate, teamColors) => {
  if (!teamId || !currentDate || !supabase) return [];

  // 🔥 FIXED: For DAY view, use stable cache key for full year range
  // This allows caching all events and reusing across day selections
  // Note: This is for dataCache (local storage), not React Query cache
  const cacheKey = currentView === CALENDAR_VIEWS.DAY
    ? `calendarEvents_${teamId}_day_fullYear`
    : createEventsCacheKey(teamId, currentView, normalizeDateKey(currentDate));
  
  const cached = await cacheGet(cacheKey);
  if (cached) {
    devLog('📅 Using cached calendar events');
    return cached;
  }

  const eventsData = await fetchEventsByView(supabase, teamId, currentView, currentDate);
  const transformedEvents = buildEventPayload(eventsData, teamColors);
  await cacheSet(cacheKey, transformedEvents, CACHE_TTL.SHORT);
          return transformedEvents;
};

export function useTeamColors(supabase, teamId) {
  return useQueries({
    queries: [
      {
        queryKey: queryKeys.teamColors(teamId),
        queryFn: async () => {
          if (!teamId) return null;
          const cacheKey = `teamColors_${teamId}`;
          const cached = await cacheGet(cacheKey);
          if (cached) {
            devLog('🎨 Using cached team colors');
            return cached;
          }
          const colors = await safeFetch(getTeamColors, supabase, teamId);
          await cacheSet(cacheKey, colors, CACHE_TTL.LONG);
          return colors;
        },
        enabled: !!teamId && !!supabase,
        staleTime: CACHE_TTL.MEDIUM,
        gcTime: CACHE_TTL.LONG,
        keepPreviousData: true,
      },
    ],
  })[0];
}

// Normalize date to ISO string key for caching
const normalizeDateKey = (date) => {
  if (!date) return null;
  const normalized = normalizeDate(date);
  return normalized ? normalized.toISOString().split('T')[0] : null;
};

export function useCalendarEvents(supabase, teamId, currentView, currentDate, teamColors) {
  // 🔥 FIXED: For DAY view, use a stable cache key that doesn't change per day
  // This allows us to cache the full year range and reuse it across day selections
  // React Query requires queryKey to be an array
  const queryKey = currentView === CALENDAR_VIEWS.DAY 
    ? ['calendarEvents', teamId, 'day', 'fullYear'] // Stable array key for full year range
    : queryKeys.calendarEvents(teamId, currentView, normalizeDateKey(currentDate));
  
  return useQueries({
    queries: [
      {
        queryKey: queryKey,
        queryFn: () => fetchAndCacheEvents(supabase, teamId, currentView, currentDate, teamColors),
        enabled: !!teamId && !!currentDate && !!supabase,
        staleTime: CACHE_TTL.SHORT,
        gcTime: CACHE_TTL.MEDIUM,
        keepPreviousData: true,
      },
    ],
  })[0];
}

export function useUpcomingEvents(supabase, teamId, teamColors) {
  return useQueries({
    queries: [
      {
        queryKey: queryKeys.upcomingEvents(teamId),
        queryFn: async () => {
          if (!teamId) return [];
          const cacheKey = `upcomingEvents_${teamId}`;
          const cached = await cacheGet(cacheKey);
          if (cached) {
            devLog('⏰ Using cached upcoming events');
            return cached;
          }

          const upcomingData = await safeFetch(getUpcomingEvents, supabase, teamId, 5);
          const upcomingEvents = (upcomingData || []).map((event) => ({
            id: event.id,
            title: event.title,
            date: new Date(event.start_time),
            time: new Date(event.start_time).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true,
            }),
            location: event.location,
            type: event.event_type,
            color: event.color || getEventColor(event.event_type, teamColors || {}),
          }));

          await cacheSet(cacheKey, upcomingEvents, CACHE_TTL.SHORT);
          return upcomingEvents;
        },
        enabled: !!teamId && !!supabase,
        staleTime: CACHE_TTL.SHORT,
        gcTime: CACHE_TTL.MEDIUM,
        keepPreviousData: true,
      },
    ],
  })[0];
}

const usePrefetchAdjacentPeriods = (supabase, teamId, currentView, currentDate, teamColors, queryClient) => {
  useEffect(() => {
    if (!teamId || !currentDate || !supabase) return;

    const offsets = {
      [CALENDAR_VIEWS.WEEK]: 7,
      [CALENDAR_VIEWS.DAY]: 1,
      [CALENDAR_VIEWS.MONTH]: 30,
    };
    const offset = offsets[currentView];
    if (!offset) return;

    // Use date utilities for consistent date calculations
    const nextDate = addDays(currentDate, offset);
    const nextKey = normalizeDateKey(nextDate);

    devLog('🔮 Prefetching calendar view', { currentView, nextKey });
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendarEvents(teamId, currentView, nextKey),
      queryFn: () => fetchAndCacheEvents(supabase, teamId, currentView, nextDate, teamColors),
      staleTime: CACHE_TTL.SHORT,
  });
  }, [teamId, currentView, currentDate, teamColors, queryClient, supabase]);
};

export function useCalendarData(currentView, currentDate) {
  const supabase = useSupabase();
  const { user, teamId } = useTeamContextIds();
  const queryClient = useQueryClient();

  useEffect(() => {
    devLog('🗓️ useCalendarData context snapshot:', {
      hasUser: !!user,
      teamId,
      currentView,
      currentDate: currentDate?.toISOString?.() ?? null,
    });
  }, [user, teamId, currentView, currentDate]);

  const teamColorsQuery = useTeamColors(supabase, teamId);
  const teamColors = teamColorsQuery?.data || { primary: '#FF4444', secondary: '#000000' };
  
  // Fetch user groups and role for event filtering
  const { userGroupIds, userRole, isLoading: isLoadingUserContext } = useUserGroupsAndRole(teamId, !!teamId);
  
  const calendarEventsQuery = useCalendarEvents(supabase, teamId, currentView, currentDate, teamColors);
  const upcomingEventsQuery = useUpcomingEvents(supabase, teamId, teamColors);

  usePrefetchAdjacentPeriods(supabase, teamId, currentView, currentDate, teamColors, queryClient);

  // Filter events by visibility (using isEventVisibleToUser)
  const filteredEvents = useMemo(() => {
    if (!calendarEventsQuery?.data || !user) {
      return [];
    }
    
    const { isEventVisibleToUser } = require('../services/eventService');
    return calendarEventsQuery.data.filter(event => 
      isEventVisibleToUser(event, user, userGroupIds, userRole)
    );
  }, [calendarEventsQuery?.data, user, userGroupIds, userRole]);

  // Filter upcoming events by visibility
  const filteredUpcomingEvents = useMemo(() => {
    if (!upcomingEventsQuery?.data || !user) {
      return [];
    }
    
    const { isEventVisibleToUser } = require('../services/eventService');
    return upcomingEventsQuery.data.filter(event => 
      isEventVisibleToUser(event, user, userGroupIds, userRole)
    );
  }, [upcomingEventsQuery?.data, user, userGroupIds, userRole]);

  const isLoading =
    (teamColorsQuery?.isLoading && !teamColorsQuery?.data) ||
    (calendarEventsQuery?.isLoading && !calendarEventsQuery?.data) ||
    (upcomingEventsQuery?.isLoading && !upcomingEventsQuery?.data) ||
    isLoadingUserContext;
  const isFetching =
    teamColorsQuery?.isFetching || calendarEventsQuery?.isFetching || upcomingEventsQuery?.isFetching;
  const error =
    teamColorsQuery?.error || calendarEventsQuery?.error || upcomingEventsQuery?.error || null;

  const data = useMemo(
    () => ({
      teamId,
      teamColors,
      events: filteredEvents,
      upcomingEvents: filteredUpcomingEvents,
      isLoading,
      isFetching,
      error,
      refetch: async () => {
        const queries = [teamColorsQuery, calendarEventsQuery, upcomingEventsQuery].filter(
          (q) => typeof q?.refetch === 'function' && q?.isFetched,
        );
        const results = await Promise.allSettled(queries.map((q) => q.refetch()));
        results.forEach((result) => {
          if (result.status === 'rejected') {
            devWarn('Refetch failed:', result.reason);
          }
        });
      },
    }),
    [
      teamId,
      teamColors,
      filteredEvents,
      filteredUpcomingEvents,
      isLoading,
      isFetching,
      error,
    ],
  );

  return data;
}
