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

const EventDetailsCard = ({ event }) => {
  if (!event) return null;

  const hasLocation = event.location && String(event.location).trim();
  const hasRecurring = event.recurring && event.recurring !== 'None';

  // Don't render if there's nothing to show
  if (!hasLocation && !hasRecurring) return null;

  return (
    <View style={styles.card}>
      {hasRecurring && (
        <View style={styles.detailRow}>
          <Ionicons name="repeat-outline" size={20} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.detailText}>Repeats {event.recurring.toLowerCase()}</Text>
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

