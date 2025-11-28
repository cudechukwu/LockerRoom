/**
 * AttendanceSummary Component
 * Displays attendance statistics in a card
 * 
 * Shows:
 * - Present count
 * - Late count
 * - Absent count
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';
import GradientCard from '../EventCreation/GradientCard';

const AttendanceSummary = ({ stats = {}, totalMembers = 0 }) => {
  const present = stats.present || 0;
  const late = stats.late || 0;
  const excused = stats.excused || 0;
  
  // Calculate absent: total members - (present + late + excused)
  // This accounts for members who haven't checked in yet
  const checkedInCount = present + late + excused;
  const absent = Math.max(0, totalMembers - checkedInCount);

  return (
    <GradientCard>
      <Text style={styles.title}>Attendance</Text>
      <View style={styles.divider} />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{late}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...TYPOGRAPHY.h1,
    fontSize: scaleFont(FONT_SIZES.XXL),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_SECONDARY,
  },
});

export default AttendanceSummary;

