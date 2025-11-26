/**
 * NotesCard Component
 * Pure UI component for displaying event notes
 * 
 * Displays:
 * - Event notes in a lightweight card
 * 
 * NO business logic - all logic comes from props
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

const NotesCard = ({ notes }) => {
  if (!notes || !String(notes).trim()) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Notes</Text>
      <Text style={styles.notesText}>{String(notes)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitle: {
    ...TYPOGRAPHY.title,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  notesText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 22,
  },
});

export default NotesCard;

