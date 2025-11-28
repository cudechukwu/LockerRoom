/**
 * useEventDetailsScreenController
 * Enhanced controller for EventDetailsScreen
 * 
 * Handles:
 * - All business logic
 * - Viewer state management
 * - Section visibility
 * - Error handling (centralized)
 * - Navigation actions
 * 
 * Returns everything the screen needs to render
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEventRole } from './useEventRole';
import { useEventCreator } from './useEventCreator';
import { useEventAttendance } from './useEventAttendance';
import { useEventCheckIn } from './useEventCheckIn';
import { useRealtimeAttendance } from './useRealtimeAttendance';
import { useSupabase } from '../providers/SupabaseProvider';
import { mapCheckInError, mapRoleError, mapCreatorError, mapAttendanceError } from '../utils/errorMap';
import { queryKeys } from './queryKeys';
import { useQuery } from '@tanstack/react-query';
import { getEventAttachments, deleteEvent, deleteRecurringInstance } from '../api/events';
import { useAttachments } from './useAttachments';
import { refreshCalendar } from '../utils/refreshCalendar';
import { getInstanceDate } from '../utils/eventInstanceUtils';

/**
 * Enhanced controller for EventDetailsScreen
 * @param {Object|null} eventParam - Event object (may have ISO string dates)
 * @param {string|null} teamId - Team ID
 * @param {boolean} isFocused - Whether screen is focused (from useFocusEffect)
 * @param {string|null} qrScanData - QR scan data from navigation
 * @returns {Object} Complete screen state and actions
 */
