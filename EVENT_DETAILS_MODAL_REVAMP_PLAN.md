# EventDetailsModal Revamp Plan

## 🎯 Goal
Transform `EventDetailsModal` from a "view controller pretending to be a modal" into a pure, dumb UI component with all business logic extracted into hooks.

---

## 🔥 Critical Issues to Fix

### 1. Extract Business Logic → `useEventDetailsController`
**Problem**: Modal contains data loading, permissions, navigation, business logic, attendance orchestration.

**Solution**: Create a centralized controller hook that manages all state and logic.

### 2. Flatten Conditional Rendering
**Problem**: Deeply nested conditions like `{ teamId && event.id && event.postTo === 'Team' && roleChecked && ... ? ( ... ) : null }`

**Solution**: Compute boolean flags upfront, use simple conditional rendering.

### 3. Centralize Refetch Logic
**Problem**: Attendance refetched from multiple places (modal open, QR scan, location check-in, checkout, hooks).

**Solution**: All refetch logic inside `useEventAttendance` hook. Modal never calls `refetch()` manually.

### 4. Remove Unnecessary Memoization
**Problem**: `useCallback` everywhere with zero performance benefit.

**Solution**: Remove unnecessary memoization, focus on reducing prop changes.

### 5. Decouple Domains
**Problem**: Modal depends on 5 separate domains (permissions, attendance, check-in, QR, roles).

**Solution**: Isolate each domain into its own hook with clear interfaces.

### 6. Add Error Handling
**Problem**: Silent failures for creator, roles, attendance, QR mutations.

**Solution**: Error boundaries and user-friendly error states.

### 7. Extract QR Modals
**Problem**: QR scanner/generator nested inside modal causes navigation and layering issues.

**Solution**: Move QR modals to parent level, control via props/callbacks.

### 8. Add Cleanup Logic
**Problem**: State persists when modal closes (QR scanner open, etc.).

**Solution**: Reset all state when modal closes.

### 9. Fix UI Layering
**Problem**: `pageSheet` + nested modals = gesture conflicts on iOS.

**Solution**: Move nested modals outside, control at parent level.

### 10. Add Loading States
**Problem**: No skeleton/loading UI, content pops into place.

**Solution**: Top-level suspense with skeleton states.

---

## 📋 Implementation Plan

### Phase 0: Create Error Mapping Utility

**File**: `src/utils/errorMap.js` (NEW)

```javascript
/**
 * Error Mapping Utilities
 * Centralized error handling and user-friendly messages
 */

/**
 * Map attendance-related errors to user-friendly messages
 */
export function mapAttendanceError(error) {
  if (!error) return 'An unknown error occurred';
  
  // Handle specific error codes
  if (error.code === 'NOT_IN_GROUP') {
    return error.message || 'This event is only for specific groups. You are not a member of any assigned group.';
  }
  
  if (error.code === 'EVENT_ENDED') {
    return error.message || 'This event has ended and check-ins are no longer allowed.';
  }
  
  if (error.code === 'ALREADY_CHECKED_IN') {
    return 'You are already checked in to this event.';
  }
  
  if (error.code === 'RLS_POLICY_VIOLATION') {
    return 'You do not have permission to perform this action.';
  }
  
  // Generic error messages
  return error.message || 'Unable to load attendance. Please try again.';
}

/**
 * Map check-in related errors to user-friendly messages
 */
export function mapCheckInError(error) {
  if (!error) return 'Unable to check in. Please try again.';
  
  if (error.code === 'NOT_IN_GROUP') {
    return error.message || 'This event is only for specific groups. You are not a member of any assigned group.';
  }
  
  if (error.code === 'EVENT_ENDED') {
    return error.message || 'This event has ended and check-ins are no longer allowed.';
  }
  
  if (error.code === 'QR_INVALID' || error.code === 'QR_MISMATCH') {
    return error.message || 'Invalid QR code. Please scan the correct QR code for this event.';
  }
  
  if (error.code === 'QR_EXPIRED') {
    return 'This QR code has expired. Please request a new one.';
  }
  
  if (error.code === 'OUT_OF_RANGE') {
    return error.message || 'You are too far from the event location. Please move closer and try again.';
  }
  
  if (error.code === 'LOCATION_REQUIRED' || error.code === 'EVENT_LOCATION_NOT_SET') {
    return 'Location check-in is not available for this event.';
  }
  
  if (error.code === 'ALREADY_CHECKED_IN') {
    return 'You are already checked in to this event.';
  }
  
  return error.message || 'Unable to check in. Please try again.';
}

/**
 * Map role/permission errors
 */
export function mapRoleError(error) {
  if (!error) return 'Unable to verify permissions. Please try again.';
  
  if (error.code === 'UNAUTHORIZED') {
    return 'You do not have permission to view this event.';
  }
  
  return error.message || 'Unable to load event details. Please try again.';
}

/**
 * Map creator fetch errors
 */
export function mapCreatorError(error) {
  if (!error) return 'Unable to load event creator information.';
  
  return error.message || 'Unable to load event creator information.';
}
```

