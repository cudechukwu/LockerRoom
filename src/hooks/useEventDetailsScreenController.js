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
import { useSupabase } from '../providers/SupabaseProvider';
import { mapCheckInError, mapRoleError, mapCreatorError, mapAttendanceError } from '../utils/errorMap';
import { queryKeys } from './queryKeys';
import { useQuery } from '@tanstack/react-query';
import { getEventAttachments } from '../api/events';
import { useAttachments } from './useAttachments';

/**
 * Enhanced controller for EventDetailsScreen
 * @param {Object|null} eventParam - Event object (may have ISO string dates)
 * @param {string|null} teamId - Team ID
 * @param {boolean} isFocused - Whether screen is focused (from useFocusEffect)
 * @param {string|null} qrScanData - QR scan data from navigation
 * @returns {Object} Complete screen state and actions
 */
export function useEventDetailsScreenController(eventParam, teamId, isFocused = true, qrScanData = null) {
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
    
    return {
      ...eventParam,
      startTime: startTimeDate && !isNaN(startTimeDate.getTime()) ? startTimeDate : null,
      endTime: endTimeDate && !isNaN(endTimeDate.getTime()) ? endTimeDate : null,
      date: startTimeDate && !isNaN(startTimeDate.getTime()) ? startTimeDate : null,
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
  const {
    attendance,
    userAttendance,
    stats: attendanceStats,
    isLoading: isLoadingAttendance,
    error: attendanceError,
  } = useEventAttendance(
    event?.id,
    isFocused && !!teamId && !!event?.id,
    (isCoach || isEventCreator) && roleChecked
  );

  // 4. Attachments Data
  const {
    data: attachmentsData,
    isLoading: isLoadingAttachments,
    error: attachmentsError,
  } = useQuery({
    queryKey: ['event-attachments', event?.id],
    queryFn: () => getEventAttachments(supabase, event.id),
    enabled: isFocused && !!event?.id && !!supabase,
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
  const {
    checkInQR,
    checkInLocation,
    checkOut,
    isLoading: isCheckingIn,
  } = useEventCheckIn(event?.id, teamId, abortControllerRef.current?.signal);

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
    
    // Actions
    actions: {
      viewAttachment,
      closeViewer,
      openQRScanner,
      closeQRScanner,
      openQRGenerator,
      closeQRGenerator,
      handleQRScanSuccess: handleQRScanSuccessWrapper,
      handleLocationCheckIn,
      handleCheckOut,
      retry,
    },
  };
}

