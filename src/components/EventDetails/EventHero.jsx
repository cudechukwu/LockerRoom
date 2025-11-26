/**
 * EventHero Component
 * Pure UI component for event hero header
 * 
 * Displays:
 * - Action bar (close, edit, delete)
 * - Large title
 * - Metadata (postTo, creator)
 * - Date & time with icons
 * 
 * NO business logic - all logic comes from props
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';
import { formatEventDate, formatEventTime } from '../../services/eventService';

const EventHero = ({
  event,
  creatorName,
  isLoadingCreator = false,
  onClose,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}) => {
  if (!event) return null;

  // Get postTo label
  const getPostToLabel = () => {
    if (event.postTo === 'Team') return 'Team Event';
    if (event.postTo === 'Personal') return 'Personal Event';
    return event.postTo || 'Event';
  };

  return (
    <View style={styles.heroSection}>
        {/* Top Action Bar */}
        <View style={styles.heroActionBar}>
          <TouchableOpacity onPress={onClose} style={styles.heroActionButtonLeft}>
            <Ionicons name="close" size={22} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
          <View style={styles.heroActionRight}>
            {canEdit && (
              <TouchableOpacity onPress={onEdit} style={styles.heroActionButton}>
                <Ionicons name="pencil" size={20} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.heroActionButton}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Large Title */}
        <Text style={styles.heroTitle}>{event.title || 'Event'}</Text>
        
        {/* Metadata Row - Grey, smaller */}
        <Text style={styles.heroMetadata}>
          {getPostToLabel()}
          {creatorName && ` • Created by ${creatorName}`}
          {isLoadingCreator && !creatorName && ' • Loading...'}
        </Text>

        {/* Date & Time with Icons */}
        <View style={styles.heroDetails}>
          {(event.date || event.startTime) && (
            <View style={styles.heroDetailRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.heroDetailText}>
                {formatEventDate(event.date || event.startTime) || 'No date set'}
              </Text>
            </View>
          )}
          {formatEventTime(event.startTime, event.endTime) && (
            <View style={styles.heroDetailRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.heroDetailText}>
                {formatEventTime(event.startTime, event.endTime)}
              </Text>
            </View>
          )}
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12, // Reduced to move icons closer to safe area
    paddingBottom: 40, // Industry standard: 40-48
    marginBottom: 0,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  heroActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroActionButton: {
    padding: 8, // 44x44 touch target minimum
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionButtonLeft: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 8,
    paddingLeft: 0, // No left padding to align with content below
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start', // Align icon to left
    justifyContent: 'center',
  },
  heroActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Reduced gap between edit and delete icons
  },
  heroTitle: {
    ...TYPOGRAPHY.heading,
    fontSize: scaleFont(32),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
    lineHeight: 38,
  },
  heroMetadata: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 24,
    lineHeight: 18,
  },
  heroDetails: {
    gap: 10,
  },
  heroDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDetailText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 10,
    lineHeight: 22,
  },
});

export default EventHero;