---

### Phase 1: Create Controller Hook

**File**: `src/hooks/useEventDetailsController.js`

```javascript
/**
 * useEventDetailsController
 * Centralized business logic for EventDetailsModal
 * Handles: permissions, data fetching, check-in/out, QR logic
 * 
 * Features:
 * - Grouped return values for cleaner destructuring
 * - Automatic reset on modal close
 * - Abort mechanism for cancelled operations
 * - Optimistic UI updates
 */
import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEventRole } from './useEventRole';
import { useEventCreator } from './useEventCreator';
import { useEventAttendance } from './useEventAttendance';
import { useEventCheckIn } from './useEventCheckIn';
import { mapCheckInError, mapRoleError, mapCreatorError, mapAttendanceError } from '../utils/errorMap';
import { queryKeys } from './queryKeys';

export function useEventDetailsController(event, teamId, visible) {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef(null);
  const previousEventIdRef = useRef(null);

  // Create new AbortController when modal opens
  useEffect(() => {
    if (visible) {
      abortControllerRef.current = new AbortController();
      previousEventIdRef.current = event?.id;
    } else {
      // Abort ongoing operations when modal closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      previousEventIdRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [visible, event?.id]);

  // 1. Permissions & Role Logic
  const {
    isCoach,
    isEventCreator,
    isPlayer,
    roleChecked,
    isLoading: isLoadingRole,
    error: roleError,
  } = useEventRole(teamId, event, visible && !!teamId);

  // 2. Creator Info
  const {
    creatorName,
    isLoading: isLoadingCreator,
    error: creatorError,
  } = useEventCreator(event?.createdBy, visible && !!event?.createdBy);

  // 3. Attendance Data (centralized - no manual refetch from modal)
  const {
    attendance,
    userAttendance,
    stats: attendanceStats,
    isLoading: isLoadingAttendance,
    error: attendanceError,
  } = useEventAttendance(
    event?.id,
    visible && !!teamId && !!event?.id,
    (isCoach || isEventCreator) && roleChecked
  );

  // 4. Check-in/out mutations (handles refetch internally with optimistic updates)
  const {
    checkInQR,
    checkInLocation,
    checkOut,
    isLoading: isCheckingIn,
  } = useEventCheckIn(event?.id, teamId, abortControllerRef.current?.signal);

  // 5. Computed flags (flattened conditions)
  const isTeamEvent = event?.postTo === 'Team' && !!teamId && !!event?.id;
  const canShowPlayerCheckIn = isTeamEvent && roleChecked && isPlayer && !isCoach && !isEventCreator;
  const canShowCoachActions = isTeamEvent && roleChecked && (isCoach || isEventCreator);
  const shouldShowAttendanceList = canShowCoachActions;

  // 6. Loading states
  const isInitialLoading = isLoadingRole || isLoadingCreator || (isLoadingAttendance && !attendance);

  // 7. Error states (mapped to user-friendly messages)
  const hasErrors = !!(roleError || creatorError || attendanceError);
  const mappedRoleError = roleError ? mapRoleError(roleError) : null;
  const mappedCreatorError = creatorError ? mapCreatorError(creatorError) : null;
  const mappedAttendanceError = attendanceError ? mapAttendanceError(attendanceError) : null;

  // 8. Optimistic check-in handler (updates cache immediately, then refetches)
  const handleQRScanSuccess = useCallback(async (qrData) => {
    if (!event?.id || !teamId || abortControllerRef.current?.signal.aborted) return;
    
    try {
      // Optimistic update: immediately update cache
      queryClient.setQueryData(
        queryKeys.eventAttendance(eventId),
        (oldData) => {
          // Add optimistic attendance record
          const optimisticRecord = {
            user_id: currentUserId,
            event_id: eventId,
            status: 'present',
            checked_in_at: new Date().toISOString(),
            is_deleted: false,
            // ... other fields
          };
          return [...(oldData || []), optimisticRecord];
        }
      );

      // Then perform actual mutation (will refetch on success)
      await checkInQR.mutateAsync({ qrToken: qrData });
      
      if (!abortControllerRef.current?.signal.aborted) {
        Alert.alert('Success', 'You have been checked in!');
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventAttendance(eventId),
      });
      
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = mapCheckInError(error);
        Alert.alert('Check-In Failed', errorMessage);
      }
    }
  }, [event?.id, teamId, checkInQR, queryClient]);

  const handleLocationCheckIn = useCallback(async () => {
    if (!event?.id || !teamId || abortControllerRef.current?.signal.aborted) return;
    
    try {
      // Optimistic update
      queryClient.setQueryData(
        queryKeys.eventAttendance(eventId),
        (oldData) => {
          // Add optimistic record
          // ... (similar to above)
        }
      );

      await checkInLocation.mutateAsync();
      
      if (!abortControllerRef.current?.signal.aborted) {
        Alert.alert('Success', 'You have been checked in!');
      }
    } catch (error) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventAttendance(eventId),
      });
      
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = mapCheckInError(error);
        Alert.alert('Check-In Failed', errorMessage);
      }
    }
  }, [event?.id, teamId, checkInLocation, queryClient]);

  const handleCheckOut = useCallback(async () => {
    if (!event?.id || !teamId || abortControllerRef.current?.signal.aborted) return;
    
    try {
      // Optimistic update: remove check-in record
      queryClient.setQueryData(
        queryKeys.eventAttendance(eventId),
        (oldData) => {
          return (oldData || []).filter(
            (record) => record.user_id !== currentUserId
          );
        }
      );

      await checkOut.mutateAsync();
      
      if (!abortControllerRef.current?.signal.aborted) {
        Alert.alert('Success', 'You have been checked out!');
      }
    } catch (error) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventAttendance(eventId),
      });
      
      if (!abortControllerRef.current?.signal.aborted) {
        Alert.alert('Check-Out Failed', error.message || 'Unable to check out. Please try again.');
      }
    }
  }, [event?.id, teamId, checkOut, queryClient]);

  // 9. Reset internal state when modal closes or event changes
  useEffect(() => {
    if (!visible || previousEventIdRef.current !== event?.id) {
      // Reset any internal state if needed
      // This ensures clean state between modal sessions
    }
  }, [visible, event?.id]);

  // Return grouped values for cleaner destructuring
  return {
    permissions: {
      isCoach,
      isEventCreator,
      isPlayer,
      roleChecked,
    },
    data: {
      attendance,
      userAttendance,
      creatorName,
      stats: attendanceStats,
    },
    loading: {
      isInitialLoading,
      isLoadingRole,
      isLoadingCreator,
      isLoadingAttendance,
      isCheckingIn,
    },
    errors: {
      hasErrors,
      roleError: mappedRoleError,
      creatorError: mappedCreatorError,
      attendanceError: mappedAttendanceError,
    },
    flags: {
      canShowPlayerCheckIn,
      canShowCoachActions,
      shouldShowAttendanceList,
    },
    handlers: {
      handleQRScanSuccess,
      handleLocationCheckIn,
      handleCheckOut,
    },
    // Mutations exposed only if needed for direct access
    mutations: {
      checkInQR,
      checkInLocation,
      checkOut,
    },
  };
}
```

