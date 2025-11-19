import { useQueries, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo } from 'react';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';
import { TeamContext } from '../contexts/TeamContext';
import { queryKeys } from './queryKeys';
import { 
  getEventsForMonth, 
  getEventsForWeek, 
  getEventsForDay, 
  getUpcomingEvents,
  getTeamColors,
  getEventColor,
} from '../api/events';
import { dataCache } from '../utils/dataCache';

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

const fetchEventsByView = async (teamId, currentView, currentDate) => {
  if (!teamId || !currentDate) return [];

  switch (currentView) {
    case CALENDAR_VIEWS.MONTH:
      return (await safeFetch(getEventsForMonth, teamId, currentDate)) || [];
    case CALENDAR_VIEWS.WEEK: {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      return (await safeFetch(getEventsForWeek, teamId, weekStart)) || [];
    }
    case CALENDAR_VIEWS.DAY:
      return (await safeFetch(getEventsForDay, teamId, currentDate)) || [];
    default:
      return [];
  }
};

const fetchAndCacheEvents = async (teamId, currentView, currentDate, teamColors) => {
  const dayKey = normalizeDateKey(currentDate);
  if (!teamId || !dayKey) return [];

  const cacheKey = createEventsCacheKey(teamId, currentView, dayKey);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    devLog('📅 Using cached calendar events');
    return cached;
  }

  const eventsData = await fetchEventsByView(teamId, currentView, currentDate);
  const transformedEvents = buildEventPayload(eventsData, teamColors);
  await cacheSet(cacheKey, transformedEvents, CACHE_TTL.SHORT);
          return transformedEvents;
};

export function useTeamColors(teamId) {
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
          const colors = await safeFetch(getTeamColors, teamId);
          await cacheSet(cacheKey, colors, CACHE_TTL.LONG);
          return colors;
        },
        enabled: !!teamId,
        staleTime: CACHE_TTL.MEDIUM,
        gcTime: CACHE_TTL.LONG,
        keepPreviousData: true,
      },
    ],
  })[0];
}

const normalizeDateKey = (date) => date?.toISOString?.().split('T')[0] ?? null;

export function useCalendarEvents(teamId, currentView, currentDate, teamColors) {
  return useQueries({
    queries: [
      {
        queryKey: queryKeys.calendarEvents(teamId, currentView, normalizeDateKey(currentDate)),
        queryFn: () => fetchAndCacheEvents(teamId, currentView, currentDate, teamColors),
        enabled: !!teamId && !!currentDate,
        staleTime: CACHE_TTL.SHORT,
        gcTime: CACHE_TTL.MEDIUM,
        keepPreviousData: true,
      },
    ],
  })[0];
}

export function useUpcomingEvents(teamId, teamColors) {
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

          const upcomingData = await safeFetch(getUpcomingEvents, teamId, 5);
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
        enabled: !!teamId,
        staleTime: CACHE_TTL.SHORT,
        gcTime: CACHE_TTL.MEDIUM,
        keepPreviousData: true,
      },
    ],
  })[0];
}

const usePrefetchAdjacentPeriods = (teamId, currentView, currentDate, teamColors, queryClient) => {
  useEffect(() => {
    if (!teamId || !currentDate) return;

    const offsets = {
      [CALENDAR_VIEWS.WEEK]: 7,
      [CALENDAR_VIEWS.DAY]: 1,
      [CALENDAR_VIEWS.MONTH]: 30,
    };
    const offset = offsets[currentView];
    if (!offset) return;

    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + offset);
    const nextKey = normalizeDateKey(nextDate);

    devLog('🔮 Prefetching calendar view', { currentView, nextKey });
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendarEvents(teamId, currentView, nextKey),
      queryFn: () => fetchAndCacheEvents(teamId, currentView, nextDate, teamColors),
      staleTime: CACHE_TTL.SHORT,
  });
  }, [teamId, currentView, currentDate, teamColors, queryClient]);
};

export function useCalendarData(currentView, currentDate) {
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

  const teamColorsQuery = useTeamColors(teamId);
    const teamColors = teamColorsQuery?.data || { primary: '#FF4444', secondary: '#000000' };
  const calendarEventsQuery = useCalendarEvents(teamId, currentView, currentDate, teamColors);
  const upcomingEventsQuery = useUpcomingEvents(teamId, teamColors);

  usePrefetchAdjacentPeriods(teamId, currentView, currentDate, teamColors, queryClient);

  const isLoading =
    (teamColorsQuery?.isLoading && !teamColorsQuery?.data) ||
    (calendarEventsQuery?.isLoading && !calendarEventsQuery?.data) ||
    (upcomingEventsQuery?.isLoading && !upcomingEventsQuery?.data);
  const isFetching =
    teamColorsQuery?.isFetching || calendarEventsQuery?.isFetching || upcomingEventsQuery?.isFetching;
  const error =
    teamColorsQuery?.error || calendarEventsQuery?.error || upcomingEventsQuery?.error || null;

  const data = useMemo(
    () => ({
      teamId,
      teamColors,
      events: calendarEventsQuery?.data || [],
      upcomingEvents: upcomingEventsQuery?.data || [],
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
      calendarEventsQuery?.data,
      upcomingEventsQuery?.data,
      isLoading,
      isFetching,
      error,
    ],
  );

  return data;
}
