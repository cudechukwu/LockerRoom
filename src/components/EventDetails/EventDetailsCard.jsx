/**
 * EventDetailsCard Component
 * Pure UI component for event details (date, time, location, recurring)
 * 
 * Displays:
 * - Date & time (if not in hero)
 * - Location
 * - Recurring info
 * 
 * NO business logic - all logic comes from props
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

// Format selected days for display: "Every Sunday and Friday" or "Every Sunday, Friday, and Wednesday"
const formatRecurringDisplay = (recurring) => {
  if (!recurring || recurring === 'None') {
    return null;
  }
  
  // Handle array format (new format)
  if (Array.isArray(recurring)) {
    if (recurring.length === 0) {
      return null;
    }
    
    // Day order for sorting
    const DAY_ORDER = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };
    
    // Sort days
    const sorted = [...recurring].sort((a, b) => (DAY_ORDER[a] || 0) - (DAY_ORDER[b] || 0));
    
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
  }
  
  // Handle legacy string format
  if (typeof recurring === 'string') {
    return recurring.charAt(0).toUpperCase() + recurring.slice(1).toLowerCase();
  }
  
  return null;
};

const EventDetailsCard = ({ event }) => {
  if (!event) return null;

  const hasLocation = event.location && String(event.location).trim();
  const recurringDisplay = formatRecurringDisplay(event.recurring);
  const hasRecurring = !!recurringDisplay;

  // Don't render if there's nothing to show
  if (!hasLocation && !hasRecurring) return null;

  return (
    <View style={styles.card}>
      {hasRecurring && (
        <View style={styles.detailRow}>
          <Ionicons name="repeat-outline" size={20} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>Repeats {recurringDisplay}</Text>
        </View>
      )}
      {hasLocation && (
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={20} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>{event.location}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    lineHeight: 22,
  },
});

export default EventDetailsCard;

