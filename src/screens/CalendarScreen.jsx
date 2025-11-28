import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { useCalendarData } from '../hooks/useCalendarData';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { queryKeys } from '../hooks/queryKeys';
import { createEvent, updateEvent, deleteEvent, deleteRecurringInstance, formatEventData } from '../api/events';
import { getUserAttendanceStatus } from '../api/attendance';
import { useSupabase } from '../providers/SupabaseProvider';
import { useRealtimeAttendanceMultiple } from '../hooks/useRealtimeAttendance';
import { dataCache } from '../utils/dataCache';
import { normalizeDate, isToday as isTodayDate, getDaysDifference, getTodayAnchor } from '../utils/dateUtils';
import EventCreationModal from '../components/EventCreationModal';
// EventDetailsModal replaced with EventDetailsScreen navigation
// QR modals are now handled in EventDetailsScreen
import CalendarSkeletonLoader from '../components/CalendarSkeletonLoader';
import DateSelector from '../components/DateSelector';
import EventsList from '../components/EventsList';

const CalendarScreen = ({ navigation }) => {
  const route = useRoute();
  const supabase = useSupabase(); // Get supabase client at top level
  const insets = useSafeAreaInsets();
  const adjustedTabBarHeight = useTabBarHeight();
  const queryClient = useQueryClient();

  // Initialize currentDate to today at midnight (normalized, using session anchor)
  const [currentDate, setCurrentDate] = useState(() => getTodayAnchor());
  const [showEventModal, setShowEventModal] = useState(false);
  const [modalPrefilledData, setModalPrefilledData] = useState({});
  const [dateScrollIndex, setDateScrollIndex] = useState(0);
  // QR scan data to pass to EventDetailsScreen
  const [qrScanData, setQrScanData] = useState(null);
  // Optimistic updates: track pending operations
  const [optimisticEvents, setOptimisticEvents] = useState([]);
  const [deletedEventIds, setDeletedEventIds] = useState(new Set());
  // Attendance status map: eventId -> { status, checkedInAt }
  const [attendanceStatusMap, setAttendanceStatusMap] = useState({});

  // Always use DAY view for the new design
  const CALENDAR_VIEW = 'day';

  // Ensure currentDate is always normalized to midnight on mount
  useEffect(() => {
    const normalized = normalizeDate(currentDate);
    // Only update if the date actually changed (avoid infinite loops)
    if (normalized && normalized.getTime() !== currentDate.getTime()) {
      setCurrentDate(normalized);
    }
  }, []); // Only run on mount

  // Use the calendar data hook - always fetch day events
  const { 
    teamId, 
    teamColors, 
    events, 
    isLoading, 
    isFetching, 
    error, 
    refetch 
  } = useCalendarData(CALENDAR_VIEW, currentDate);


  // Get events for the currently selected date (with optimistic updates)
  const dayEvents = useMemo(() => {
    // Normalize selected date to midnight for accurate comparison
    const selectedDate = normalizeDate(currentDate);
    if (!selectedDate) return [];
    const selectedDateTime = selectedDate.getTime();
    
    // Combine real events with optimistic ones, filter out deleted
    const allEvents = [...(events || []), ...optimisticEvents].filter(
      event => !deletedEventIds.has(event.id)
    );
    
    return allEvents
      .filter(event => {
        if (!event || !event.startTime) return false;
        // Normalize event date to midnight for accurate comparison
        const eventDate = normalizeDate(event.startTime);
        if (!eventDate) return false;
        // Use getTime() for more reliable comparison (avoids timezone issues)
        return eventDate.getTime() === selectedDateTime;
      })
      .sort((a, b) => {
        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();
        return timeA - timeB;
      });
  }, [events, optimisticEvents, deletedEventIds, currentDate]);

  // Get stable event IDs for dependency tracking (only team events)
  const teamEventIds = useMemo(() => {
    if (!dayEvents || dayEvents.length === 0) return '';
    const teamEvents = dayEvents.filter(e => e.postTo === 'Team' || e.type === 'team');
    if (teamEvents.length === 0) return '';
    return teamEvents.map(e => e.id).sort().join(',');
  }, [dayEvents]);

  // Store latest team events in a ref to avoid dependency issues
  const teamEventsRef = useRef([]);
  useEffect(() => {
    if (!dayEvents || dayEvents.length === 0) {
      teamEventsRef.current = [];
      return;
    }
    const teamEvents = dayEvents.filter(e => e.postTo === 'Team' || e.type === 'team');
    teamEventsRef.current = teamEvents;
  }, [dayEvents]);

  // Fetch attendance status for all events in the current day
  useEffect(() => {
    // Skip if no team events
    if (!teamEventIds || teamEventsRef.current.length === 0) {
      setAttendanceStatusMap({});
      return;
    }

    const fetchAttendanceStatus = async () => {
      const teamEvents = teamEventsRef.current;
      if (teamEvents.length === 0) {
        setAttendanceStatusMap({});
        return;
      }

      try {
        // Filter out events with temporary IDs (optimistic updates)
        // Temp IDs start with "temp-" and are not valid UUIDs
        // For recurring event instances, we need to check both event.id (instanceId) and originalEventId
        // We want to include all events (including instances) but exclude temp IDs
        const validEvents = teamEvents.filter(event => {
          // Check if event.id is a temp ID (exclude those)
          if (event.id && typeof event.id === 'string' && event.id.startsWith('temp-')) {
            return false;
          }
          // For recurring instances, event.id will be in format "uuid:YYYY-MM-DD"
          // For non-recurring events, event.id will be a UUID
          // Both are valid, we just need to ensure we have an originalEventId or valid id
          const hasValidId = event.id && typeof event.id === 'string';
          const hasOriginalEventId = event.originalEventId && typeof event.originalEventId === 'string' &&
                                     /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.originalEventId);
          // Include if it has a valid originalEventId (for instances) or a valid UUID id (for non-recurring)
          return hasValidId && (hasOriginalEventId || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.id));
        });

        // Fetch attendance status for all valid events in parallel
        // Use originalEventId for the database query, but key the map by event.id (instanceId for instances)
        // Pass instanceDate for recurring instances
        const statusPromises = validEvents.map(async (event) => {
          const originalEventId = event.originalEventId || event.id; // Use for database query
          const instanceDate = event.instanceDate || null; // YYYY-MM-DD format for recurring instances
          const status = await getUserAttendanceStatus(supabase, originalEventId, instanceDate);
          // 🔥 FIX: Key by event.id (instanceId for instances) so lookups work correctly
          return { eventId: event.id, ...status };
        });

        const statuses = await Promise.all(statusPromises);
        
        // Convert to map - keyed by event.id (instanceId for instances)
        const statusMap = {};
        statuses.forEach(({ eventId, status, checkedInAt }) => {
          statusMap[eventId] = { status, checkedInAt };
        });

        setAttendanceStatusMap(statusMap);
      } catch (error) {
        console.error('Error fetching attendance status:', error);
        setAttendanceStatusMap({});
      }
    };

    fetchAttendanceStatus();
  }, [teamEventIds]); // Only depend on stable string ID

  // Subscribe to real-time attendance changes for all team events
  const teamEventIdsArray = useMemo(() => {
    if (!teamEventsRef.current || teamEventsRef.current.length === 0) return [];
    return teamEventsRef.current
      .filter(event => {
        const id = event.id;
        return id && typeof id === 'string' && !id.startsWith('temp-') && 
               /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      })
      .map(event => event.id);
  }, [teamEventIds]);

  useRealtimeAttendanceMultiple(teamEventIdsArray, teamEventIdsArray.length > 0);

  // Refetch attendance status when real-time updates occur
  // Listen to query cache updates to know when to refetch
  useEffect(() => {
    if (!teamEventIds || teamEventsRef.current.length === 0) return;

    const fetchAttendanceStatus = async () => {
      const teamEvents = teamEventsRef.current;
      if (teamEvents.length === 0) return;

      try {
        const validEvents = teamEvents.filter(event => {
          const id = event.id;
          return id && typeof id === 'string' && !id.startsWith('temp-') && 
                 /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        });

        const statusPromises = validEvents.map(async (event) => {
          const eventId = event.originalEventId || event.id;
          const instanceDate = event.instanceDate || null; // YYYY-MM-DD format for recurring instances
          const status = await getUserAttendanceStatus(supabase, eventId, instanceDate);
          return { eventId: event.id, ...status };
        });

        const statuses = await Promise.all(statusPromises);
        
        const statusMap = {};
        statuses.forEach(({ eventId, status, checkedInAt }) => {
          statusMap[eventId] = { status, checkedInAt };
        });

        setAttendanceStatusMap(statusMap);
      } catch (error) {
        console.error('Error refetching attendance status:', error);
      }
    };

    // Subscribe to query cache to detect when attendance queries are invalidated
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === 'eventAttendance') {
        // Refetch attendance status when any attendance query is updated
        fetchAttendanceStatus();
      }
    });

    return () => unsubscribe();
  }, [teamEventIds, supabase, queryClient]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Navigate to a specific date
  const navigateToDate = useCallback((date) => {
    // Normalize date to midnight to ensure consistent date comparisons
    const normalizedDate = normalizeDate(date);
    if (normalizedDate) {
      setCurrentDate(normalizedDate);
    }
  }, []);

  // Navigate to today - only called when button is explicitly pressed
  const navigateToToday = useCallback(() => {
    // Use session anchor for consistency
    setCurrentDate(getTodayAnchor());
  }, []);
    
  // Check if current date is today - always uses fresh "today" for comparison
  const isToday = useMemo(() => {
    return isTodayDate(currentDate);
  }, [currentDate]);

  // Check if we're more than 10 days away from today (for showing back to today button)
  const shouldShowBackToToday = useMemo(() => {
    // Use session anchor for consistency
    const diffDays = getDaysDifference(currentDate, getTodayAnchor());
    if (diffDays === null) return false;
    // Show button if more than 10 days away
    return Math.abs(diffDays) > 10;
  }, [currentDate]);

  // Format time for display
  const formatTime = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }, []);

  // Helper function to invalidate all event-related caches
  const invalidateEventCaches = useCallback(async (teamId) => {
    if (!teamId) return;
    
    console.log('🔄 Invalidating React Query caches for teamId:', teamId);
    
    // 🔥 FIXED: Use correct query keys to match what's actually used in useCalendarData
    // For DAY view, the query key is ['calendarEvents', teamId, 'day', 'fullYear']
    // Use partial matching to invalidate all calendar event queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', teamId] }), // Matches all calendar event queries
      queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(teamId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.nextEvent(teamId) }),
    ]);
    
    // Clear specific dataCache entries if they exist
    // Note: dataCache uses Map internally, so we clear known keys
    const todayKey = currentDate.toISOString().split('T')[0];
    const knownEventKeys = [
      `calendarEvents_${teamId}_day_fullYear`, // 🔥 FIXED: Use the actual cache key for DAY view
      `upcomingEvents_${teamId}`,
    ];
    
    knownEventKeys.forEach(key => {
      dataCache.clear(key);
    });
    
    console.log('✅ Cache invalidation complete');
  }, [queryClient, currentDate]);

  // Optimistic create event with immediate UI update
  const handleCreateEvent = useCallback(async (eventData) => {
    console.log('🟢 CalendarScreen: handleCreateEvent called with:', eventData);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Error getting user:', userError);
        Alert.alert('Error', 'Failed to verify authentication.');
        return;
      }
      if (!user) {
        console.error('❌ No user found');
        Alert.alert('Error', 'You must be logged in to create events.');
        return;
      }
      console.log('✅ User authenticated:', user.id);
      
      // Create optimistic event
      const tempId = `temp-${Date.now()}`;
    
      // Parse date - handle MM/DD/YYYY format
      const dateParts = eventData.date.split('/');
      const month = parseInt(dateParts[0]) - 1; // JS months are 0-indexed
      const day = parseInt(dateParts[1]);
      const year = parseInt(dateParts[2]);
      
      // Parse start time - use startTime or time field
      const startTimeStr = eventData.startTime || eventData.time;
      if (!startTimeStr) {
        console.error('❌ No start time provided');
        Alert.alert('Error', 'Start time is required');
        return;
      }
      
      const startTimeParts = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!startTimeParts) {
        console.error('❌ Invalid time format:', startTimeStr);
        Alert.alert('Error', 'Invalid time format');
        return;
      }
      
      let startHour = parseInt(startTimeParts[1]);
      const startMinute = parseInt(startTimeParts[2]);
      const startPeriod = startTimeParts[3].toUpperCase();
      
      if (startPeriod === 'PM' && startHour !== 12) {
        startHour += 12;
      } else if (startPeriod === 'AM' && startHour === 12) {
        startHour = 0;
      }
      
      // 🔥 FIXED: Create dates in local timezone, then normalize date part to midnight
      // This ensures the date part matches when filtering (which normalizes to midnight)
      const startTime = new Date(year, month, day, startHour, startMinute);
      // Normalize the date part to midnight (for consistent date comparison)
      // But keep the time component for display
      const normalizedStartTime = new Date(startTime);
      normalizedStartTime.setHours(startHour, startMinute, 0, 0);
      // The date part is already correct (year, month, day), we just set the time
      
      // Parse end time
      const endTimeStr = eventData.endTime || eventData.startTime || eventData.time;
      const endTimeParts = endTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let endTime;
      
      if (endTimeParts) {
        let endHour = parseInt(endTimeParts[1]);
        const endMinute = parseInt(endTimeParts[2]);
        const endPeriod = endTimeParts[3].toUpperCase();
        
        if (endPeriod === 'PM' && endHour !== 12) {
          endHour += 12;
        } else if (endPeriod === 'AM' && endHour === 12) {
          endHour = 0;
        }
        
        endTime = new Date(year, month, day, endHour, endMinute);
        endTime.setHours(endHour, endMinute, 0, 0);
      } else {
        // Default to 1 hour after start
        endTime = new Date(normalizedStartTime);
        endTime.setHours(startHour + 1, startMinute, 0, 0);
      }

      const optimisticEvent = {
        id: tempId,
        title: eventData.title,
        eventType: eventData.eventType,
        startTime: normalizedStartTime.toISOString(), // 🔥 FIXED: Use properly formatted date
        endTime: endTime.toISOString(),
        location: eventData.location || '',
        notes: eventData.notes || '',
        color: eventData.color || teamColors.primary,
        type: eventData.postTo === 'Personal' ? 'personal' : 'team',
        isOptimistic: true,
      };

      // Optimistically add to UI
      setOptimisticEvents(prev => [...prev, optimisticEvent]);
      setShowEventModal(false);
      console.log('✅ Optimistic event added to UI');

      console.log('📝 Creating event with data:', eventData);
      const formattedData = formatEventData(eventData, teamId, user.id);
      console.log('📦 Formatted event data:', formattedData);
      
      const { data, error } = await createEvent(supabase, formattedData);
      
      if (error) {
        console.error('❌ Error from createEvent:', error);
        // Remove optimistic event on error
        setOptimisticEvents(prev => prev.filter(e => e.id !== tempId));
        Alert.alert('Error', `Failed to create event: ${error.message || 'Unknown error'}`);
        throw error; // Re-throw so EventCreationModal can handle it
      }
      
      console.log('✅ Event created successfully:', data);
      
      // 🔥 FIXED: Invalidate caches first, then refetch, then remove optimistic event
      // This ensures the real event appears before removing the optimistic one
      console.log('🔄 Invalidating event caches...');
      await invalidateEventCaches(teamId);
      
      // Refetch current queries and wait for completion
      console.log('🔄 Refetching queries...');
      await refetch();
      
      // 🔥 FIXED: Remove optimistic event AFTER refetch completes
      // This prevents the event from disappearing during the refetch
      setOptimisticEvents(prev => prev.filter(e => e.id !== tempId));
      
      console.log('✅ Event creation complete and caches invalidated');
      
      // Return result so EventCreationModal can upload attachments
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ Exception creating event:', error);
      console.error('❌ Error stack:', error.stack);
      setOptimisticEvents(prev => prev.filter(e => e.id !== tempId));
      Alert.alert('Error', `Failed to create event: ${error.message || 'Unknown error'}`);
    }
  }, [teamId, teamColors, refetch, invalidateEventCaches, supabase]);

  const handleEventPress = (event) => {
    // Convert Date objects to ISO strings for navigation params (React Navigation requires serializable values)
    const startTimeDate = event.startTime ? new Date(event.startTime) : null;
    const endTimeDate = event.endTime ? new Date(event.endTime) : null;
    
    // Extract instanceDate for recurring events (already in YYYY-MM-DD format)
    const instanceDate = event.instanceDate || null;
    
    console.log('🔍 CalendarScreen - Navigating to EventDetails:', {
      eventId: event.id,
      instanceId: event.instanceId,
      instanceDate,
      isRecurring: event.isRecurringInstance || event.originalEventId,
    });
    
    const serializableEvent = {
      ...event,
      eventType: event.eventType || event.type,
      // Convert Date objects to ISO strings for navigation
      startTime: startTimeDate && !isNaN(startTimeDate.getTime()) ? startTimeDate.toISOString() : null,
      endTime: endTimeDate && !isNaN(endTimeDate.getTime()) ? endTimeDate.toISOString() : null,
      date: startTimeDate && !isNaN(startTimeDate.getTime()) 
        ? startTimeDate.toISOString()
        : null,
      // 🔥 FIX: Explicitly preserve instanceDate for recurring events
      instanceDate: instanceDate, // YYYY-MM-DD format, already a string
      postTo: event.type === 'personal' ? 'Personal' : 'Team'
    };
    
    // Navigate to EventDetailsScreen (no functions in params - use navigation listeners instead)
    navigation.navigate('EventDetails', {
      event: serializableEvent,
      teamId,
      qrScanData,
    });
  };

  const handleEditEvent = useCallback((event) => {
    // Handle both Date objects and already-formatted strings
    let startTimeValue = event.startTime;
    let endTimeValue = event.endTime;
    
    // If startTime/endTime are already formatted strings, use them directly
    // Otherwise, format them from Date objects
    if (startTimeValue && typeof startTimeValue !== 'string') {
      const startDate = new Date(startTimeValue);
      startTimeValue = !isNaN(startDate.getTime()) ? formatTime(startDate) : '';
    }
    if (endTimeValue && typeof endTimeValue !== 'string') {
      const endDate = new Date(endTimeValue);
      endTimeValue = !isNaN(endDate.getTime()) ? formatTime(endDate) : '';
    }
    
    setModalPrefilledData({
      eventType: event.type || event.eventType,
      date: event.date || (event.startTime ? new Date(event.startTime).toLocaleDateString() : new Date().toLocaleDateString()),
      time: startTimeValue || '',
      endTime: endTimeValue || '',
      title: event.title || '',
      location: event.location || '',
      recurring: event.recurring || 'None',
      notes: event.notes || '',
      postTo: event.postTo || 'Team'
    });
    setShowEventModal(true);
  }, [formatTime]);

  // Handle edit action from EventDetailsScreen
  useFocusEffect(
    useCallback(() => {
      const params = route.params;
      if (params?.action === 'edit' && params?.event) {
        // Clear params to prevent re-triggering
        navigation.setParams({ action: undefined, event: undefined });
        // Handle edit
        handleEditEvent(params.event);
      }
    }, [route.params, navigation, handleEditEvent])
  );

  // Optimistic delete event
  const handleDeleteEvent = useCallback(async (event) => {
    // Detect if event is a recurring instance or series
    const isRecurringInstance = event?.isRecurringInstance && event?.originalEventId;
    const isRecurringSeries = event?.is_recurring && !event?.isRecurringInstance;
    const originalEventId = event?.originalEventId || event?.id;
    
    // If it's a recurring instance, show options
    if (isRecurringInstance) {
      Alert.alert(
        'Delete Recurring Event',
        `"${event.title}" is part of a recurring series. What would you like to delete?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'This occurrence only',
            onPress: async () => {
              const instanceId = event.id;
              const instanceDate = new Date(event.startTime);
              
              // Optimistically remove from UI
              setDeletedEventIds(prev => new Set([...prev, instanceId]));
              
              try {
                const { success, error } = await deleteRecurringInstance(
                  supabase, 
                  originalEventId, 
                  instanceDate
                );
                
                if (error || !success) {
                  // Revert optimistic delete on error
                  setDeletedEventIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(instanceId);
                    return newSet;
                  });
                  Alert.alert('Error', 'Failed to delete this occurrence. Please try again.');
                  return;
                }
                
                // Remove from deleted set after successful delete
                setDeletedEventIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(instanceId);
                  return newSet;
                });
                
                // Invalidate all event caches to refresh calendar
                await invalidateEventCaches(teamId);
                
                // Refetch current queries
                await refetch();
              } catch (error) {
                // Revert on error
                setDeletedEventIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(instanceId);
                  return newSet;
                });
                Alert.alert('Error', 'Failed to delete this occurrence. Please try again.');
              }
            }
          },
          {
            text: 'All occurrences',
            style: 'destructive',
            onPress: async () => {
              // Show confirmation for deleting entire series
              Alert.alert(
                'Delete All Occurrences',
                `Are you sure you want to delete all occurrences of "${event.title}"? This cannot be undone.`,
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                      const eventId = originalEventId;
                      
                      // Optimistically remove from UI
                      setDeletedEventIds(prev => new Set([...prev, eventId]));
                      
                      try {
                        const { success, error } = await deleteEvent(supabase, eventId);
                        
                        if (error || !success) {
                          // Revert optimistic delete on error
                          setDeletedEventIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(eventId);
                            return newSet;
                          });
                          Alert.alert('Error', 'Failed to delete event. Please try again.');
                          return;
                        }
                        
                        // Remove from deleted set after successful delete
                        setDeletedEventIds(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(eventId);
                          return newSet;
                        });
                        
                        // Invalidate all event caches to refresh calendar and home screen
                        await invalidateEventCaches(teamId);
                        
                        // Refetch current queries
                        await refetch();
                      } catch (error) {
                        // Revert on error
                        setDeletedEventIds(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(eventId);
                          return newSet;
                        });
                        Alert.alert('Error', 'Failed to delete event. Please try again.');
                      }
                    }
                  }
                ]
              );
            }
          }
        ]
      );
      return;
    }
    
    // If it's a recurring series (original event), show confirmation
    if (isRecurringSeries) {
      Alert.alert(
        'Delete Recurring Event',
        `Are you sure you want to delete all occurrences of "${event.title}"? This cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              const eventId = event.id;
              
              // Optimistically remove from UI
              setDeletedEventIds(prev => new Set([...prev, eventId]));
              
              try {
                const { success, error } = await deleteEvent(supabase, eventId);
                
                if (error || !success) {
                  // Revert optimistic delete on error
                  setDeletedEventIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(eventId);
                    return newSet;
                  });
                  Alert.alert('Error', 'Failed to delete event. Please try again.');
                  return;
                }
                
                // Remove from deleted set after successful delete
                setDeletedEventIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(eventId);
                  return newSet;
                });
                
                // Invalidate all event caches to refresh calendar and home screen
                await invalidateEventCaches(teamId);
                
                // Refetch current queries
                await refetch();
              } catch (error) {
                // Revert on error
                setDeletedEventIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(eventId);
                  return newSet;
                });
                Alert.alert('Error', 'Failed to delete event. Please try again.');
              }
            }
          }
        ]
      );
      return;
    }
    
    // Non-recurring event - existing logic
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
            const eventId = event.id;
            
            // Optimistically remove from UI
            setDeletedEventIds(prev => new Set([...prev, eventId]));
            
            try {
              const { success, error } = await deleteEvent(supabase, eventId);
              
              if (error || !success) {
                // Revert optimistic delete on error
                setDeletedEventIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(eventId);
                  return newSet;
                });
                Alert.alert('Error', 'Failed to delete event. Please try again.');
                return;
              }
              
              // Remove from deleted set after successful delete
              setDeletedEventIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
              });
              
              // Invalidate all event caches to refresh calendar and home screen
              await invalidateEventCaches(teamId);
              
              // Refetch current queries
              await refetch();
              
            } catch (error) {
              // Revert on error
              setDeletedEventIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
              });
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          }
        }
      ]
    );
  }, [refetch, invalidateEventCaches, teamId, supabase]);


  // Show skeleton only when there's no cached data (first-time load)
  if (isLoading && !events.length) {
    return <CalendarSkeletonLoader />;
      }

    return (
    <View style={styles.container}>
      <View style={[styles.statusBarArea, { height: insets.top }]} />
      
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
          <Ionicons name="arrow-back" size={18} color={COLORS.WHITE} />
          </TouchableOpacity>
          
        <Text style={styles.headerTitle}>Schedule</Text>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              // Format date as MM/DD/YYYY for consistency
              const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
              const day = currentDate.getDate().toString().padStart(2, '0');
              const year = currentDate.getFullYear();
              setModalPrefilledData({
                date: `${month}/${day}/${year}`
              });
              setShowEventModal(true);
            }}
          >
          <Ionicons name="add" size={18} color={COLORS.WHITE} />
          </TouchableOpacity>
        </View>

      {/* Date Selector */}
      <DateSelector
        currentDate={currentDate}
        onDateSelect={navigateToDate}
        onScrollIndexChange={setDateScrollIndex}
        showBackToToday={shouldShowBackToToday}
        onBackToToday={navigateToToday}
      />

      {/* Events List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: adjustedTabBarHeight },
          dayEvents.length === 0 && styles.scrollContentEmpty
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleManualRefresh}
            tintColor={COLORS.TEXT_PRIMARY}
            titleColor={COLORS.TEXT_PRIMARY}
            colors={[COLORS.TEXT_PRIMARY]}
            progressBackgroundColor={COLORS.BACKGROUND_CARD_SECONDARY}
          />
        }
      >
        <EventsList
          events={dayEvents}
          currentDate={currentDate}
          isToday={isToday}
          onEventPress={handleEventPress}
          onAddEvent={() => {
            // Format date as MM/DD/YYYY for consistency
            const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            const day = currentDate.getDate().toString().padStart(2, '0');
            const year = currentDate.getFullYear();
            setModalPrefilledData({
              date: `${month}/${day}/${year}`
            });
            setShowEventModal(true);
          }}
          teamColors={teamColors}
          attendanceStatusMap={attendanceStatusMap}
        />
      </ScrollView>

      {/* Event Creation Modal */}
      {showEventModal && (
        <EventCreationModal
          visible={showEventModal}
          onClose={() => setShowEventModal(false)}
          onCreateEvent={handleCreateEvent}
          prefilledData={modalPrefilledData}
          teamColors={teamColors}
          teamId={teamId}
        />
      )}

      {/* QR modals are now handled in EventDetailsScreen */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  statusBarArea: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.TEXT_PRIMARY,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.BACKGROUND_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  scrollContentEmpty: {
    flexGrow: 1,
  },
});

export default CalendarScreen;
