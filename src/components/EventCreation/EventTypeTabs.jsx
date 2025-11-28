import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

/**
 * Event Type Tabs
 * Horizontal scrollable tabs for event type selection
 */
const EventTypeTabs = ({ selectedType, onTypeChange, teamColors }) => {
  const eventTypes = [
    { id: 'practice', title: 'Practice' },
    { id: 'game', title: 'Game' },
    { id: 'film', title: 'Film' },
    { id: 'workout', title: 'Workout' },
    { id: 'meeting', title: 'Meeting' },
    { id: 'travel', title: 'Travel' },
    { id: 'therapy', title: 'Therapy' },
    { id: 'other', title: 'Other' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {eventTypes.map((type, index) => {
          const isSelected = selectedType === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.tab,
                index > 0 && styles.tabSpacing,
                isSelected && styles.tabSelected,
              ]}
              onPress={() => onTypeChange(type.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isSelected && styles.tabTextSelected,
                ]}
              >
                {type.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  scrollContent: {
    paddingRight: 20,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 13,
    backgroundColor: COLORS.BACKGROUND_CARD,
    marginRight: 8,
  },
  tabSpacing: {
    // Spacing handled by marginRight above
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  tabSelected: {
    backgroundColor: COLORS.ICON_BACKGROUND_HOME,
  },
  tabTextSelected: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
});

export default EventTypeTabs;