export function useEventDetailsScreenController(eventParam, teamId, isFocused = true, qrScanData = null, navigation = null) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const abortControllerRef = useRef(null);
  const previousEventIdRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Convert ISO strings to Date objects (single source of truth)
  const event = useMemo(() => {
    if (!eventParam) return null;
    const startTimeDate = eventParam.startTime ? new Date(eventParam.startTime) : null;
    const endTimeDate = eventParam.endTime ? new Date(eventParam.endTime) : null;
    
    // Extract instanceDate for recurring event instances
    // If event has instanceDate, use it; otherwise, extract from instanceId or startTime
    let instanceDate = eventParam.instanceDate || null;
    if (!instanceDate && eventParam.isRecurringInstance && startTimeDate) {
      // Extract date from instance (YYYY-MM-DD format)
      const date = new Date(startTimeDate);
      date.setHours(0, 0, 0, 0);
      instanceDate = date.toISOString().split('T')[0];
    }
    
    // For recurring instances, use instanceId as the id (if available)
    // This ensures QR codes and attendance use the correct instance-specific ID
    const eventId = eventParam.instanceId || eventParam.id;
    // Preserve originalEventId for operations that need the original event (like attachments)
    const originalEventId = eventParam.originalEventId || eventParam.id;
    
    return {
      ...eventParam,
      id: eventId, // Use instanceId for recurring instances, original id for non-recurring
      originalEventId, // Always preserve original event ID for database operations
      startTime: startTimeDate && !isNaN(startTimeDate.getTime()) ? startTimeDate : null,
      endTime: endTimeDate && !isNaN(endTimeDate.getTime()) ? endTimeDate : null,
      date: startTimeDate && !isNaN(startTimeDate.getTime()) ? startTimeDate : null,
      instanceDate, // YYYY-MM-DD format for recurring instances
    };
  }, [eventParam]);
  
  // Viewer state (moved from screen)
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const [viewerFileUri, setViewerFileUri] = useState(null);
  
  // QR modal state (moved from screen)
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [qrScanDataState, setQrScanDataState] = useState(qrScanData);
  
  // Centralized error state
  const [error, setError] = useState(null);
  
  // Update QR scan data when param changes
  useEffect(() => {
    if (qrScanData) {
      setQrScanDataState(qrScanData);
    }
  }, [qrScanData]);

  // Get current user ID for optimistic updates
  useEffect(() => {
    if (isFocused && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUserId(user?.id || null);
      }).catch((error) => {
        setCurrentUserId(null);
      });
    }
  }, [isFocused, supabase]);

  // Create new AbortController when screen focuses
  useEffect(() => {
    if (isFocused) {
      abortControllerRef.current = new AbortController();
      previousEventIdRef.current = event?.id;
    } else {
      // Abort ongoing operations when screen unfocuses
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      previousEventIdRef.current = null;
      setCurrentUserId(null);
      // Reset all UI state when screen unfocuses
      setViewingAttachment(null);
      setViewerFileUri(null);
      setShowQRScanner(false);
      setShowQRGenerator(false);
      setQrScanDataState(null);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isFocused, event?.id]);

  // 1. Permissions & Role Logic
  const {
    isCoach,
    isEventCreator,
    roleChecked,
    isLoading: isLoadingRole,
    error: roleError,
  } = useEventRole(teamId, event, isFocused && !!teamId);

  const isPlayer = !isCoach && !isEventCreator;

  // 2. Creator Info
  const {
    creatorName,
    isLoading: isLoadingCreator,
    error: creatorError,
  } = useEventCreator(event?.createdBy, isFocused && !!event?.createdBy);

  // 3. Attendance Data
  // Extract instanceDate for recurring event instances
  const instanceDate = event?.instanceDate || null;
  
  const {
    attendance,
    userAttendance,
    stats: attendanceStats,
    isLoading: isLoadingAttendance,
    error: attendanceError,
  } = useEventAttendance(
    event?.id,
    isFocused && !!teamId && !!event?.id,
    (isCoach || isEventCreator) && roleChecked,
    instanceDate
  );

  // 4. Attachments Data
  // Use originalEventId for attachments (attachments are stored against original event, not instances)
  const originalEventId = event?.originalEventId || event?.id;
  
  const {
    data: attachmentsData,
    isLoading: isLoadingAttachments,
    error: attachmentsError,
  } = useQuery({
    queryKey: ['event-attachments', originalEventId],
    queryFn: () => getEventAttachments(supabase, originalEventId),
    enabled: isFocused && !!originalEventId && !!supabase,
    staleTime: 5 * 60 * 1000,
  });

  const attachments = attachmentsData?.data || [];

  // 5. Use attachments hook (with frozen computed attachments)
  const { attachments: computedAttachments, error: attachmentError } = useAttachments(attachments);
  
  // Freeze computed attachments to prevent mutations
  const frozenAttachments = useMemo(() => {
    return computedAttachments.map(att => {
      const frozen = Object.freeze({
        ...att,
        open: Object.freeze(att.open),
      });
      return frozen;
    });
  }, [computedAttachments]);

  // 6. Check-in/out mutations
  // Extract instanceDate for recurring event instances (same as above)
  const {
    checkInQR,
    checkInLocation,
    checkOut,
    isLoading: isCheckingIn,
  } = useEventCheckIn(event?.id, teamId, abortControllerRef.current?.signal, instanceDate);

  // 7. Real-time attendance subscription
  // Subscribe to attendance changes for this specific event instance
  useRealtimeAttendance(
    event?.id || null,
    isFocused && !!event?.id,
    instanceDate
  );

  // 7. Real-time attendance subscription
  // Subscribe to attendance changes for this specific event instance
  useRealtimeAttendance(
    event?.id || null,
    isFocused && !!event?.id,
    instanceDate
  );

  // 7. Centralized error handling
  useEffect(() => {
    const allErrors = [
      roleError ? mapRoleError(roleError) : null,
      creatorError ? mapCreatorError(creatorError) : null,
      attendanceError ? mapAttendanceError(attendanceError) : null,
      attachmentsError ? attachmentsError : null,
      attachmentError ? attachmentError : null,
    ].filter(Boolean);
    
    if (allErrors.length > 0) {
      setError(allErrors[0]); // Show first error
    } else {
      setError(null);
    }
  }, [roleError, creatorError, attendanceError, attachmentsError, attachmentError]);

  // 8. Computed sections (declarative, not flags)
  const sections = useMemo(() => {
    const isTeamEvent = event?.postTo === 'Team' && !!teamId && !!event?.id;
    
    return {
      checkIn: isTeamEvent && roleChecked && isPlayer && !isCoach && !isEventCreator,
      coachActions: isTeamEvent && roleChecked && (isCoach || isEventCreator),
      attendanceList: isTeamEvent && roleChecked && (isCoach || isEventCreator),
      attendanceSummary: isTeamEvent && roleChecked && (isCoach || isEventCreator) && attendance && attendanceStats,
      attachments: frozenAttachments.length > 0,
      notes: event?.notes && String(event.notes).trim(),
    };
  }, [event, teamId, roleChecked, isPlayer, isCoach, isEventCreator, attendance, attendanceStats, frozenAttachments]);

  // 9. Loading states
  const loading = useMemo(() => ({
    isInitialLoading: isLoadingRole || isLoadingCreator,
    isLoadingRole,
    isLoadingCreator,
    isLoadingAttendance,
    isLoadingAttachments,
    isCheckingIn,
  }), [isLoadingRole, isLoadingCreator, isLoadingAttendance, isLoadingAttachments, isCheckingIn]);

  // 10. Process QR scan (internal, called by handleQRScanSuccessWrapper)
  const processQRScan = useCallback(async (qrData) => {
    if (!event?.id || !teamId || abortControllerRef.current?.signal.aborted || !currentUserId) return;
    
    try {
      queryClient.setQueryData(
        queryKeys.eventAttendance(event.id),
        (oldData) => {
          const existingRecord = (oldData || []).find(
            (record) => record.user_id === currentUserId && !record.is_deleted
          );
          
          if (existingRecord) {
            return oldData;
          }

          const optimisticRecord = {
            id: `temp-${Date.now()}`,
            user_id: currentUserId,
            event_id: event.id,
            team_id: teamId,
            status: 'present',
            checked_in_at: new Date().toISOString(),
            is_deleted: false,
            check_in_method: 'qr_code',
            is_late: false,
            late_minutes: null,
            late_category: 'on_time',
          };
          
          return [...(oldData || []), optimisticRecord];
        }
      );

      await checkInQR.mutateAsync({ qrToken: qrData });
    } catch (err) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventAttendance(event.id),
      });
      setError(mapCheckInError(err));
    }
  }, [event?.id, teamId, currentUserId, checkInQR, queryClient]);
  
  // Handle QR scan success (wraps processQRScan and updates UI state)
  const handleQRScanSuccessWrapper = useCallback(async (qrData) => {
    setQrScanDataState(qrData);
    setShowQRScanner(false);
    await processQRScan(qrData);
  }, [processQRScan]);

  const handleLocationCheckIn = useCallback(async () => {
    if (!event?.id || !teamId || abortControllerRef.current?.signal.aborted || !currentUserId) return;
    
    try {
      queryClient.setQueryData(
        queryKeys.eventAttendance(event.id),
        (oldData) => {
          const existingRecord = (oldData || []).find(
            (record) => record.user_id === currentUserId && !record.is_deleted
          );
          
          if (existingRecord) {
            return oldData;
          }

          const optimisticRecord = {
            id: `temp-${Date.now()}`,
            user_id: currentUserId,
            event_id: event.id,
            team_id: teamId,
            status: 'present',
            checked_in_at: new Date().toISOString(),
            is_deleted: false,
            check_in_method: 'location',
            is_late: false,
            late_minutes: null,
            late_category: 'on_time',
          };
          
          return [...(oldData || []), optimisticRecord];
        }
      );

      await checkInLocation.mutateAsync();
    } catch (err) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventAttendance(event.id),
      });
      setError(mapCheckInError(err));
    }
  }, [event?.id, teamId, currentUserId, checkInLocation, queryClient]);

  const handleCheckOut = useCallback(async () => {
    if (!event?.id || !teamId || abortControllerRef.current?.signal.aborted || !currentUserId) return;
    
    try {
      queryClient.setQueryData(
        queryKeys.eventAttendance(event.id),
        (oldData) => {
          return (oldData || []).filter(
            (record) => !(record.user_id === currentUserId && !record.is_deleted)
          );
        }
      );

      await checkOut.mutateAsync();
    } catch (err) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventAttendance(event.id),
      });
      setError(err.message || 'Unable to check out. Please try again.');
    }
  }, [event?.id, teamId, currentUserId, checkOut, queryClient]);

  // 11. Viewer actions
  const viewAttachment = useCallback(async (computedAttachment) => {
    const fileUri = await computedAttachment.open();
    if (fileUri) {
      // Use computedAttachment directly - it already contains original attachment data
      setViewingAttachment(computedAttachment);
      setViewerFileUri(fileUri);
    }
  }, []);

  const closeViewer = useCallback(() => {
    setViewingAttachment(null);
    setViewerFileUri(null);
  }, []);
  
  // 12. QR modal actions
  const openQRScanner = useCallback(() => {
    setShowQRScanner(true);
  }, []);
  
  const closeQRScanner = useCallback(() => {
    setShowQRScanner(false);
  }, []);
  
  const openQRGenerator = useCallback(() => {
    setShowQRGenerator(true);
  }, []);
  
  const closeQRGenerator = useCallback(() => {
    setShowQRGenerator(false);
  }, []);

  // 13. Navigation actions
  const openEdit = useCallback((navigation) => {
    if (!event) return;
    // Navigation will be handled by screen
    return event;
  }, [event]);

  const openDeleteConfirm = useCallback(() => {
    if (!event) return;
    return event;
  }, [event]);

  const retry = useCallback(async () => {
    if (event?.id) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.eventAttendance(event.id) 
      });
    }
    if (teamId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.eventRole(teamId) 
      });
    }
    if (event?.createdBy) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.eventCreator(event.createdBy) 
      });
    }
    setError(null);
  }, [event, teamId, queryClient]);

  // Delete functions (Issue 1: Extract handleDelete into controller)
  const deleteInstance = useCallback(async (originalEventId, instanceDate) => {
    if (!supabase || !teamId || !navigation) {
      return { success: false, error: new Error('Missing required dependencies') };
    }

    try {
      // Convert instanceDate string (YYYY-MM-DD) to Date object if needed
      const instanceDateObj = typeof instanceDate === 'string' 
        ? new Date(instanceDate + 'T00:00:00') // Add time to avoid timezone issues
        : instanceDate;
      
      console.log('🗑️ Deleting recurring instance:', {
        originalEventId,
        instanceDate: instanceDateObj,
      });
      
      const { success, error: deleteError } = await deleteRecurringInstance(
        supabase, 
        originalEventId, 
        instanceDateObj
      );
      
      console.log('🗑️ Delete recurring instance result:', { success, error: deleteError });
      
      if (deleteError || !success) {
        const errorMessage = deleteError?.message || deleteError?.toString() || 'Unknown error';
        console.error('❌ Failed to delete recurring instance:', deleteError);
        return { success: false, error: new Error(errorMessage) };
      }
      
      // Refresh calendar and navigate back (Issue 2: Extract query invalidation)
      await refreshCalendar(queryClient, teamId, originalEventId, navigation);
      
      return { success: true, error: null };
    } catch (err) {
      console.error('❌ Exception deleting recurring instance:', err);
      return { success: false, error: err };
    }
  }, [supabase, teamId, queryClient, navigation]);

  const deleteSeries = useCallback(async (originalEventId) => {
    if (!supabase || !teamId || !navigation) {
      return { success: false, error: new Error('Missing required dependencies') };
    }

    try {
      console.log('🗑️ Deleting entire recurring series:', { originalEventId });
      const { success, error: deleteError } = await deleteEvent(supabase, originalEventId);
      
      console.log('🗑️ Delete event result:', { success, error: deleteError });
      
      if (deleteError || !success) {
        const errorMessage = deleteError?.message || deleteError?.toString() || 'Unknown error';
        console.error('❌ Failed to delete event:', deleteError);
        return { success: false, error: new Error(errorMessage) };
      }
      
      // Refresh calendar and navigate back (Issue 2: Extract query invalidation)
      await refreshCalendar(queryClient, teamId, originalEventId, navigation);
      
      return { success: true, error: null };
    } catch (err) {
      console.error('❌ Exception deleting event:', err);
      return { success: false, error: err };
    }
  }, [supabase, teamId, queryClient, navigation]);

  const deleteSingle = useCallback(async (eventId) => {
    if (!supabase || !teamId || !navigation) {
      return { success: false, error: new Error('Missing required dependencies') };
    }

    try {
      console.log('🗑️ Deleting non-recurring event:', { eventId });
      const { success, error: deleteError } = await deleteEvent(supabase, eventId);
      
      console.log('🗑️ Delete event result:', { success, error: deleteError });
      
      if (deleteError || !success) {
        const errorMessage = deleteError?.message || deleteError?.toString() || 'Unknown error';
        console.error('❌ Failed to delete event:', deleteError);
        return { success: false, error: new Error(errorMessage) };
      }
      
      // Refresh calendar and navigate back (Issue 2: Extract query invalidation)
      await refreshCalendar(queryClient, teamId, eventId, navigation);
      
      return { success: true, error: null };
    } catch (err) {
      console.error('❌ Exception deleting event:', err);
      return { success: false, error: err };
    }
  }, [supabase, teamId, queryClient, navigation]);

  return {
    // Data
    event,
    creatorName,
    attendance,
    userAttendance,
    stats: attendanceStats,
    attachments: frozenAttachments,
    
    // State
    loading,
    error,
    sections,
    
    // Permissions
    permissions: {
      isCoach,
      isEventCreator,
      isPlayer,
      roleChecked,
    },
    
    // UI State (all UI state managed in controller)
    ui: {
      viewingAttachment,
      viewerFileUri,
      showQRScanner,
      showQRGenerator,
    },
    
    // Actions - memoized to ensure stability and prevent unnecessary re-renders
    actions: useMemo(() => ({
      viewAttachment,
      closeViewer,
      openQRScanner,
      closeQRScanner,
      openQRGenerator,
      closeQRGenerator,
      handleQRScanSuccess: handleQRScanSuccessWrapper,
      handleLocationCheckIn,
      handleCheckOut,
      deleteInstance,
      deleteSeries,
      deleteSingle,
      retry,
    }), [
      viewAttachment,
      closeViewer,
      openQRScanner,
      closeQRScanner,
      openQRGenerator,
      closeQRGenerator,
      handleQRScanSuccessWrapper,
      handleLocationCheckIn,
      handleCheckOut,
      deleteInstance,
      deleteSeries,
      deleteSingle,
      retry,
    ]),
  };
}

