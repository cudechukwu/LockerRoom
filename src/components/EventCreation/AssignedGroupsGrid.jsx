import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

/**
 * Assigned Groups Grid
 * List-based design for selecting groups (similar to recurring dropdown)
 * Only shown when "Specific group(s)" is selected
 */
const AssignedGroupsGrid = memo(({ 
  selectedGroups = [], 
  availableGroups = [],
  onToggleGroup,
  teamColors 
}) => {
  if (availableGroups.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={24} color={COLORS.TEXT_TERTIARY} />
          <Text style={styles.emptyStateText}>
            No groups available.{'\n'}
            Create groups in Attendance Groups.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assigned Groups</Text>
        <Text style={styles.headerCount}>
          {selectedGroups.length} {selectedGroups.length === 1 ? 'selected' : 'selected'}
        </Text>
      </View>
      <View style={styles.groupsList}>
        {availableGroups.map((group, index) => {
          const isSelected = selectedGroups.includes(group.id);
          return (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupOption,
                isSelected && styles.groupOptionSelected,
                index === availableGroups.length - 1 && styles.groupOptionLast,
              ]}
              onPress={() => onToggleGroup(group.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.groupOptionText,
                isSelected && styles.groupOptionTextSelected
              ]}>
                {group.name}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={20} color={COLORS.TEXT_PRIMARY} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  headerCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
  },
  groupsList: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  groupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupOptionSelected: {
    backgroundColor: COLORS.BACKGROUND_CARD,
  },
  groupOptionLast: {
    borderBottomWidth: 0,
  },
  groupOptionText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
  },
  groupOptionTextSelected: {
    fontWeight: FONT_WEIGHTS.MEDIUM,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
    marginTop: 8,
  },
});

AssignedGroupsGrid.displayName = 'AssignedGroupsGrid';

export default AssignedGroupsGrid;


