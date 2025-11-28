/**
 * EventRecurringSection Component
 * Multiselect dropdown for selecting recurring days
 */

import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';
import GradientCard from './GradientCard';

const DAY_OPTIONS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Cache day order outside component to avoid recreating on every render
const DAY_ORDER = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
};

// Format selected days for display: "Every Sunday and Friday" or "Every Sunday, Friday, and Wednesday"
// IMPORTANT: selectedDays must be pre-sorted before calling this function
const formatSelectedDays = (selectedDays) => {
  if (!selectedDays || selectedDays.length === 0) {
    return 'Non Recurring';
  }
  
  // Ensure array is sorted (defensive check)
  const sorted = [...selectedDays].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
  
  if (sorted.length === 1) {
    return `Every ${sorted[0]}`;
  }
  
  if (sorted.length === 2) {
    return `Every ${sorted[0]} and ${sorted[1]}`;
  }
  
  // For 3+ days: "Every Sunday, Friday, and Wednesday"
  const allButLast = sorted.slice(0, -1).join(', ');
  const last = sorted[sorted.length - 1];
  return `Every ${allButLast}, and ${last}`;
};

const EventRecurringSection = memo(({
  recurring,
  onRecurringChange,
  openDropdown,
  onOpenDropdown,
  onCloseDropdown,
}) => {
  const showDropdown = openDropdown === 'recurring';
  
  // Track if we have a legacy string value (for UI indication)
  const hasLegacyRecurring = useMemo(() => {
    return recurring && typeof recurring === 'string' && recurring !== 'None' && !Array.isArray(recurring);
  }, [recurring]);
  
  // Ensure recurring is an array (handle legacy string values and null)
  const selectedDays = useMemo(() => {
    // Handle null, undefined, 'None', or empty array
    if (!recurring || recurring === 'None' || (Array.isArray(recurring) && recurring.length === 0)) {
      return [];
    }
    if (Array.isArray(recurring)) {
      // Sort array to ensure consistent display order regardless of user tap sequence
      return [...recurring].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
    }
    // Legacy: if it's a string, return empty array (user needs to reselect)
    // Note: hasLegacyRecurring flag will show visual indication
    return [];
  }, [recurring]);
  
  // Format display text - selectedDays is already sorted in useMemo
  const displayText = useMemo(() => {
    if (hasLegacyRecurring) {
      // Show indication that legacy recurrence exists but needs reselection
      return `Non Recurring (Legacy: ${recurring})`;
    }
    return formatSelectedDays(selectedDays);
  }, [selectedDays, hasLegacyRecurring, recurring]);
  
  const toggleDay = (day) => {
    const newSelectedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    // Sort days by their order in the week using cached DAY_ORDER
    const sorted = newSelectedDays.sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
    
    // Always return array (empty array [] means not recurring, not null)
    onRecurringChange(sorted);
  };

  return (
    <GradientCard>
      <TouchableOpacity 
        style={styles.dropdown}
        onPress={() => {
          if (showDropdown) {
            onCloseDropdown();
          } else {
            onOpenDropdown('recurring');
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownText}>{displayText}</Text>
        </View>
        <Ionicons 
          name={showDropdown ? "chevron-up" : "chevron-down"} 
          size={20}
          color={COLORS.TEXT_SECONDARY}
        />
      </TouchableOpacity>
      {showDropdown && (
        <View style={styles.dropdownOptions}>
          {DAY_OPTIONS.map((day, index) => {
            const isSelected = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dropdownOption,
                  isSelected && styles.dropdownOptionSelected
                ]}
                onPress={() => {
                  toggleDay(day);
                  // Don't close dropdown on selection - allow multiple selections
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  isSelected && styles.dropdownOptionTextSelected
                ]}>
                  Every {day}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={COLORS.TEXT_PRIMARY} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </GradientCard>
  );
});

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownText: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownOptions: {
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownOptionSelected: {
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  dropdownOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownOptionTextSelected: {
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
});

EventRecurringSection.displayName = 'EventRecurringSection';

export default EventRecurringSection;

