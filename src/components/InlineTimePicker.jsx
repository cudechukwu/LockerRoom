/**
 * InlineTimePicker Component
 * Native iOS wheel picker / Android modal picker for time selection
 * 
 * Features:
 * - Inline wheel picker on iOS (matches native iOS design)
 * - Modal picker on Android
 * - Dark theme support
 * - Minimal styling - matches EventDetails UI
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';

const InlineTimePicker = ({ 
  value, // Date object
  onChange, 
  mode = 'time',
  is24Hour = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

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

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') {
        return; // User cancelled
      }
    }
    if (selectedDate && onChange) {
      onChange(selectedDate);
    }
  };

  // iOS: Inline wheel picker (spinner)
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display="spinner"
          onChange={handleChange}
          is24Hour={is24Hour}
          textColor={COLORS.TEXT_PRIMARY}
          themeVariant="dark"
          style={styles.picker}
          locale="en_US"
        />
      </View>
    );
  }

  // Android: Modal picker triggered by button
  return (
    <View>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{formatTime(value)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display="default"
          onChange={handleChange}
          is24Hour={is24Hour}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    marginTop: 0,
    marginBottom: 0,
  },
  picker: {
    width: '100%',
    height: 160,
    backgroundColor: 'transparent',
    marginTop: -10,
    marginBottom: -10,
  },
  button: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});

export default InlineTimePicker;


