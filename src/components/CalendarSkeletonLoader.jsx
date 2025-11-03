import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

export default function CalendarSkeletonLoader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.statusBarArea, { height: insets.top }]} />
      
      {/* Header skeleton */}
      <View style={styles.headerContainer}>
        <View style={styles.headerSkeleton} />
      </View>
      
      {/* Calendar view skeleton */}
      <View style={styles.calendarContainer}>
        {/* Calendar header with month/year */}
        <View style={styles.calendarHeader}>
          <View style={styles.monthYearSkeleton} />
          <View style={styles.navigationSkeleton} />
        </View>
        
        {/* Days of week header */}
        <View style={styles.daysOfWeekContainer}>
          {Array.from({ length: 7 }).map((_, index) => (
            <View key={index} style={styles.dayOfWeekSkeleton} />
          ))}
        </View>
        
        {/* Calendar grid skeleton */}
        <View style={styles.calendarGrid}>
          {Array.from({ length: 35 }).map((_, index) => (
            <View key={index} style={styles.calendarDaySkeleton}>
              {/* Random event dots for some days */}
              {index % 7 === 0 && (
                <View style={styles.eventDotSkeleton} />
              )}
              {index % 11 === 0 && (
                <View style={styles.eventDotSkeleton} />
              )}
            </View>
          ))}
        </View>
      </View>
      
      {/* Upcoming events skeleton */}
      <View style={styles.upcomingEventsContainer}>
        <View style={styles.upcomingEventsHeader}>
          <View style={styles.upcomingEventsTitleSkeleton} />
        </View>
        
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.upcomingEventSkeleton}>
            <View style={styles.eventTimeSkeleton} />
            <View style={styles.eventDetailsSkeleton}>
              <View style={styles.eventTitleSkeleton} />
              <View style={styles.eventLocationSkeleton} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  statusBarArea: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  headerSkeleton: {
    height: 28,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 8,
    marginBottom: 8,
  },
  calendarContainer: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYearSkeleton: {
    width: 120,
    height: 24,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 6,
  },
  navigationSkeleton: {
    flexDirection: 'row',
    gap: 8,
  },
  navButtonSkeleton: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 16,
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekSkeleton: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDaySkeleton: {
    width: (width - 72) / 7, // Account for padding and margins
    height: 40,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 6,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eventDotSkeleton: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 2,
  },
  upcomingEventsContainer: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 16,
  },
  upcomingEventsHeader: {
    marginBottom: 12,
  },
  upcomingEventsTitleSkeleton: {
    width: 150,
    height: 20,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 4,
  },
  upcomingEventSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_CARD_SECONDARY,
  },
  eventTimeSkeleton: {
    width: 60,
    height: 16,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 4,
    marginRight: 12,
  },
  eventDetailsSkeleton: {
    flex: 1,
  },
  eventTitleSkeleton: {
    width: '80%',
    height: 16,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 4,
    marginBottom: 4,
  },
  eventLocationSkeleton: {
    width: '60%',
    height: 12,
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 3,
  },
});
