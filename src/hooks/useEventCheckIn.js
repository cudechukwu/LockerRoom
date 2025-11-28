/**
 * useEventCheckIn Hook
 * Handles check-in and check-out mutations
 * 
 * Handles:
 * - QR code check-in
 * - Location-based check-in
 * - Check-out
 * - Optimistic updates
 * - Cache invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { checkInToEvent, checkOutOfEvent, getDeviceFingerprint } from '../api/attendance';
import { useSupabase } from '../providers/SupabaseProvider';
import { queryKeys } from './queryKeys';

/**
 * Hook to handle event check-in and check-out
 * @param {string|null} eventId - Event ID (can be instanceId for recurring events)
 * @param {string|null} teamId - Team ID
 * @param {AbortSignal|null} abortSignal - Abort signal for cancellation
 * @param {string|null} instanceDate - Instance date (YYYY-MM-DD) for recurring events
 * @returns {Object} Mutations and loading states
 */
export const useEventCheckIn = (eventId, teamId, abortSignal = null, instanceDate = null) => {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  // QR code check-in mutation
  const checkInQR = useMutation({
    mutationFn: async ({ qrToken }) => {
      // Check if aborted before making request
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      if (!eventId || !teamId) {
        throw new Error('Event ID and Team ID are required');
      }

      const deviceFingerprint = await getDeviceFingerprint();
      const result = await checkInToEvent(supabase, eventId, {
        method: 'qr_code',
        qrToken,
        deviceFingerprint,
        instanceDate,
      });

      // Check again after request completes
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Check-in failed');
      }

      return result;
    },
    onSuccess: () => {
      // Only refetch if not aborted
      if (!abortSignal?.aborted) {
        queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(eventId) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      // Only log if not aborted
      if (!abortSignal?.aborted) {
        console.error('Error checking in with QR:', error);
      }
      // Don't show alert here - let UI component handle it
    },
  });

  // Location-based check-in mutation
  const checkInLocation = useMutation({
    mutationFn: async () => {
      // Check if aborted before making request
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      if (!eventId || !teamId) {
        throw new Error('Event ID and Team ID are required');
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required for location-based check-in. Please enable it in your device settings.');
      }

      // Check again after permission request
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      // Get device fingerprint for anti-cheat
      const deviceFingerprint = await getDeviceFingerprint();

      const result = await checkInToEvent(supabase, eventId, {
        method: 'location',
        latitude,
        longitude,
        deviceFingerprint,
        instanceDate,
      });

      // Check again after request completes
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Check-in failed');
      }

      return result;
    },
    onSuccess: () => {
      // Only refetch if not aborted
      if (!abortSignal?.aborted) {
        queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(eventId) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      // Only log if not aborted
      if (!abortSignal?.aborted) {
        console.error('Error checking in with location:', error);
      }
      // Don't show alert here - let UI component handle it
    },
  });

  // Check-out mutation
  const checkOut = useMutation({
    mutationFn: async () => {
      // Check if aborted before making request
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      if (!eventId || !teamId) {
        throw new Error('Event ID and Team ID are required');
      }

      const result = await checkOutOfEvent(supabase, eventId, instanceDate);

      // Check again after request completes
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Check-out failed');
      }

      return result;
    },
    onSuccess: () => {
      // Only refetch if not aborted
      if (!abortSignal?.aborted) {
        queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(eventId) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      // Only log if not aborted
      if (!abortSignal?.aborted) {
        console.error('Error checking out:', error);
      }
      // Don't show alert here - let UI component handle it
    },
  });

  return {
    checkInQR: {
      mutate: checkInQR.mutate,
      mutateAsync: checkInQR.mutateAsync,
      isLoading: checkInQR.isLoading,
      error: checkInQR.error,
    },
    checkInLocation: {
      mutate: checkInLocation.mutate,
      mutateAsync: checkInLocation.mutateAsync,
      isLoading: checkInLocation.isLoading,
      error: checkInLocation.error,
    },
    checkOut: {
      mutate: checkOut.mutate,
      mutateAsync: checkOut.mutateAsync,
      isLoading: checkOut.isLoading,
      error: checkOut.error,
    },
    // Combined loading state
    isLoading: checkInQR.isLoading || checkInLocation.isLoading || checkOut.isLoading,
  };
};