---

### Phase 2: Update useEventAttendance to Handle All Refetching

**File**: `src/hooks/useEventAttendance.js` (update existing)

**Changes**:
- Remove `refetch` from return value (or make it internal only)
- All mutations (check-in, check-out) should trigger refetch internally
- Remove manual `refetchAttendance()` calls from modal
- Add debouncing to prevent duplicate refetches

```javascript
export function useEventAttendance(eventId, enabled, includeStats) {
  // ... existing code ...
  
  // Internal refetch function (not exposed)
  const internalRefetch = useCallback(() => {
    if (enabled && eventId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventAttendance(eventId),
      });
    }
  }, [enabled, eventId, queryClient]);

  // Auto-refetch on mutations (handled by React Query mutations)
  // No need to expose refetch to consumers

  return {
    attendance,
    userAttendance,
    stats,
    isLoading,
    error,
    // NO refetch exposed - all refetching is internal
  };
}
```

---

### Phase 3: Extract QR Modals to Parent Level

**File**: `src/screens/CalendarScreen.jsx` (or wherever EventDetailsModal is used)

**Changes**:
- Move QR scanner/generator state to parent
- Pass callbacks to EventDetailsModal
- Render QR modals at parent level

```javascript
// In CalendarScreen.jsx (or parent component)
const [selectedEvent, setSelectedEvent] = useState(null);
const [showEventDetails, setShowEventDetails] = useState(false);
const [showQRScanner, setShowQRScanner] = useState(false);
const [showQRGenerator, setShowQRGenerator] = useState(false);

// Handler passed to EventDetailsModal
const handleGenerateQR = useCallback(() => {
  setShowQRGenerator(true);
}, []);

const handleScanQR = useCallback(() => {
  setShowQRScanner(true);
}, []);

// Render QR modals at parent level (outside EventDetailsModal)
return (
  <>
    <EventDetailsModal
      visible={showEventDetails}
      event={selectedEvent}
      teamId={teamId}
      onClose={() => {
        setShowEventDetails(false);
        setSelectedEvent(null);
      }}
      onGenerateQR={handleGenerateQR}
      onScanQR={handleScanQR}
    />
    
    {/* QR Modals at parent level */}
    {selectedEvent && (
      <>
        <QRCodeScanner
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={(qrData) => {
            // Handle QR scan (passed to EventDetailsModal controller)
            setShowQRScanner(false);
          }}
          eventId={selectedEvent.id}
          teamId={teamId}
        />
        
        <QRCodeGenerator
          visible={showQRGenerator}
          onClose={() => setShowQRGenerator(false)}
          eventId={selectedEvent.id}
          eventName={selectedEvent.title}
        />
      </>
    )}
  </>
);
```

