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
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const EventCreationModal = ({ 
  visible, 
  onClose, 
  onCreateEvent,
  prefilledData = {},
  teamColors = { primary: '#FF4444', secondary: '#000000' }
}) => {
  const [postTo, setPostTo] = useState('Team');
  const [eventType, setEventType] = useState('practice');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString());
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

  const handleCreateEvent = () => {
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
    
    onCreateEvent(eventData);
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
          color="#6B7280" 
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <TouchableOpacity onPress={handleCreateEvent} style={styles.createButton}>
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
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity style={styles.textInput}>
              <Text style={styles.inputText}>{date}</Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
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
                    color="#6B7280" 
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
                    color="#6B7280" 
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
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    fontSize: getFontSize('BASE'),
    color: '#6B7280',
    fontWeight: getFontWeight('REGULAR'),
  },
  headerTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  createButton: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  createButtonText: {
    fontSize: getFontSize('BASE'),
    color: '#FFFFFF',
    fontWeight: getFontWeight('MEDIUM'),
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  },
  colorIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: getFontWeight('BOLD'),
  },
  dropdownText: {
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
    fontWeight: getFontWeight('REGULAR'),
  },
  dropdownOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1000,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  dropdownOptionText: {
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
    fontWeight: getFontWeight('REGULAR'),
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
    fontWeight: getFontWeight('REGULAR'),
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
    fontSize: getFontSize('BASE'),
    color: '#6B7280',
    marginHorizontal: 12,
    fontWeight: getFontWeight('REGULAR'),
    paddingTop: 12,
  },
  timePickerOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1000,
    maxHeight: 200,
  },
  timePickerScroll: {
    maxHeight: 200,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  timeOptionText: {
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
    fontWeight: getFontWeight('REGULAR'),
    textAlign: 'center',
  },
  timeDurationInfo: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  durationText: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
    fontWeight: getFontWeight('MEDIUM'),
    marginBottom: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    fontSize: getFontSize('SM'),
    color: '#92400E',
    fontWeight: getFontWeight('MEDIUM'),
    marginLeft: 6,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});

export default EventCreationModal;
