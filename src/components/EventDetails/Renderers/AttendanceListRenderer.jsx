import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import AttendanceList from '../../AttendanceList';

const AttendanceListRenderer = memo(({ eventId, instanceDate, teamId, isCoach, event }) => {
  return (
    <View style={styles.sectionContainer}>
      <AttendanceList
        eventId={eventId}
        instanceDate={instanceDate}
        teamId={teamId}
        isCoach={isCoach}
        event={event}
        scrollEnabled={false} // Parent FlatList handles scrolling
      />
    </View>
  );
});

AttendanceListRenderer.displayName = 'AttendanceListRenderer';

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 16,
  },
});

export default AttendanceListRenderer;

