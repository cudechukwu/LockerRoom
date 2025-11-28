/**
 * refreshCalendar
 * Utility function to refresh calendar data after event mutations (create, delete, update)
 * 
 * Handles:
 * - Clearing dataCache
 * - Invalidating React Query caches
 * - Refetching active queries
 * - Navigation back (using requestAnimationFrame for smooth UX)
 * 
 * @param {Object} queryClient - React Query client
 * @param {string} teamId - Team ID
 * @param {string} originalEventId - Original event ID (for attendance invalidation)
 * @param {Object} navigation - React Navigation object
 */
import { dataCache } from './dataCache';
import { queryKeys } from '../hooks/queryKeys';

export async function refreshCalendar(queryClient, teamId, originalEventId, navigation) {
  // Clear dataCache FIRST (before invalidate/refetch) to ensure fresh data
  // This matches the behavior of event creation for consistent UX
  console.log('🔄 Clearing dataCache and invalidating queries...');
  const knownEventKeys = [
    `calendarEvents_${teamId}_day_fullYear`,
    `upcomingEvents_${teamId}`,
  ];
  knownEventKeys.forEach(key => {
    dataCache.clear(key);
  });
  
  // Invalidate React Query caches (marks as stale)
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['calendarEvents', teamId] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(teamId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(originalEventId) }),
  ]);
  
  // Force refetch of active queries and wait for completion
  // Using type: 'active' ensures only active queries refetch (faster)
  // The cache is cleared, so when CalendarScreen queries run, they'll fetch fresh data
  console.log('🔄 Refetching queries...');
  await Promise.all([
    queryClient.refetchQueries({ 
      queryKey: ['calendarEvents', teamId], 
      exact: false,
      type: 'active' // Only refetch active queries
    }),
    queryClient.refetchQueries({ 
      queryKey: queryKeys.upcomingEvents(teamId),
      type: 'active'
    }),
  ]);
  
  console.log('✅ Cache cleared and queries refetched');
  
  // Navigate back using requestAnimationFrame for smoother UX
  // This avoids React Navigation glitches from simultaneous navigation + rerender
  requestAnimationFrame(() => {
    navigation.goBack();
  });
}