---

### Phase 4: Refactor EventDetailsModal to Pure UI Component

**File**: `src/components/EventDetailsModal.jsx`

**New Structure** (with grouped destructuring):

```javascript
/**
 * EventDetailsModal - Pure UI Component
 * All business logic is in useEventDetailsController
 */
export default function EventDetailsModal({
  visible,
  onClose,
  onEdit,
  onDelete,
  event,
  teamId,
  // QR handlers (modals controlled by parent)
  onGenerateQR,
  onScanQR,
  onQRScanSuccess, // Callback when QR is scanned (parent handles)
}) {
  // Use controller hook for all logic
  const {
    permissions,
    data,
    loading,
    errors,
    flags,
    handlers,
  } = useEventDetailsController(event, teamId, visible);

  // Local UI state only
  const [isDeleting, setIsDeleting] = useState(false);

  // Cleanup when modal closes
  useEffect(() => {
    if (!visible) {
      // Reset any local state if needed
      setIsDeleting(false);
    }
  }, [visible]);

  // Show loading skeleton while initial data loads
  if (loading.isInitialLoading) {
    return (
      <Modal visible={visible} onRequestClose={onClose}>
        <SkeletonEventDetails />
      </Modal>
    );
  }

  // Show error state if critical data failed to load
  if (errors.hasErrors && !permissions.roleChecked) {
    return (
      <Modal visible={visible} onRequestClose={onClose}>
        <ErrorState
          error={errors.roleError || errors.creatorError || errors.attendanceError}
          onRetry={() => {
            // Retry logic - invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.eventAttendance(event?.id) });
          }}
          onClose={onClose}
        />
      </Modal>
    );
  }

  // Main content
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <EventHeader
          onClose={onClose}
          onEdit={onEdit}
          onDelete={handleDelete}
          canEdit={permissions.isCoach || permissions.isEventCreator}
          canDelete={permissions.isCoach || permissions.isEventCreator}
        />

        {/* Content */}
        <ScrollView style={styles.content}>
          {/* Event Metadata */}
          <EventMeta
            event={event}
            creatorName={data.creatorName}
            isLoading={loading.isLoadingCreator}
          />

          {/* Player Check-In Section */}
          {flags.canShowPlayerCheckIn && (
            <CheckInSection
              userAttendance={data.userAttendance}
              event={event}
              isCheckingIn={loading.isCheckingIn}
              isLoading={loading.isLoadingAttendance}
              onCheckInQR={onScanQR}
              onCheckInLocation={handlers.handleLocationCheckIn}
              onCheckOut={handlers.handleCheckOut}
            />
          )}

          {/* Coach Actions & Attendance List */}
          {flags.canShowCoachActions && (
            <View style={styles.section}>
              <CoachActions
                onGenerateQR={onGenerateQR}
                isLoading={false}
              />
              
              {flags.shouldShowAttendanceList && (
                <AttendanceList
                  eventId={event.id}
                  teamId={teamId}
                  isCoach={permissions.isCoach}
                  event={event}
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
```

