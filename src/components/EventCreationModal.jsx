import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
// DocumentPicker is now handled by useEventAttachments hook
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { getTodayAnchor } from '../utils/dateUtils';
import { useSupabase } from '../providers/SupabaseProvider';
// Note: uploadEventAttachment, getTeamAttendanceGroups, useDebounce, DocumentPicker
// are now handled by their respective hooks (useEventSubmit, useEventGroups, useEventAttachments)
import WhoSeesThisSection from './EventCreation/WhoSeesThisSection';
import EventTypeTabs from './EventCreation/EventTypeTabs';
import AssignedGroupsGrid from './EventCreation/AssignedGroupsGrid';
import AttendanceSettingsSection from './EventCreation/AttendanceSettingsSection';
import EventCoreDetailsCard from './EventCreation/EventCoreDetailsCard';
import GradientCard from './EventCreation/GradientCard';
import EventRecurringSection from './EventCreation/EventRecurringSection';
import EventAttachmentsSection from './EventCreation/EventAttachmentsSection';
import SaveButton from './EventCreation/SaveButton';
// New hooks
import { useEventFormState } from './EventCreation/hooks/useEventFormState';
import { useEventTimes } from './EventCreation/hooks/useEventTimes';
import { useEventGroups } from './EventCreation/hooks/useEventGroups';
import { useEventVisibility } from './EventCreation/hooks/useEventVisibility';
import { useEventAttachments } from './EventCreation/hooks/useEventAttachments';
import { useEventSubmit } from './EventCreation/hooks/useEventSubmit';
import { useEventFormData } from './EventCreation/hooks/useEventFormData';
import { parseDateFromInput } from '../utils/dateUtils';

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
  
  // Error state tracking for field-level validation feedback
  const [fieldErrors, setFieldErrors] = useState({});
  const titleInputRef = useRef(null);
  
  // STEP 1: Replace basic form state with useEventFormState hook
  // This manages: title, eventType, date, location, notes, recurring, attendance settings, expanded sections, dropdowns
  const {
    // State object (needed for accessing startTime/endTime for useEventTimes)
    formState,
    // Core form fields
    title,
    setTitle,
    eventType,
    setEventType,
    date,
    setDate,
    location,
    setLocation,
    notes,
    setNotes,
    recurring,
    setRecurring,
    // Attendance settings
    attendanceRequirement,
    setAttendanceRequirement,
    checkInMethods,
    setCheckInMethods,
    // UI state
    expandedSections,
    toggleSection,
    openDropdown,
    setDropdown,
    closeDropdown,
    // Utilities
    setMultipleFields,
    resetForm,
  } = useEventFormState();
  
  // STEP 4: Replace attachments management with useEventAttachments hook
  const attachmentsState = useEventAttachments(formState.attachments || []);

  // Sync attachments back to form state when they change (prevent circular updates)
  useEffect(() => {
    const currentAttachments = formState.attachments || [];
    const newAttachments = attachmentsState.attachments || [];
    
    // Only sync if attachments actually changed (prevent circular updates)
    if (JSON.stringify(currentAttachments) !== JSON.stringify(newAttachments)) {
      setMultipleFields({ attachments: newAttachments });
    }
  }, [attachmentsState.attachments, setMultipleFields, formState.attachments]);

  // Destructure for easier access (rename to avoid conflicts)
  const {
    attachments,
    pickFiles: pickFilesInternal,
    removeAttachment: removeAttachmentInternal,
  } = attachmentsState;
  
  // Wrapper functions for backward compatibility
  const handlePickFiles = useCallback(() => {
    pickFilesInternal();
  }, [pickFilesInternal]);

  const removeAttachment = useCallback((index) => {
    removeAttachmentInternal(index);
  }, [removeAttachmentInternal]);
  
  // STEP 3: Replace groups/visibility management with hooks
  // useEventVisibility manages whoSeesThis, eventVisibility, selectedGroups
  const visibilityState = useEventVisibility({
    initialWhoSeesThis: formState.whoSeesThis || 'team',
    initialVisibility: formState.eventVisibility || 'fullTeam',
    initialSelectedGroups: formState.selectedGroups || [],
  });
  
  // Sync visibility state back to form state (prevent circular updates)
  useEffect(() => {
    const currentWhoSeesThis = formState.whoSeesThis || 'team';
    const currentVisibility = formState.eventVisibility || 'fullTeam';
    const currentGroups = formState.selectedGroups || [];

    // Only sync if values actually changed (prevent circular updates)
    if (
      currentWhoSeesThis !== visibilityState.whoSeesThis ||
      currentVisibility !== visibilityState.eventVisibility ||
      JSON.stringify(currentGroups) !== JSON.stringify(visibilityState.selectedGroups)
    ) {
      setMultipleFields({
        whoSeesThis: visibilityState.whoSeesThis,
        eventVisibility: visibilityState.eventVisibility,
        selectedGroups: visibilityState.selectedGroups,
      });
    }
  }, [visibilityState.whoSeesThis, visibilityState.eventVisibility, visibilityState.selectedGroups, setMultipleFields, formState.whoSeesThis, formState.eventVisibility, formState.selectedGroups]);

  // useEventGroups manages availableGroups, filtering, loading
  const groupsState = useEventGroups({
    supabase,
    teamId,
    editingEvent,
    visible,
    selectedGroups: visibilityState.selectedGroups,
    onSelectedGroupsChange: visibilityState.setSelectedGroups,
    onVisibilityChange: visibilityState.setEventVisibility,
    userModifiedGroups: visibilityState.userModifiedGroups,
  });
  
  // Destructure for easier access
  const {
    whoSeesThis,
    setWhoSeesThis,
    eventVisibility,
    setEventVisibility,
    selectedGroups,
    setSelectedGroups,
    toggleGroup: toggleGroupVisibility,
    userModifiedGroups,
  } = visibilityState;
  
  const {
    availableGroups,
    filteredGroups,
    isLoadingGroups,
    groupSearchQuery,
    setGroupSearchQuery,
  } = groupsState;

  // STEP 2: Replace time management with useEventTimes hook
  // Parse date string to Date object for time anchoring
  const eventDateObj = useMemo(() => {
    if (!date) return new Date();
    return parseDateFromInput(date) || new Date();
  }, [date]);

  // Use useEventTimes for time management (it handles duration calculation)
  // Initialize with times from form state (which are already Date objects from useEventFormState)
  const {
    startTime,
    setStartTime: setStartTimeInternal,
    endTime,
    setEndTime: setEndTimeInternal,
    durationText,
  } = useEventTimes(formState.startTime, formState.endTime, eventDateObj);
  
  // Wrapper setters that update both useEventTimes and form state
  const setStartTime = useCallback((newTime) => {
    setStartTimeInternal(newTime);
    setMultipleFields({ startTime: newTime });
  }, [setStartTimeInternal, setMultipleFields]);
  
  const setEndTime = useCallback((newTime) => {
    setEndTimeInternal(newTime);
    setMultipleFields({ endTime: newTime });
  }, [setEndTimeInternal, setMultipleFields]);
    
  // isUploadingAttachments is now provided by useEventSubmit hook (see below)
  
  // Map openDropdown to showRecurringDropdown for backward compatibility during migration
  const showRecurringDropdown = openDropdown === 'recurring';
  const setShowRecurringDropdown = (show) => {
    if (show) {
      setDropdown('recurring');
    } else {
      closeDropdown();
    }
  };
  
  // Helper to close all dropdowns (for backward compatibility)
  const closeAllDropdowns = () => {
    closeDropdown();
  };
  
  // Group selector is now integrated into openDropdown state
  const showGroupSelector = openDropdown === 'groups';

  // Event type configurations with colors
  const eventTypes = useMemo(() => [
    { id: 'practice', title: 'Practice', color: teamColors.primary, icon: 'P' },
    { id: 'workout', title: 'Workout', color: teamColors.primary, icon: 'W' },
    { id: 'meeting', title: 'Meeting', color: '#10B981', icon: 'M' },
    { id: 'film', title: 'Film', color: '#8B5CF6', icon: 'F' },
    { id: 'therapy', title: 'Therapy', color: '#F59E0B', icon: 'T' },
    { id: 'travel', title: 'Travel', color: '#3B82F6', icon: 'T' },
    { id: 'game', title: 'Game', color: '#1F2937', icon: 'G' },
    { id: 'other', title: 'Other', color: '#6B7280', icon: 'O' },
  ], [teamColors.primary]);
  
  // STEP 5: Replace handleCreateEvent with useEventSubmit hook
  // Note: We pass individual pieces instead of a combined object to avoid unnecessary recomputations
  // The submitEvent function will combine them internally when needed
  
  // Use submission hook
  const { submitEvent, isUploadingAttachments: isUploadingFromHook, isSubmitting } = useEventSubmit(onCreateEvent, {
    supabase,
    teamId,
    onSuccess: () => {
      // Reset form and close modal on success
      resetForm();
      visibilityState.reset();
      attachmentsState.clearAttachments();
      onClose();
    },
    onError: (errors) => {
      // Errors are already shown by the hook via Alert
      console.error('Event submission errors:', errors);
    },
  });

  // Use isUploadingAttachments from hook
  const isUploadingAttachments = isUploadingFromHook;
  
  // Wrapper for handleCreateEvent that uses the hook
  // Pass individual state pieces instead of combined object to avoid recomputation
  const handleCreateEvent = useCallback(async () => {
    // Clear previous errors
    setFieldErrors({});
    
    // Build form data from individual pieces (avoid spreading formState object)
    const formData = {
      title: formState.title,
      eventType: formState.eventType,
      date: formState.date,
      location: formState.location,
      notes: formState.notes,
      recurring: formState.recurring,
      attendanceRequirement: formState.attendanceRequirement,
      checkInMethods: formState.checkInMethods,
      // Time fields (from useEventTimes)
      startTime,
      endTime,
      // Visibility fields (from useEventVisibility)
      whoSeesThis,
      selectedGroups,
      // Attachments (from useEventAttachments)
      attachments,
    };
    
    const result = await submitEvent(formData, {
      eventTypes,
      teamColors,
    });
    
    // If validation failed, set field errors and focus the first error field
    if (!result.success && result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
        
      // Auto-focus the first field with an error
      if (result.fieldErrors.title && titleInputRef.current) {
        // Small delay to ensure modal is fully rendered
        setTimeout(() => {
          titleInputRef.current?.focus();
        }, 100);
      }
    } else if (result.success) {
      // Clear errors on success
      setFieldErrors({});
    }
    
    // If successful, the onSuccess callback handles reset and close
    // If failed, errors are already shown by the hook
    return result;
  }, [submitEvent, formState.title, formState.eventType, formState.date, formState.location, formState.notes, formState.recurring, formState.attendanceRequirement, formState.checkInMethods, startTime, endTime, whoSeesThis, selectedGroups, attachments, eventTypes, teamColors]);
  
  // Clear field error when user starts typing
  const handleTitleChange = useCallback((text) => {
    setTitle(text);
    // Use functional update to avoid dependency on fieldErrors.title
    setFieldErrors(prev => {
      if (prev.title) {
        const next = { ...prev };
        delete next.title;
        return next;
      }
      return prev;
    });
  }, [setTitle]);

  // STEP 6: Integrate useEventFormData hook for prefill/edit mode logic
  // This replaces the old useEffect hooks for handling editingEvent and prefilledData
  useEventFormData({
    visible,
    editingEvent,
    prefilledData,
    formState,
    onFormUpdate: setMultipleFields, // Use setMultipleFields to update form state
    eventDate: eventDateObj, // Pass the parsed event date for time anchoring
  });

  // Note: All dropdown options are now handled by their respective components
  // (EventRecurringSection, etc.)

  // Reset form state when modal closes
  useEffect(() => {
    if (!visible) {
      // Close all dropdowns (including group selector)
      closeDropdown();
      // Clear field errors
      setFieldErrors({});
      // Visibility and groups are reset by their respective hooks
    }
  }, [visible, closeDropdown]);

  // Group selection handler (uses visibility hook's toggleGroup)
  const toggleGroup = useCallback((groupId) => {
    toggleGroupVisibility(groupId);
  }, [toggleGroupVisibility]);

  // File picker and attachment removal are now handled by useEventAttachments hook (see above)
  // handleCreateEvent is now defined above using useEventSubmit hook

  // Duration calculation is now handled by useEventTimes hook (durationText is available above)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <View style={styles.container}>
          {/* Form Content - Header scrolls with content */}
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
          >
            {/* Header - Exact match to EventDetails EventHero */}
            <View style={[styles.heroSection, { paddingTop: insets.top + 4 }]}>
            {/* Top Action Bar */}
            <View style={styles.heroActionBar}>
              <TouchableOpacity onPress={onClose} style={styles.heroActionButtonLeft} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
              <SaveButton
                onPress={handleCreateEvent}
                isSubmitting={isSubmitting}
                isUploadingAttachments={isUploadingAttachments}
              />
        </View>
          </View>
          {/* Section A: Who Sees This */}
          <GradientCard>
            <WhoSeesThisSection
              selectedValue={whoSeesThis}
              onValueChange={setWhoSeesThis}
              teamColors={teamColors}
            />
          </GradientCard>

          {/* Section B: Event Type */}
          <GradientCard>
            <EventTypeTabs
              selectedType={eventType}
              onTypeChange={(type) => {
                setEventType(type);
              }}
              teamColors={teamColors}
            />
          </GradientCard>

          {/* Section C: Core Details - Always Visible */}
          <EventCoreDetailsCard
            title={title}
            setTitle={handleTitleChange}
            notes={notes}
            setNotes={setNotes}
            location={location}
            setLocation={setLocation}
            date={date}
            setDate={setDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            durationText={durationText}
            titleError={fieldErrors.title}
            titleInputRef={titleInputRef}
                />

          {/* Section F: Assigned Groups (only shown when "Specific group(s)" is selected) */}
          {whoSeesThis === 'specificGroups' && (
            <GradientCard>
              <AssignedGroupsGrid
                selectedGroups={selectedGroups}
                availableGroups={availableGroups}
                onToggleGroup={toggleGroup}
                teamColors={teamColors}
              />
            </GradientCard>
          )}

          {/* Collapsible Section: Repeat Event */}
          <EventRecurringSection
            recurring={recurring}
            onRecurringChange={setRecurring}
            openDropdown={openDropdown}
            onOpenDropdown={setDropdown}
            onCloseDropdown={closeDropdown}
          />

          {/* Collapsible Section: Attachments */}
          <GradientCard>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection('attachments')}
              activeOpacity={0.7}
            >
              <Text style={styles.collapsibleHeaderText}>Attachments</Text>
              <Ionicons
                name={expandedSections.attachments ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
            {expandedSections.attachments && (
              <View style={styles.collapsibleContent}>
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
            )}
          </GradientCard>

          {/* Collapsible Section: Attendance Settings */}
          <GradientCard>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => toggleSection('attendance')}
              activeOpacity={0.7}
            >
              <Text style={styles.collapsibleHeaderText}>Attendance Settings</Text>
              <Ionicons
                name={expandedSections.attendance ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
            {expandedSections.attendance && (
              <View style={styles.collapsibleContent}>
            <AttendanceSettingsSection
              attendanceRequirement={attendanceRequirement}
              onRequirementChange={setAttendanceRequirement}
              checkInMethods={checkInMethods}
              onMethodsChange={setCheckInMethods}
              teamColors={teamColors}
            />
          </View>
            )}
          </GradientCard>

          {/* Old Event Visibility section removed - now using WhoSeesThisSection and AssignedGroupsGrid */}
                    </ScrollView>
                  </View>
      </SafeAreaView>
    </Modal>
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
  // Hero Section - Exact match to EventDetails EventHero
  heroSection: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    marginBottom: 24,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  heroActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  heroActionButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionButtonLeft: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 8,
    paddingLeft: 0,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroTitle: {
    ...TYPOGRAPHY.heading,
    fontSize: scaleFont(32),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
    lineHeight: 38,
  },
  saveButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  collapsibleHeaderText: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  collapsibleContent: {
    marginTop: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
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
    paddingHorizontal: 0,
    paddingVertical: 14,
    backgroundColor: 'transparent',
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
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
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
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
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
  // Card Style (reusable) - Exact match to EventDetails cards
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
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 0,
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
    backgroundColor: 'transparent',
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
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
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
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
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
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
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
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
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
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
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
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
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
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.WHITE,
  },
});

export default EventCreationModal;
