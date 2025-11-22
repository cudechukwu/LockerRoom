import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTodayAnchor } from '../utils/dateUtils';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const EventCreationModal = ({ 
  visible, 
  onClose, 
  onCreateEvent,
  prefilledData = {},
  teamColors = { primary: '#FF4444', secondary: '#000000' }
}) => {
  const insets = useSafeAreaInsets();
  const [postTo, setPostTo] = useState('Team');
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

  // Dropdown visibility states
  const [showPostToDropdown, setShowPostToDropdown] = useState(false);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Event type configurations with colors
  const eventTypes = [
    { id: 'practice', title: 'Practice', color: teamColors.primary, icon: 'P' },
    { id: 'game', title: 'Game', color: '#1F2937', icon: 'G' }, // Dark gray for visibility
    { id: 'meeting', title: 'Meeting', color: '#10B981', icon: 'M' },
    { id: 'film', title: 'Film', color: '#8B5CF6', icon: 'F' },
    { id: 'training', title: 'Training', color: '#F59E0B', icon: 'T' },
    { id: 'other', title: 'Other', color: '#6B7280', icon: 'O' }, // Gray for other
  ];

  const postToOptions = ['Team', 'Personal', 'Group'];
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

  const handleCreateEvent = async () => {
    console.log('🔵 EventCreationModal: handleCreateEvent called');
    console.log('🔵 Form state:', { postTo, eventType, title, date, startTime, endTime, location, recurring, notes });
    
    // Basic validation
    if (!title || !title.trim()) {
      console.warn('⚠️ Title is required');
      return;
    }
    
    const eventData = {
      postTo,
      eventType,
      title,
      date,
      startTime,
      endTime,
      location,
      recurring,
      notes,
      color: eventTypes.find(type => type.id === eventType)?.color || teamColors.primary
    };
    
    console.log('🔵 Calling onCreateEvent with:', eventData);
    console.log('🔵 onCreateEvent function type:', typeof onCreateEvent);
    
    if (typeof onCreateEvent === 'function') {
      try {
        // Call the async function and wait for it
        await onCreateEvent(eventData);
        console.log('🔵 onCreateEvent completed successfully');
      } catch (error) {
        console.error('❌ Error in onCreateEvent:', error);
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
        <BlurView intensity={80} tint="dark" style={styles.modalBlur} />
        <View style={styles.modalTint} />
        <View style={[styles.modalContent, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('🔴 Create button pressed!');
              handleCreateEvent();
            }} 
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Post To */}
          {renderDropdown('Post to', postTo, postToOptions, setPostTo, false, showPostToDropdown, setShowPostToDropdown)}

          {/* Event Type */}
          {renderDropdown('Event Type', eventType, eventTypes, setEventType, true, showEventTypeDropdown, setShowEventTypeDropdown)}

          {/* Title */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Event title"
              placeholderTextColor={COLORS.TEXT_TERTIARY}
            />
          </View>

          {/* Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.textInput}
              value={date}
              onChangeText={setDate}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={COLORS.TEXT_TERTIARY}
              keyboardType="numeric"
            />
          </View>

          {/* Time */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Time</Text>
            <View style={styles.timeContainer}>
              <View style={styles.timeInputContainer}>
                <TouchableOpacity 
                  style={[styles.textInput, styles.timeInput]}
                  onPress={() => {
                    closeAllDropdowns();
                    setShowStartTimePicker(!showStartTimePicker);
                  }}
                >
                  <Text style={styles.inputText}>{startTime}</Text>
                  <Ionicons 
                    name={showStartTimePicker ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={COLORS.TEXT_TERTIARY} 
                  />
                </TouchableOpacity>
                {showStartTimePicker && (
                  <View style={styles.timePickerOptions}>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {timeOptions.map((time) => (
                        <TouchableOpacity
                          key={time}
                          style={styles.timeOption}
                          onPress={() => {
                            setStartTime(time);
                            setShowStartTimePicker(false);
                          }}
                        >
                          <Text style={styles.timeOptionText}>{time}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              <Text style={styles.timeSeparator}>to</Text>
              
              <View style={styles.timeInputContainer}>
                <TouchableOpacity 
                  style={[styles.textInput, styles.timeInput]}
                  onPress={() => {
                    closeAllDropdowns();
                    setShowEndTimePicker(!showEndTimePicker);
                  }}
                >
                  <Text style={styles.inputText}>{endTime}</Text>
                  <Ionicons 
                    name={showEndTimePicker ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={COLORS.TEXT_TERTIARY} 
                  />
                </TouchableOpacity>
                {showEndTimePicker && (
                  <View style={styles.timePickerOptions}>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {timeOptions.map((time) => (
                        <TouchableOpacity
                          key={time}
                          style={styles.timeOption}
                          onPress={() => {
                            setEndTime(time);
                            setShowEndTimePicker(false);
                          }}
                        >
                          <Text style={styles.timeOptionText}>{time}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
            
            {/* Time Duration Warning */}
            {(() => {
              const { duration, spansNextDay } = getEventDuration();
              return (
                <View style={styles.timeDurationInfo}>
                  <Text style={styles.durationText}>Duration: {duration}</Text>
                  {spansNextDay && (
                    <View style={styles.warningContainer}>
                      <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                      <Text style={styles.warningText}>Event continues to next day</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* Location */}
          {renderDropdown('Location', location || 'Select location', locationSuggestions, setLocation, false, showLocationDropdown, setShowLocationDropdown)}

          {/* Recurring */}
          {renderDropdown('Recurring', recurring, recurringOptions, setRecurring, false, showRecurringDropdown, setShowRecurringDropdown)}

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes or instructions..."
              placeholderTextColor={COLORS.TEXT_TERTIARY}
              multiline
              numberOfLines={3}
            />
          </View>
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
  modalBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.12)', // Very light tint - allows blur to show through
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_TERTIARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  createButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 0,
  },
  createButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 0,
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  dropdownOptions: {
    backgroundColor: 'rgba(12, 12, 14, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dropdownOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 0,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  timeOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
    textAlign: 'center',
  },
  timeDurationInfo: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  durationText: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_TERTIARY,
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginBottom: 6,
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
    fontSize: scaleFont(FONT_SIZES.XS),
    color: '#F59E0B',
    fontWeight: FONT_WEIGHTS.MEDIUM,
    marginLeft: 6,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
  },
});

export default EventCreationModal;
