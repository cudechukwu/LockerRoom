import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTodayAnchor } from '../utils/dateUtils';
import { useDebounce } from '../hooks/useDebounce';
import { getTeamAttendanceGroups } from '../api/attendanceGroups';
import { useSupabase } from '../providers/SupabaseProvider';
import { uploadEventAttachment } from '../api/events';
import WhoSeesThisSection from './EventCreation/WhoSeesThisSection';
import EventTypeTabs from './EventCreation/EventTypeTabs';
import AssignedGroupsGrid from './EventCreation/AssignedGroupsGrid';
import AttendanceSettingsSection from './EventCreation/AttendanceSettingsSection';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const EventCreationModal = ({ 
  visible, 
  onClose, 
  onCreateEvent,
  prefilledData = {},
  teamColors = { primary: '#FF4444', secondary: '#000000' },
  teamId = null,
  editingEvent = null, // For edit mode
}) => {
  const supabase = useSupabase();
  const insets = useSafeAreaInsets();
  
  // Who sees this state (maps to visibility)
  const [whoSeesThis, setWhoSeesThis] = useState('team'); // 'team' | 'specificGroups' | 'personal'
  const [postTo, setPostTo] = useState('Team'); // Keep for backward compatibility during transition
  const [eventType, setEventType] = useState('practice');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const today = getTodayAnchor();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  });
  const [startTime, setStartTime] = useState('3:00 PM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [location, setLocation] = useState('');
  const [recurring, setRecurring] = useState('None');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]); // File attachments (local files before upload)
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  
  // Attendance settings state
  const [attendanceRequirement, setAttendanceRequirement] = useState('required');
  const [checkInMethods, setCheckInMethods] = useState(['qr_code', 'location', 'manual']);

  // Dropdown visibility states
  const [showPostToDropdown, setShowPostToDropdown] = useState(false);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Attendance groups state
  const [eventVisibility, setEventVisibility] = useState('fullTeam'); // 'fullTeam' | 'specificGroups'
  const [selectedGroups, setSelectedGroups] = useState([]); // Array of group IDs
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]); // All groups for team
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [userModifiedGroups, setUserModifiedGroups] = useState(false); // Track if user manually changed groups
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Debounced search query for performance
  const debouncedSearchQuery = useDebounce(groupSearchQuery, 150);

  // Event type configurations with colors
  const eventTypes = [
    { id: 'practice', title: 'Practice', color: teamColors.primary, icon: 'P' },
    { id: 'workout', title: 'Workout', color: teamColors.primary, icon: 'W' },
    { id: 'meeting', title: 'Meeting', color: '#10B981', icon: 'M' },
    { id: 'film', title: 'Film', color: '#8B5CF6', icon: 'F' },
    { id: 'therapy', title: 'Therapy', color: '#F59E0B', icon: 'T' },
    { id: 'travel', title: 'Travel', color: '#3B82F6', icon: 'T' },
    { id: 'game', title: 'Game', color: '#1F2937', icon: 'G' },
    { id: 'other', title: 'Other', color: '#6B7280', icon: 'O' },
  ];

  const postToOptions = ['Team', 'Personal', 'Coaches Only', 'Players Only'];
  const groupOptions = ['All Defense', 'Offensive Line', 'Special Teams', 'Coaching Staff'];
  const locationSuggestions = ['Practice Field', 'Home Stadium', 'Away Game', 'Film Room', 'Weight Room', 'Locker Room', 'Training Field'];
  const recurringOptions = ['None', 'Daily', 'Weekly', 'Every Tue/Thu', 'Every Mon/Wed/Fri', 'Monthly'];
  
  // Time options (12-hour format)
  const timeOptions = [
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
    '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
  ];


  // Auto-fill title when event type changes
  useEffect(() => {
    const selectedEventType = eventTypes.find(type => type.id === eventType);
    if (selectedEventType) {
      // For "Other", don't auto-fill, let user type custom title
      if (eventType === 'other') {
        setTitle('');
      } else {
        setTitle(selectedEventType.title);
      }
    }
  }, [eventType]);

  // Handle prefilled data
  useEffect(() => {
    if (prefilledData.eventType) {
      setEventType(prefilledData.eventType);
    }
    if (prefilledData.date) {
      setDate(prefilledData.date);
    }
    if (prefilledData.time) {
      setStartTime(prefilledData.time);
    }
    if (prefilledData.endTime) {
      setEndTime(prefilledData.endTime);
    }
  }, [prefilledData]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!visible) {
      // Reset group-related state
      setEventVisibility('fullTeam');
      setSelectedGroups([]);
      setUserModifiedGroups(false);
      setGroupSearchQuery('');
      setShowGroupSelector(false);
    }
  }, [visible]);

  // Load available groups when modal opens
  const loadAvailableGroups = async () => {
    if (!teamId) return;

    try {
      setIsLoadingGroups(true);
      const { data, error } = await getTeamAttendanceGroups(supabase, teamId);
      if (error) {
        console.error('Error loading groups:', error);
        return;
      }
      setAvailableGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    // Load groups when modal opens - keep them loaded regardless of selection
    // This prevents the flash of "no groups" when switching from personal to groups
    if (visible && teamId && supabase) {
      loadAvailableGroups();
    } else if (!visible) {
      // Only clear groups when modal closes
      setAvailableGroups([]);
    }
  }, [visible, teamId, supabase]);

  // 🟥 CRITICAL: Filter stale group memberships when availableGroups changes
  useEffect(() => {
    if (availableGroups.length > 0) {
      setSelectedGroups(prev =>
        prev.filter(id => availableGroups.some(g => g.id === id))
      );
    }
  }, [availableGroups]);

  // Pre-fill for Edit Mode (Fixed Timing Issue + User Modification Protection)
  useEffect(() => {
    // Don't pre-fill if user has already modified groups manually
    if (!editingEvent || !availableGroups.length || userModifiedGroups) return;
    
    // Check if event has assigned groups
    // Derive full-team status from assigned_attendance_groups array length
    const assignedGroups = editingEvent.assigned_attendance_groups || [];
    const isFullTeam = !Array.isArray(assignedGroups) || assignedGroups.length === 0;
    
    // Filter out any groups that no longer exist
    const validGroupIds = assignedGroups.filter(id => 
      availableGroups.some(g => g.id === id)
    );
    
    if (isFullTeam || validGroupIds.length === 0) {
      setEventVisibility('fullTeam');
      setSelectedGroups([]);
    } else {
      setEventVisibility('specificGroups');
      setSelectedGroups(validGroupIds);
    }
  }, [editingEvent, availableGroups, userModifiedGroups]);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!debouncedSearchQuery) return availableGroups;
    const query = debouncedSearchQuery.toLowerCase();
    return availableGroups.filter(group =>
      group.name.toLowerCase().includes(query)
    );
  }, [availableGroups, debouncedSearchQuery]);

  // Group selection handlers
  const toggleGroup = (groupId) => {
    setUserModifiedGroups(true);
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const removeGroup = (groupId) => {
    setUserModifiedGroups(true);
    setSelectedGroups(prev => prev.filter(id => id !== groupId));
  };

  const handleVisibilityChange = (visibility) => {
    setEventVisibility(visibility);
    if (visibility === 'fullTeam') {
      setSelectedGroups([]);
      setUserModifiedGroups(false);
    }
  };

  // Handle file picker
  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || 'Untitled',
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        }));
        setAttachments(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files. Please try again.');
    }
  };

  // Remove attachment from list
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateEvent = async () => {
    console.log('🔵 EventCreationModal: handleCreateEvent called');
    console.log('🔵 Form state:', { postTo, eventType, title, date, startTime, endTime, location, recurring, notes });
    
    // Basic validation
    if (!title || !title.trim()) {
      console.warn('⚠️ Title is required');
      return;
    }

    // Map whoSeesThis to visibility
    let visibility = 'team';
    if (whoSeesThis === 'personal') {
      visibility = 'personal';
    } else if (whoSeesThis === 'specificGroups') {
      visibility = 'team'; // Specific groups still use 'team' visibility
    } else {
      visibility = 'team';
    }

    // Validate group selection
    if (whoSeesThis === 'specificGroups' && selectedGroups.length === 0) {
      Alert.alert('Error', 'Please select at least one group for this event.');
      return;
    }
    
    const eventData = {
      postTo: whoSeesThis === 'personal' ? 'Personal' : whoSeesThis === 'specificGroups' ? 'Team' : 'Team', // Map for backward compatibility
      eventType,
      title,
      date,
      startTime,
      endTime,
      location,
      recurring,
      notes,
      color: eventTypes.find(type => type.id === eventType)?.color || teamColors.primary,
      // Attendance groups data
      // Note: isFullTeamEvent is derived from assignedAttendanceGroups array length (empty = full team)
      assignedAttendanceGroups: whoSeesThis === 'specificGroups' ? selectedGroups : [],
      // Attendance settings
      attendanceRequirement,
      checkInMethods,
    };
    
    console.log('🔵 Calling onCreateEvent with:', eventData);
    console.log('🔵 onCreateEvent function type:', typeof onCreateEvent);
    
    if (typeof onCreateEvent === 'function') {
      try {
        // Call the async function and wait for it (creates the event)
        const result = await onCreateEvent(eventData);
        console.log('🔵 onCreateEvent completed successfully');
        
        // Upload attachments if event was created successfully and we have attachments
        if (result?.data?.id && attachments.length > 0 && teamId) {
          setIsUploadingAttachments(true);
          try {
            // Upload attachments one by one (non-blocking pattern)
            const uploadResults = await Promise.allSettled(
              attachments.map(file => 
                uploadEventAttachment(supabase, result.data.id, teamId, file)
              )
            );

            // Check for failures
            const failures = uploadResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
            if (failures.length > 0) {
              console.warn(`⚠️ ${failures.length} attachment(s) failed to upload`);
              Alert.alert(
                'Upload Warning',
                `${attachments.length - failures.length} of ${attachments.length} file(s) uploaded successfully. Some files failed to upload.`,
                [{ text: 'OK' }]
              );
            } else {
              console.log(`✅ All ${attachments.length} attachment(s) uploaded successfully`);
            }
          } catch (error) {
            console.error('❌ Error uploading attachments:', error);
            Alert.alert(
              'Upload Error',
              'Event was created but some files failed to upload. You can add them later.',
              [{ text: 'OK' }]
            );
          } finally {
            setIsUploadingAttachments(false);
          }
        }

        // Reset form state after successful creation
        setEventVisibility('fullTeam');
        setSelectedGroups([]);
        setUserModifiedGroups(false);
        setGroupSearchQuery('');
        setShowGroupSelector(false);
        setAttachments([]);
      } catch (error) {
        console.error('❌ Error in onCreateEvent:', error);
        Alert.alert('Error', 'Failed to create event. Please try again.');
        return;
      }
    } else {
      console.error('❌ onCreateEvent is not a function!', onCreateEvent);
      return;
    }
    
    // Close modal after async operation completes
    onClose();
    
    // Reset form
    setPostTo('Team');
    setEventType('practice');
    setTitle('');
    setLocation('');
    setRecurring('None');
    setNotes('');
  };

  const closeAllDropdowns = () => {
    setShowPostToDropdown(false);
    setShowEventTypeDropdown(false);
    setShowLocationDropdown(false);
    setShowRecurringDropdown(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowGroupSelector(false);
  };

  // Helper function to convert time string to minutes for comparison
  const timeToMinutes = (timeString) => {
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  // Calculate event duration and check if it spans midnight
  const getEventDuration = () => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    let durationMinutes;
    let spansNextDay = false;
    
    if (endMinutes <= startMinutes) {
      // Event spans midnight
      durationMinutes = (24 * 60) - startMinutes + endMinutes;
      spansNextDay = true;
    } else {
      // Same day event
      durationMinutes = endMinutes - startMinutes;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    let durationText = '';
    if (hours > 0) durationText += `${hours}h`;
    if (minutes > 0) durationText += `${minutes > 0 && hours > 0 ? ' ' : ''}${minutes}m`;
    
    return { duration: durationText, spansNextDay };
  };

  const renderDropdown = (label, value, options, onSelect, showColors = false, isOpen, setIsOpen) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdown}
        onPress={() => {
          closeAllDropdowns();
          setIsOpen(!isOpen);
        }}
      >
        <View style={styles.dropdownContent}>
          {showColors && (
            <View style={[
              styles.colorIndicator, 
              { backgroundColor: eventTypes.find(type => type.id === value)?.color || '#6B7280' }
            ]}>
              <Text style={styles.colorIndicatorText}>
                {eventTypes.find(type => type.id === value)?.icon || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.dropdownText}>
            {showColors 
              ? eventTypes.find(type => type.id === value)?.title || value
              : value
            }
          </Text>
        </View>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={COLORS.TEXT_TERTIARY} 
        />
      </TouchableOpacity>
      
      {/* Dropdown Options */}
      {isOpen && (
        <View style={styles.dropdownOptions}>
          {(showColors ? eventTypes : options.map(opt => ({ id: opt, title: opt }))).map((option) => (
            <TouchableOpacity
              key={option.id || option.title}
              style={styles.dropdownOption}
              onPress={() => {
                onSelect(showColors ? option.id : option.title);
                setIsOpen(false);
              }}
            >
              {showColors && (
                <View style={[styles.colorIndicator, { backgroundColor: option.color }]}>
                  <Text style={styles.colorIndicatorText}>{option.icon}</Text>
                </View>
              )}
              <Text style={styles.dropdownOptionText}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalTint} />
        <View style={[styles.modalContent, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('🔴 Save button pressed!');
              handleCreateEvent();
            }} 
            style={styles.createButton}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section A: Who Sees This */}
          <View style={styles.section}>
            <WhoSeesThisSection
              selectedValue={whoSeesThis}
              onValueChange={(value) => {
                setWhoSeesThis(value);
                // Map to old postTo for now (will be removed later)
                if (value === 'team') {
                  setPostTo('Team');
                  setEventVisibility('fullTeam');
                } else if (value === 'personal') {
                  setPostTo('Personal');
                  setEventVisibility('fullTeam');
                } else if (value === 'specificGroups') {
                  setPostTo('Team'); // Groups still use 'Team' visibility
                  setEventVisibility('specificGroups');
                }
              }}
              selectedGroups={selectedGroups}
              availableGroups={availableGroups}
              teamColors={teamColors}
            />
          </View>

          {/* Section B: Event Type */}
          <View style={styles.section}>
            <EventTypeTabs
              selectedType={eventType}
              onTypeChange={(type) => {
                setEventType(type);
                // Auto-fill title if empty
                if (!title || title.trim() === '') {
                  const typeConfig = eventTypes.find(t => t.id === type);
                  if (typeConfig && type !== 'other') {
                    setTitle(typeConfig.title);
                  }
                }
              }}
              teamColors={teamColors}
            />
          </View>

          {/* Section C: Core Details */}
          <View style={styles.coreDetailsCard}>
            {/* Title */}
            <View style={styles.inputField}>
              <TextInput
                style={styles.modernInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor={COLORS.TEXT_TERTIARY}
              />
            </View>
            <View style={styles.fieldDivider} />

            {/* Description */}
            <View style={styles.inputField}>
              <TextInput
                style={[styles.modernInput, styles.multilineInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add description..."
                placeholderTextColor={COLORS.TEXT_TERTIARY}
                multiline
                textAlignVertical="top"
              />
            </View>
            <View style={styles.fieldDivider} />

            {/* Location */}
            <View style={styles.inputField}>
              <TextInput
                style={styles.modernInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Location"
                placeholderTextColor={COLORS.TEXT_TERTIARY}
              />
              <TouchableOpacity 
                style={styles.useCurrentLocationButton}
                onPress={() => {
                  // TODO: Implement current location
                  console.log('Use current location');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="location" size={14} color={COLORS.TEXT_SECONDARY} style={{ marginRight: 6 }} />
                <Text style={styles.useCurrentLocationText}>Use current location</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fieldDivider} />

            {/* Date and Time */}
            <View style={styles.dateTimeRow}>
              {/* Date */}
              <View style={[styles.inputField, styles.dateInputField]}>
                <TextInput
                  style={styles.modernInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="Date"
                  placeholderTextColor={COLORS.TEXT_TERTIARY}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.fieldDivider} />

            {/* Start Time and End Time */}
            <View style={styles.timeRow}>
              <View style={[styles.inputField, styles.timeInputField]}>
                <TextInput
                  style={styles.modernInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="Start time"
                  placeholderTextColor={COLORS.TEXT_TERTIARY}
                />
              </View>
              <View style={[styles.inputField, styles.timeInputField]}>
                <TextInput
                  style={styles.modernInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="End time"
                  placeholderTextColor={COLORS.TEXT_TERTIARY}
                />
              </View>
            </View>
          </View>

          {/* Section F: Assigned Groups (only shown when "Specific group(s)" is selected) */}
          {whoSeesThis === 'specificGroups' && (
            <View style={styles.section}>
              <AssignedGroupsGrid
                selectedGroups={selectedGroups}
                availableGroups={availableGroups}
                onToggleGroup={(groupId) => {
                  setUserModifiedGroups(true);
                  setSelectedGroups(prev => {
                    if (prev.includes(groupId)) {
                      return prev.filter(id => id !== groupId);
                    } else {
                      return [...prev, groupId];
                    }
                  });
                }}
                teamColors={teamColors}
              />
            </View>
          )}

          {/* Section E: Repeat Event */}
          <View style={styles.card}>
            {renderDropdown('Repeat Event', recurring, recurringOptions, setRecurring, false, showRecurringDropdown, setShowRecurringDropdown)}
          </View>

          {/* Section D: Attachments */}
          <View style={styles.card}>
            <View style={styles.attachmentsSection}>
              <Text style={styles.sectionTitle}>Attachments</Text>
              <TouchableOpacity 
                style={styles.attachmentButton}
                onPress={handlePickFiles}
                activeOpacity={0.7}
                disabled={isUploadingAttachments}
              >
                <Ionicons name="add" size={20} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.attachmentButtonText}>Add files / attach PDFs</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_TERTIARY} />
              </TouchableOpacity>
              
              {/* Display selected attachments */}
              {attachments.length > 0 && (
                <View style={styles.attachmentsList}>
                  {attachments.map((file, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      <Ionicons name="document" size={16} color={COLORS.TEXT_SECONDARY} />
                      <Text style={styles.attachmentFileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeAttachment(index)}
                        style={styles.removeAttachmentButton}
                      >
                        <Ionicons name="close-circle" size={18} color={COLORS.TEXT_TERTIARY} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              {isUploadingAttachments && (
                <View style={styles.uploadingIndicator}>
                  <ActivityIndicator size="small" color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.uploadingText}>Uploading attachments...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Section G: Attendance Settings */}
          <View style={styles.card}>
            <AttendanceSettingsSection
              attendanceRequirement={attendanceRequirement}
              onRequirementChange={setAttendanceRequirement}
              checkInMethods={checkInMethods}
              onMethodsChange={setCheckInMethods}
              teamColors={teamColors}
            />
          </View>

          {/* Old Event Visibility section removed - now using WhoSeesThisSection and AssignedGroupsGrid */}


          {/* Old Group Selector Modal - keeping for potential future use but not shown */}
          {false && showGroupSelector && (
                <View style={styles.groupSelector}>
                  {/* Search */}
                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.TEXT_TERTIARY} />
                    <TextInput
                      style={styles.searchInput}
                      value={groupSearchQuery}
                      onChangeText={setGroupSearchQuery}
                      placeholder="Search groups..."
                      placeholderTextColor={COLORS.TEXT_TERTIARY}
                    />
                    {groupSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setGroupSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={COLORS.TEXT_TERTIARY} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Empty State or Group List */}
                  {isLoadingGroups ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                    </View>
                  ) : availableGroups.length === 0 ? (
                    <View style={styles.emptyGroupsMessage}>
                      <Ionicons name="information-circle-outline" size={24} color={COLORS.TEXT_TERTIARY} />
                      <Text style={styles.emptyGroupsText}>
                        No attendance groups created yet.{'\n'}
                        Create groups in Team Settings → Attendance Groups.
                      </Text>
                    </View>
                  ) : filteredGroups.length === 0 ? (
                    <View style={styles.emptySearchMessage}>
                      <Text style={styles.emptySearchText}>
                        No groups found matching "{debouncedSearchQuery}"
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.groupList} maxHeight={200}>
                      {filteredGroups.map(group => {
                        const isSelected = selectedGroups.includes(group.id);
                        return (
                          <TouchableOpacity
                            key={group.id}
                            style={styles.groupOption}
                            onPress={() => toggleGroup(group.id)}
                          >
                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                              {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />}
                            </View>
                            <Text style={styles.groupOptionText}>{group.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Actions */}
                  <View style={styles.selectorActions}>
                    <TouchableOpacity
                      style={styles.selectorCancelButton}
                      onPress={() => {
                        setShowGroupSelector(false);
                        setGroupSearchQuery('');
                      }}
                    >
                      <Text style={styles.selectorCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.selectorDoneButton}
                      onPress={() => {
                        setShowGroupSelector(false);
                        setGroupSearchQuery('');
                      }}
                    >
                      <Text style={styles.selectorDoneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000', // Pure black background
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    fontSize: scaleFont(FONT_SIZES.LG),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  createButton: {
    backgroundColor: COLORS.ICON_BACKGROUND_HOME,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 0,
    minWidth: 70,
    alignItems: 'center',
  },
  createButtonText: {
    ...TYPOGRAPHY.button,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    borderWidth: 0,
    minHeight: 48,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  colorIndicatorText: {
    color: COLORS.WHITE,
    fontSize: scaleFont(12),
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  dropdownText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownOptions: {
    backgroundColor: 'rgba(12, 12, 14, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
  },
  textInput: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 0,
    minHeight: 48,
  },
  inputText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeInputContainer: {
    flex: 1,
    position: 'relative',
  },
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_TERTIARY,
    marginHorizontal: 12,
    fontWeight: FONT_WEIGHTS.REGULAR,
    paddingTop: 14,
  },
  timePickerOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(12, 12, 14, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 200,
    overflow: 'hidden',
  },
  timePickerScroll: {
    maxHeight: 200,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  timeDurationInfo: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  durationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
    marginBottom: 6,
  },
  warningsContainer: {
    marginTop: 12,
    gap: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    ...TYPOGRAPHY.caption,
    color: '#F59E0B',
    marginLeft: 6,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Card Style (reusable)
  card: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // Core Details Card Styles
  coreDetailsCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // Modern iOS-style input fields
  inputField: {
    marginBottom: 0,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 16,
  },
  modernInput: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 0,
    minHeight: 44,
  },
  multilineInput: {
    height: 44,
    paddingTop: 10,
    paddingBottom: 10,
  },
  dateTimeRow: {
    marginBottom: 16,
  },
  dateInputField: {
    marginBottom: 0,
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timeInputField: {
    flex: 1,
    marginBottom: 0,
    marginRight: 12,
  },
  useCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 8,
  },
  useCurrentLocationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_SECONDARY,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  // Attachments Section Styles
  attachmentsSection: {
    // No margin needed - inside card
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0,
  },
  attachmentButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginLeft: 12,
  },
  attachmentsList: {
    marginTop: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  attachmentFileName: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginLeft: 8,
  },
  removeAttachmentButton: {
    marginLeft: 8,
    padding: 4,
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
  },
  uploadingText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 8,
  },
  // Event Visibility Styles
  radioGroup: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.TEXT_TERTIARY,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
  },
  radioLabel: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
  },
  selectedGroupsContainer: {
    marginTop: 12,
  },
  selectedGroupsLabel: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  chipRemove: {
    padding: 2,
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
  },
  addGroupText: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.PRIMARY,
  },
  // Group Selector Styles
  groupSelector: {
    marginTop: 12,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyGroupsMessage: {
    padding: 20,
    alignItems: 'center',
  },
  emptyGroupsText: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptySearchMessage: {
    padding: 20,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
  },
  groupList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.TEXT_TERTIARY,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  groupOptionText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  selectorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectorCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  selectorCancelButtonText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  selectorDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
  },
  selectorDoneButtonText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.WHITE,
  },
});

export default EventCreationModal;
