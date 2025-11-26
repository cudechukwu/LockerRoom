/**
 * useMarkAttendance Hook
 * Handles manual and bulk attendance marking with proper error handling
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../providers/SupabaseProvider';
import { checkInToEvent } from '../api/attendance';
import { queryKeys } from './queryKeys';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

/**
 * Get user-friendly error message from error code
 */
function getErrorMessage(error) {
  if (!error) return 'Failed to mark attendance';

  if (error.code === 'NOT_IN_GROUP') {
    return error.message || 'This player is not in the assigned group for this event.';
  } else if (error.code === 'EVENT_ENDED') {
    return error.message || 'This event has ended and attendance can no longer be marked.';
  } else if (error.code === 'NOT_AUTHORIZED') {
    return error.message || 'You are not authorized to mark attendance for this event.';
  } else if (error.code === 'NO_DATA') {
    return error.message || 'Attendance was not marked. Please try again.';
  }

  return error.message || 'Failed to mark attendance. Please try again.';
}

/**
 * Hook to mark attendance (single or bulk)
 * @param {string} eventId - Event ID
 * @param {string} teamId - Team ID
 * @returns {Object} { markAttendance, bulkMarkAttendance, isMarking }
 */
export function useMarkAttendance(eventId, teamId) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [isMarking, setIsMarking] = useState(false);
  const [markingUserId, setMarkingUserId] = useState(null); // Track which user is being marked

  /**
   * Mark attendance for a single user
   */
  const markAttendance = async (userId, status) => {
    if (!eventId || !userId || !status) {
      Alert.alert('Error', 'Missing required information to mark attendance');
      return { success: false, error: 'Missing parameters' };
    }

    setIsMarking(true);
    setMarkingUserId(userId);

    try {
      const result = await checkInToEvent(supabase, eventId, {
        method: 'manual',
        userId: userId,
        status: status,
      });

      if (result.error) {
        const errorMessage = getErrorMessage(result.error);
        Alert.alert('Error', errorMessage);
        return { success: false, error: result.error };
      }

      if (!result.data) {
        Alert.alert('Error', 'Attendance was not marked. Please try again.');
        return { success: false, error: 'No data returned' };
      }

      // Success - invalidate and refetch
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(eventId) });
      await queryClient.refetchQueries({ queryKey: queryKeys.eventAttendance(eventId) });

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error marking attendance:', error);
      const errorMessage = getErrorMessage(error);
      Alert.alert('Error', errorMessage);
      return { success: false, error };
    } finally {
      setIsMarking(false);
      setMarkingUserId(null);
    }
  };

  /**
   * Mark attendance for multiple users (bulk)
   * TODO: Optimize to use a single RPC call instead of N calls
   */
  const bulkMarkAttendance = async (userIds, status) => {
    if (!eventId || !userIds || userIds.length === 0 || !status) {
      Alert.alert('Error', 'Missing required information for bulk marking');
      return { success: false, error: 'Missing parameters' };
    }

    setIsMarking(true);

    try {
      // Mark all users in parallel (faster than sequential)
      const results = await Promise.allSettled(
        userIds.map(userId => 
          checkInToEvent(supabase, eventId, {
            method: 'manual',
            userId: userId,
            status: status,
          })
        )
      );

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected' || r.value?.error);
      const successes = results.filter(r => r.status === 'fulfilled' && r.value?.data);

      if (failures.length > 0) {
        console.error('Some attendance marks failed:', failures);
        if (successes.length === 0) {
          // All failed
          Alert.alert('Error', 'Failed to mark attendance for all players. Please try again.');
          return { success: false, error: 'All marks failed' };
        } else {
          // Some failed
          Alert.alert(
            'Partial Success',
            `Marked ${successes.length} of ${userIds.length} players. Some players could not be marked.`
          );
        }
      } else {
        // All succeeded
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Invalidate and refetch once for all changes
      await queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(eventId) });
      await queryClient.refetchQueries({ queryKey: queryKeys.eventAttendance(eventId) });

      return { 
        success: true, 
        successes: successes.length,
        failures: failures.length 
      };
    } catch (error) {
      console.error('Error in bulk mark:', error);
      Alert.alert('Error', 'Failed to mark attendance for some players. Please try again.');
      return { success: false, error };
    } finally {
      setIsMarking(false);
    }
  };

  return {
    markAttendance,
    bulkMarkAttendance,
    isMarking,
    markingUserId, // Which specific user is being marked (for row-level disabling)
  };
}

