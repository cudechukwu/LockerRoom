/**
 * AttendanceStatsBar Component
 * Displays attendance statistics
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getFontWeight, getFontSize } from '../../constants/fonts';
import { calculateAttendanceStats } from '../../services/attendanceService';

function AttendanceStatsBar({ attendance, totalMembers = 0 }) {
  // Memoize stats calculation to prevent recalculation on every render
  const stats = useMemo(() => calculateAttendanceStats(attendance), [attendance]);
  
  // Calculate absent count correctly:
  // Absent = total members - (present + late + excused)
  // This accounts for members who haven't checked in yet
  const checkedInCount = useMemo(() => stats.present + stats.late + stats.excused, [stats.present, stats.late, stats.excused]);
  const absentCount = useMemo(() => Math.max(0, totalMembers - checkedInCount), [totalMembers, checkedInCount]);

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Text style={styles.statNumber}>
            {stats.present}
          </Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={[styles.statNumber, { color: COLORS.WARNING }]}>
            {stats.late}
          </Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={[styles.statNumber, { color: COLORS.ERROR }]}>
            {absentCount}
          </Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        {stats.excused > 0 && (
          <View style={styles.statBadge}>
            <Text style={[styles.statNumber, { color: '#9CA3AF' }]}>
              {stats.excused}
            </Text>
            <Text style={styles.statLabel}>Excused</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statNumber: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.SUCCESS,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.TEXT_SECONDARY,
  },
});

// Memoize component to prevent unnecessary re-renders
export default React.memo(AttendanceStatsBar, (prevProps, nextProps) => {
  // Custom comparison - only re-render if attendance data or totalMembers changes
  return (
    prevProps.totalMembers === nextProps.totalMembers &&
    prevProps.attendance === nextProps.attendance
  );
});

