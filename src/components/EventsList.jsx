import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { getEventTypeInfo, EVENT_TYPES } from '../constants/eventTypes';
import { formatDateLabel, getTodayAnchor } from '../utils/dateUtils';

const EventsList = ({ 
  events, 
  currentDate, 
  isToday, 
  onEventPress, 
  onAddEvent,
  teamColors 
}) => {
  // Format time for display
  const formatTime = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }, []);

  // Use formatDateLabel from dateUtils (no need to redefine)

  // Sort events chronologically by start time
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const timeA = new Date(a.startTime || a.time).getTime();
      const timeB = new Date(b.startTime || b.time).getTime();
      return timeA - timeB;
    });
  }, [events]);

  // Render event card with enhanced visual depth
  const renderEventCard = (event, index) => {
    const startTime = formatTime(event.startTime);
    const endTime = formatTime(event.endTime);
    const eventType = event.eventType || event.type;
    const typeInfo = getEventTypeInfo(eventType, teamColors);
    const isGame = eventType === EVENT_TYPES.GAME;
    
    // Check if event has passed (end time is in the past)
    const isPastEvent = (() => {
      if (!event.endTime) return false;
      const endDate = new Date(event.endTime);
      const now = new Date();
      return endDate < now;
    })();
    
    // Game gradient colors - blueish/reddish like 433 (edge-focused, fading to transparent)
    // Color toward the left → fading into the neutral dark card
    const gameGradientColors = [
      'rgba(148, 27, 12, 0.55)',   // left edge, richer red
      'rgba(46, 49, 146, 0.35)',   // mid blue
      'rgba(0, 0, 0, 0.0)',        // fade to transparent at the far right
    ];
    
    // Non-game gradient colors - shiny white-grey on both sides
    // White-grey gradient fading from both edges to transparent in the middle
    const nonGameGradientColors = [
      'rgba(255, 255, 255, 0.25)', // left edge, shiny white-grey
      'rgba(200, 200, 200, 0.15)', // mid-left, lighter grey
      'rgba(0, 0, 0, 0.0)',        // transparent in the middle
      'rgba(200, 200, 200, 0.15)', // mid-right, lighter grey
      'rgba(255, 255, 255, 0.25)', // right edge, shiny white-grey
    ];
    
    // Badge colors - ensure good contrast for text visibility
    // Game badges use vibrant reddish color for game day hype!
    // Practice badges use team primary color
    const getBadgeColor = () => {
      if (isGame) {
        return '#950606'; // Vibrant red-pink for game badges - energetic and hype!
      }
      return event.color || typeInfo.color; // Use team primary for practice
    };
    
    const cardContent = (
      <View style={[styles.eventCardInner, isGame && styles.eventCardInnerGame]}>
        {/* Enhanced badge with shadow */}
        <View style={styles.eventBadgeContainer}>
          <View style={[
            styles.eventTypeBadge, 
            { backgroundColor: getBadgeColor() }
          ]}>
            <Text style={styles.eventTypeBadgeText}>{typeInfo.icon}</Text>
          </View>
        </View>
        
        <View style={styles.eventCardContent}>
          <Text style={styles.eventCardTitle}>{event.title}</Text>
          <View style={styles.eventCardMeta}>
            <Text style={styles.eventCardTime}>
              {startTime} - {endTime}
            </Text>
            {event.location && (
              <>
                <Text style={styles.eventCardSeparator}>•</Text>
                <Text style={styles.eventCardLocation}>{event.location}</Text>
              </>
            )}
          </View>
          {event.notes && event.notes.trim() && (
            <Text style={styles.eventCardNotes} numberOfLines={2}>
              {event.notes}
            </Text>
          )}
        </View>
        
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_TERTIARY} />
        </View>
      </View>
    );
    
    return (
      <TouchableOpacity
        key={event.id}
        style={[
          styles.eventCard, 
          isGame && styles.eventCardGame,
          isPastEvent && styles.eventCardPast
        ]}
        onPress={() => onEventPress(event)}
        activeOpacity={0.85}
      >
        {isGame ? (
          <LinearGradient
            colors={gameGradientColors}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.eventCardGradientBorder}
          >
            {cardContent}
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={nonGameGradientColors}
            locations={[0, 0.3, 0.5, 0.7, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.eventCardGradientBorder}
          >
            {cardContent}
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  };

  // Render event type section header
  const renderSectionHeader = (eventType, count) => {
    const typeInfo = getEventTypeInfo(eventType, teamColors);
    const isGame = eventType === EVENT_TYPES.GAME;
    
    // Badge colors for section headers - same logic as event cards
    // Game badges use vibrant reddish color for game day hype!
    const getSectionBadgeColor = () => {
      if (isGame) {
        return '#950606'; // Vibrant red-pink for game badges - energetic and hype!
      }
      return typeInfo.color; // Use team primary for practice
    };
    
    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIconBadge, { backgroundColor: getSectionBadgeColor() }]}>
            <Text style={styles.sectionIconText}>{typeInfo.icon}</Text>
          </View>
          <Text style={styles.sectionHeaderTitle}>{typeInfo.title}</Text>
        </View>
        <Text style={styles.sectionHeaderCount}>{count} event{count !== 1 ? 's' : ''}</Text>
      </View>
    );
  };

  if (events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={48} color={COLORS.TEXT_TERTIARY} />
        <Text style={styles.emptyStateTitle}>No events scheduled</Text>
        <Text style={styles.emptyStateText}>
          {isToday ? "You're all clear for today!" : "No events on this day."}
        </Text>
        <TouchableOpacity 
          style={styles.addEventButton}
          onPress={onAddEvent}
        >
          <Ionicons name="add" size={16} color={COLORS.WHITE} />
          <Text style={styles.addEventButtonText}>Add Event</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render events in chronological order
  const renderEventsList = () => {
    return (
      <>
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsHeaderTitle}>
            {isToday ? "Today's Events" : formatDateLabel(currentDate)}
          </Text>
          <Text style={styles.eventsHeaderCount}>
            {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {sortedEvents.map((event, index) => renderEventCard(event, index))}
      </>
    );
  };

  return (
    <View style={styles.eventsContainer}>
      {renderEventsList()}
    </View>
  );
};

