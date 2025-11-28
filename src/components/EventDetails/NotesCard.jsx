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
import GradientCard from '../EventCreation/GradientCard';

const NotesCard = ({ notes }) => {
  if (!notes || !String(notes).trim()) {
    return null;
  }

  return (
    <GradientCard>
      <Text style={styles.cardTitle}>Notes</Text>
      <Text style={styles.notesText}>{String(notes)}</Text>
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  cardTitle: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  notesText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
});

export default NotesCard;

