/**
 * EventDetailsScreen
 * Navigation screen for event details (not a Modal)
 * 
 * Features:
 * - Uses React Navigation (not Modal)
 * - Portal for DocumentViewer (prevents re-renders)
 * - FlatList for performance
 * - Pure UI composition
 * - All logic in controller
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Portal } from '@gorhom/portal';
import { COLORS } from '../constants/colors';
import AttendanceList from '../components/AttendanceList';
import EventHero from '../components/EventDetails/EventHero';
import EventDetailsCard from '../components/EventDetails/EventDetailsCard';
import AttachmentsCard from '../components/EventDetails/AttachmentsCard';
import NotesCard from '../components/EventDetails/NotesCard';
import CheckInSection from '../components/EventDetails/CheckInSection';
import CoachActions from '../components/EventDetails/CoachActions';
import AttendanceSummary from '../components/EventDetails/AttendanceSummary';
import SkeletonEventDetails from '../components/EventDetails/SkeletonEventDetails';
import ErrorState from '../components/EventDetails/ErrorState';
import DocumentViewer from '../components/DocumentViewer';
// Lazy load QR components (heavy camera/GPU usage)
const QRCodeScanner = React.lazy(() => import('../components/QRCodeScanner'));
const QRCodeGenerator = React.lazy(() => import('../components/QRCodeGenerator'));
import { useEventDetailsScreenController } from '../hooks/useEventDetailsScreenController';
import { useHandleQRScan } from '../hooks/useHandleQRScan';
import { deleteEvent } from '../api/events';
import { useSupabase } from '../providers/SupabaseProvider';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';

// Plain function outside component - avoids hook overhead and hoisting issues
const noop = () => {};

const EventDetailsScreen = ({ route, navigation }) => {
  const { event: eventParam, teamId, qrScanData } = route.params || {};
  const insets = useSafeAreaInsets();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [isFocused, setIsFocused] = React.useState(true);

  // Track focus state for controller
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  // Use enhanced controller (handles event conversion, QR state, viewer state)
  // IMPORTANT: All hooks must be called unconditionally - no early returns before this
  const controllerResult = useEventDetailsScreenController(eventParam, teamId, isFocused, qrScanData);
  const {
    loading,
    error,
    sections,
    ui,
    permissions,
    actions,
    event, // Single source of truth - already converted from ISO strings
    creatorName,
    userAttendance,
    attendance,
    stats,
    attachments,
  } = controllerResult || {};

  // Handle QR scan (controller manages QR scan data internally)
  // Must be called unconditionally - use safe access to actions
  const handleQRScanSuccess = actions?.handleQRScanSuccess || noop;
  useHandleQRScan(qrScanData, handleQRScanSuccess, isFocused, event?.id);

  // Handle edit - navigate back with edit param for CalendarScreen to handle
  const handleEdit = useCallback(() => {
    if (event) {
      navigation.navigate('Calendar', { 
        action: 'edit', 
        event: {
          ...event,
          startTime: event.startTime?.toISOString(),
          endTime: event.endTime?.toISOString(),
          date: event.date?.toISOString(),
        }
      });
      // Add small delay to avoid race condition where navigation happens while screen is animating
      setTimeout(() => {
        navigation.goBack();
      }, 50);
    }
  }, [event, navigation]);

  // Handle delete - handle directly in this screen
  const handleDelete = useCallback(async () => {
    if (!event || !supabase) return;
    
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { success, error: deleteError } = await deleteEvent(supabase, event.id);
              
              if (deleteError) {
                Alert.alert('Error', 'Failed to delete event. Please try again.');
                return;
              }
              
              // Invalidate event caches
              queryClient.invalidateQueries({ queryKey: queryKeys.events(teamId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.event(event.id) });
              
              // Navigate back
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          }
        }
      ]
    );
  }, [event, supabase, teamId, queryClient, navigation]);

  // Handle close (navigation back)
  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Show error alert if needed
  React.useEffect(() => {
    if (error && actions?.retry) {
      Alert.alert('Error', error.message || String(error), [
        { text: 'OK', onPress: () => actions.retry() },
      ]);
    }
  }, [error, actions]);

  // Build sections list for FlatList - must be called before early returns
  const renderSections = useCallback(() => {
    if (!event || !sections) return [];
    
    const items = [];

    // Hero section
    items.push({
      id: 'hero',
      type: 'hero',
      data: { event, creatorName, permissions, handleClose, handleEdit, handleDelete },
    });

    // Event details card
    items.push({
      id: 'details',
      type: 'details',
      data: { event },
    });

    // Notes
    if (sections.notes) {
      items.push({
        id: 'notes',
        type: 'notes',
        data: { notes: event.notes },
      });
    }

    // Attachments
    if (sections.attachments) {
      items.push({
        id: 'attachments',
        type: 'attachments',
        data: { attachments, onPress: actions?.viewAttachment },
      });
    }

    // Check-in section
    if (sections.checkIn) {
      items.push({
        id: 'checkin',
        type: 'checkin',
        data: {
          userAttendance,
          event,
          isCheckingIn: loading?.isCheckingIn,
          isLoadingAttendance: loading?.isLoadingAttendance,
          onCheckInLocation: actions?.handleLocationCheckIn,
          onCheckOut: actions?.handleCheckOut,
        },
      });
    }

    // Coach actions section
    if (sections.coachActions) {
      // Attendance summary
      if (sections.attendanceSummary) {
        items.push({
          id: 'attendance-summary',
          type: 'attendance-summary',
          data: { stats, totalMembers: attendance?.length || 0 },
        });
      }

      // Coach actions (QR generator) removed from list - only shown in bottom floating bar

      // Attendance list
      if (sections.attendanceList) {
        items.push({
          id: 'attendance-list',
          type: 'attendance-list',
          data: {
            eventId: event.id,
            teamId,
            isCoach: permissions?.isCoach,
            event,
          },
        });
      }
    }

    return items;
  }, [event, sections, creatorName, permissions, handleClose, handleEdit, handleDelete, attachments, actions, userAttendance, loading, attendance, stats, teamId]);

  const sectionsList = React.useMemo(() => renderSections(), [renderSections]);

  // Render section item - memoized to prevent unnecessary re-renders
  // MUST be called before early returns to maintain hooks order
  const renderItem = useCallback(({ item }) => {
    switch (item.type) {
      case 'hero':
        return (
          <EventHero
            event={item.data.event}
            creatorName={item.data.creatorName}
            onClose={item.data.handleClose}
            onEdit={item.data.handleEdit}
            onDelete={item.data.handleDelete}
            canEdit={item.data.permissions?.isEventCreator}
            canDelete={item.data.permissions?.isEventCreator}
          />
        );
      case 'details':
        return <EventDetailsCard event={item.data.event} />;
      case 'notes':
        return <NotesCard notes={item.data.notes} />;
      case 'attachments':
        return (
          <AttachmentsCard
            computedAttachments={item.data.attachments}
            isLoading={loading?.isLoadingAttachments}
            onAttachmentPress={item.data.onPress}
          />
        );
      case 'checkin':
        return (
          <CheckInSection
            {...item.data}
            onCheckInQR={actions?.openQRScanner || noop}
          />
        );
      case 'attendance-summary':
        return (
          <View style={styles.sectionContainer}>
            <AttendanceSummary
              stats={item.data.stats}
              totalMembers={item.data.totalMembers}
            />
          </View>
        );
      case 'attendance-list':
        return (
          <View style={styles.sectionContainer}>
            <AttendanceList
              eventId={item.data.eventId}
              teamId={item.data.teamId}
              isCoach={item.data.isCoach}
              event={item.data.event}
              scrollEnabled={false} // Parent FlatList handles scrolling
            />
          </View>
        );
      default:
        return null;
    }
  }, [loading?.isLoadingAttachments, actions]);

  // Bottom bar height for padding
  const bottomBarHeight = React.useMemo(() => {
    return sections?.coachActions ? 80 + insets.bottom : 0;
  }, [sections?.coachActions, insets.bottom]);

  // Early returns AFTER all hooks are called (fixes hooks order violation)
  if (!controllerResult || !event) {
    return <SkeletonEventDetails />;
  }

  // Show loading skeleton
  if (loading?.isInitialLoading) {
    return <SkeletonEventDetails />;
  }

  // Show error state
  if (error && !permissions?.roleChecked) {
    return (
      <ErrorState
        error={error}
        onRetry={actions?.retry || noop}
        onClose={handleClose}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <FlatList
          data={sectionsList}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.contentContainer,
            { 
              paddingBottom: bottomBarHeight + 20,
            },
          ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
      />

      {/* Bottom Sticky Action Bar (Coaches only) */}
      {sections?.coachActions && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <CoachActions
            onGenerateQR={actions?.openQRGenerator || noop}
            isLoading={false}
          />
        </View>
      )}

      {/* Document Viewer in Portal (prevents re-renders of entire screen) */}
      <Portal>
        <DocumentViewer
          visible={!!ui?.viewingAttachment}
          fileUri={ui?.viewerFileUri}
          filename={ui?.viewingAttachment?.filename}
          mimeType={ui?.viewingAttachment?.file_type}
          onClose={actions?.closeViewer || noop}
          onShare={async (uri) => {
            try {
              const Sharing = require('expo-sharing');
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(uri);
              }
            } catch (err) {
              // Silently fail
            }
          }}
        />
      </Portal>

      {/* QR Code Scanner Modal - Lazy loaded (only renders when visible) */}
      {event && teamId && ui?.showQRScanner && (
        <React.Suspense fallback={null}>
          <QRCodeScanner
            visible={ui.showQRScanner}
            onClose={actions?.closeQRScanner || noop}
            onScanSuccess={actions?.handleQRScanSuccess || noop}
            eventId={event.id}
            teamId={teamId}
          />
        </React.Suspense>
      )}

      {/* QR Code Generator Modal - Lazy loaded (only renders when visible) */}
      {event && teamId && ui?.showQRGenerator && (
        <React.Suspense fallback={null}>
          <QRCodeGenerator
            visible={ui.showQRGenerator}
            onClose={actions?.closeQRGenerator || noop}
            eventId={event.id}
            eventName={event.title}
          />
        </React.Suspense>
      )}

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default EventDetailsScreen;