const styles = StyleSheet.create({
  eventsContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  eventsHeaderTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.WHITE,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.BOLD,
    letterSpacing: -0.2,
  },
  eventsHeaderCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  eventSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconText: {
    color: COLORS.WHITE,
    fontSize: scaleFont(10),
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  sectionHeaderTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_SECONDARY,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHeaderCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
    fontSize: scaleFont(10),
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  eventCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventCardPast: {
    opacity: 0.4, // Grey out past events - reduce opacity to 40%
  },
  eventCardGame: {
    // Gradient border effect
  },
  eventCardGradientBorder: {
    borderRadius: 12,
    padding: 1.5, // This creates the border width
    // Single, subtle shadow - no double-shadow look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  eventCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 8, 10, 0.98)', // Almost solid dark - gradient reads as "ring" around it
    borderRadius: 10.5, // Slightly smaller to account for border
    padding: 10,
    borderWidth: 0, // The gradient is the border
    shadowOpacity: 0, // No shadow on inner - shadow is on outer gradient only
    elevation: 0,
  },
  eventCardInnerGame: {
    // Same as base - both game and non-game use the same inner styling
  },
  eventBadgeContainer: {
    marginRight: 10,
    // Badge shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  eventTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Inner glow effect
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventTypeBadgeText: {
    color: COLORS.WHITE,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
  },
  eventCardContent: {
    flex: 1,
    paddingRight: 6,
  },
  eventCardTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.WHITE,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  eventCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  eventCardTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_SECONDARY,
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  eventCardSeparator: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
    marginHorizontal: 6,
    fontSize: scaleFont(FONT_SIZES.XS),
  },
  eventCardLocation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_SECONDARY,
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  eventCardNotes: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
    fontSize: scaleFont(FONT_SIZES.XS),
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  chevronContainer: {
    paddingLeft: 4,
  },
  emptyState: {
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyStateTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.WHITE,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.BOLD,
    marginTop: 16,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_TERTIARY,
    fontSize: scaleFont(FONT_SIZES.SM),
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    // Enhanced shadow
    shadowColor: COLORS.BACKGROUND_SECONDARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  addEventButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.WHITE,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
});

export default EventsList;

