/**
 * CollapsibleTimePicker Component
 * iOS-native style collapsible time picker with summary row
 * 
 * Features:
 * - Collapsed: Shows formatted time with chevron
 * - Expanded: Shows native iOS wheel picker
 * - Full-width block layout (not side-by-side)
 * - Duration display for end time
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';

const CollapsibleTimePicker = ({ 
  value, // Date object
  onChange,
  label, // "Start" or "End"
  showDuration = false, // Show duration hint (for end time)
  durationText = null, // "2h 0m" or "Ends next day · 1h 30m"
  is24Hour = false, // false = 12-hour format with AM/PM column
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format Date object to "3:00 PM" string
  const formatTime = (date) => {
    if (!date) return '3:00 PM';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  // Memoize formatted time to prevent unnecessary recalculations
  const formattedTime = useMemo(() => formatTime(value), [value]);

  const handleChange = (event, selectedDate) => {
    // Safer Android dismissal handling
    const dismissed = event?.type === 'dismissed' || selectedDate == null;
    
    if (Platform.OS === 'android') {
      // Prevent immediate collapse flicker - delay to let animation complete
      setTimeout(() => setIsExpanded(false), 120);
      if (dismissed) {
        return; // User cancelled
      }
    }
    if (selectedDate && onChange) {
      onChange(selectedDate);
    }
  };

  const toggleExpanded = () => {
    // Haptic feedback for better UX
    Haptics.selectionAsync();
    setIsExpanded(!isExpanded);
  };

  // Android: Modal picker (always collapsed, shows modal on tap)
  if (Platform.OS === 'android') {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.summaryRow}
          onPress={() => {
            // Android shows modal picker
            setIsExpanded(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.summaryContent}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formattedTime}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_TERTIARY} />
            </View>
          </View>
        </TouchableOpacity>
        {showDuration && durationText && (
          <Text style={styles.durationText}>{durationText}</Text>
        )}
        {isExpanded && (
          <DateTimePicker
            value={value || new Date()}
            mode="time"
            display="default"
            onChange={handleChange}
            is24Hour={is24Hour}
          />
        )}
      </View>
    );
  }

  // iOS: Collapsible inline wheel picker
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.summaryRow}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.summaryContent}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formattedTime}</Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={COLORS.TEXT_TERTIARY} 
            />
          </View>
        </View>
      </TouchableOpacity>
      
      {isExpanded && (
        <>
          <View style={styles.divider} />
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={value || new Date()}
              mode="time"
              display="spinner"
              onChange={handleChange}
              is24Hour={false}
              textColor={COLORS.TEXT_PRIMARY}
              themeVariant="dark"
              style={styles.picker}
            />
          </View>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => {
              Haptics.selectionAsync();
              setIsExpanded(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </>
      )}
      
      {showDuration && durationText && (
        <Text style={styles.durationText}>{durationText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 0,
  },
  summaryRow: {
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.REGULAR,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 8,
    marginBottom: 12,
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 100,
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  durationText: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_TERTIARY,
    marginTop: 4,
    marginLeft: 0,
  },
  doneButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
});

export default CollapsibleTimePicker;