---

### Phase 5: Add Loading & Error Components

**File**: `src/components/EventDetails/SkeletonEventDetails.jsx` (new)

```javascript
export default function SkeletonEventDetails() {
  return (
    <View style={styles.container}>
      {/* Skeleton UI */}
    </View>
  );
}
```

**File**: `src/components/EventDetails/ErrorState.jsx` (new)

```javascript
export default function ErrorState({ error, onRetry, onClose }) {
  return (
    <View style={styles.container}>
      {/* Error UI with retry button */}
    </View>
  );
}
```

---

### Phase 6: Update useEventCheckIn to Handle Refetching & Abort

**File**: `src/hooks/useEventCheckIn.js` (update existing)

**Changes**:
- Mutations should automatically invalidate/refetch attendance queries
- Support AbortSignal for cancellation
- Optimistic updates for instant UI feedback

```javascript
export function useEventCheckIn(eventId, teamId, abortSignal) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  
  const checkInQR = useMutation({
    mutationFn: async ({ qrToken }) => {
      // Check if aborted before making request
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }
      
      const result = await checkInToEvent(supabase, eventId, teamId, 'qr_code', { qrToken });
      
      // Check again after request completes
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }
      
      return result;
    },
    onSuccess: () => {
      // Only refetch if not aborted
      if (!abortSignal?.aborted) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventAttendance(eventId),
        });
      }
    },
    onError: (error) => {
      // Only handle error if not aborted
      if (!abortSignal?.aborted) {
        console.error('Check-in error:', error);
      }
    },
  });

  const checkInLocation = useMutation({
    mutationFn: async () => {
      if (abortSignal?.aborted) throw new Error('Operation cancelled');
      const result = await checkInToEvent(supabase, eventId, teamId, 'location');
      if (abortSignal?.aborted) throw new Error('Operation cancelled');
      return result;
    },
    onSuccess: () => {
      if (!abortSignal?.aborted) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventAttendance(eventId),
        });
      }
    },
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (abortSignal?.aborted) throw new Error('Operation cancelled');
      const result = await checkOutOfEvent(supabase, eventId, teamId);
      if (abortSignal?.aborted) throw new Error('Operation cancelled');
      return result;
    },
    onSuccess: () => {
      if (!abortSignal?.aborted) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventAttendance(eventId),
        });
      }
    },
  });

  return {
    checkInQR,
    checkInLocation,
    checkOut,
    isLoading: checkInQR.isLoading || checkInLocation.isLoading || checkOut.isLoading,
  };
}
```

