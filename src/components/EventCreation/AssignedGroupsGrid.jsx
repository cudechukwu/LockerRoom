import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

/**
 * Assigned Groups Grid
 * Visual grid of checkboxes for selecting groups
 * Only shown when "Specific group(s)" is selected
 */
const AssignedGroupsGrid = ({ 
  selectedGroups = [], 
  availableGroups = [],
  onToggleGroup,
  teamColors 
}) => {
  if (availableGroups.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Assigned Groups</Text>
          <Text style={styles.headerCount}>0 selected</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color={COLORS.TEXT_TERTIARY} />
          <Text style={styles.emptyStateText}>
            No groups available.{'\n'}
            Create groups in Attendance Groups.
          </Text>
        </View>
      </View>
    );
  }

  const numColumns = 3; // 3 columns on most screens, adjust for smaller screens if needed

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assigned Groups</Text>
        <Text style={styles.headerCount}>
          {selectedGroups.length} {selectedGroups.length === 1 ? 'selected' : 'selected'}
        </Text>
      </View>

      <View style={styles.grid}>
        {availableGroups.map((group, index) => {
          const isSelected = selectedGroups.includes(group.id);
          const row = Math.floor(index / 3);
          const col = index % 3;
          return (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupCard,
                col > 0 && styles.groupCardSpacing,
                row > 0 && styles.groupCardTopSpacing,
                isSelected && {
                  backgroundColor: COLORS.ICON_BACKGROUND_HOME,
                  borderColor: COLORS.ICON_BACKGROUND_HOME,
                },
              ]}
              onPress={() => onToggleGroup(group.id)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxContainer}>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
                )}
              </View>
              <Text
                style={[
                  styles.groupName,
                  isSelected && styles.groupNameSelected,
                ]}
                numberOfLines={2}
              >
                {group.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    ...TYPOGRAPHY.sectionTitle,
  },
  headerCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  groupCard: {
    width: '31%', // 3 columns with spacing
    aspectRatio: 1.2,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCardSpacing: {
    marginLeft: '3.5%', // Space between columns
  },
  groupCardTopSpacing: {
    marginTop: 8, // Space between rows
  },
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.TEXT_TERTIARY,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  groupName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  groupNameSelected: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default AssignedGroupsGrid;