---

## 📁 File Structure After Refactor

```
src/
├── utils/
│   └── errorMap.js (NEW - centralized error mapping)
│
├── hooks/
│   ├── useEventDetailsController.js (NEW - centralized logic with abort & reset)
│   ├── useEventAttendance.js (UPDATED - no exposed refetch)
│   ├── useEventCheckIn.js (UPDATED - auto-refetch + abort support)
│   ├── useEventRole.js (existing)
│   └── useEventCreator.js (existing)
│
├── components/
│   ├── EventDetailsModal.jsx (REFACTORED - pure UI with grouped destructuring)
│   ├── EventDetails/
│   │   ├── EventHeader.jsx (existing)
│   │   ├── EventMeta.jsx (existing)
│   │   ├── CheckInSection.jsx (existing)
│   │   ├── CoachActions.jsx (existing)
│   │   ├── SkeletonEventDetails.jsx (NEW)
│   │   └── ErrorState.jsx (NEW)
│   └── AttendanceList.jsx (existing)
│
└── screens/
    └── CalendarScreen.jsx (UPDATED - controls QR modals)
```

---

## ✅ Benefits After Refactor

1. **Separation of Concerns**: Modal is pure UI, logic in hooks
2. **Testability**: Controller hook can be tested independently
3. **Reusability**: Modal can be used in different contexts
4. **Performance**: 
   - Reduced re-renders
   - No duplicate refetches
   - Optimistic UI updates for instant feedback
5. **Maintainability**: Clear boundaries, easy to modify
6. **Error Handling**: 
   - Centralized error mapping
   - User-friendly messages
   - Proper error states and boundaries
7. **Loading States**: Skeleton UI prevents flicker
8. **Cleanup**: 
   - State resets when modal closes
   - Abort mechanism prevents memory leaks
   - No stale data between sessions
9. **No Layering Issues**: QR modals at parent level
10. **Flattened Logic**: Easy to read and debug
11. **Grouped Returns**: Cleaner destructuring and readability
12. **Abort Safety**: No React warnings about unmounted components
13. **Optimistic UI**: Instant feedback, background sync
14. **Error Localization Ready**: Error mapping utility can be extended for i18n

---

## 🚀 Implementation Order

1. **Step 0**: Create `errorMap.js` utility for centralized error handling
2. **Step 1**: Create `useEventDetailsController` hook with:
   - Grouped return values
   - Abort mechanism
   - Reset logic
   - Optimistic updates
3. **Step 2**: Update `useEventAttendance` to handle all refetching internally
4. **Step 3**: Update `useEventCheckIn` to:
   - Auto-refetch on mutations
   - Support AbortSignal
   - Handle cancellation gracefully
5. **Step 4**: Create skeleton and error components
6. **Step 5**: Refactor `EventDetailsModal` to:
   - Use controller hook with grouped destructuring
   - Handle loading/error states
   - Remove all business logic
7. **Step 6**: Move QR modals to parent level (CalendarScreen)
8. **Step 7**: Test abort mechanism and cleanup
9. **Step 8**: Test optimistic updates
10. **Step 9**: Final polish and edge case testing

---

## 🧪 Testing Checklist

- [ ] Modal opens/closes correctly
- [ ] Loading skeleton shows on initial load
- [ ] Error states display correctly
- [ ] Check-in/out works without manual refetch
- [ ] QR scanner/generator work from parent level
- [ ] No duplicate refetch calls
- [ ] State resets when modal closes
- [ ] No UI flicker or popping
- [ ] Permissions work correctly
- [ ] Attendance list loads immediately

---

**Ready to start implementation?** Let me know which phase you'd like to tackle first!
