import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

/**
 * Who Sees This Section
 * Radio button options for audience selection: Team, Specific group(s), Personal
 */
const WhoSeesThisSection = ({ 
  selectedValue, 
  onValueChange, 
  selectedGroups = [],
  availableGroups = [],
  teamColors 
}) => {
  const options = [
    { value: 'team', label: 'Team' },
    { value: 'specificGroups', label: 'Groups' },
    { value: 'personal', label: 'Personal' },
  ];

  const getGroupNames = () => {
    return selectedGroups
      .map(groupId => availableGroups.find(g => g.id === groupId)?.name)
      .filter(Boolean);
  };

  return (
    <View style={styles.container}>
      {/* Standalone Button Options */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedValue === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.standaloneButton,
                index > 0 && styles.standaloneButtonSpacing,
                isSelected && styles.standaloneButtonSelected,
              ]}
              onPress={() => onValueChange(option.value)}
              activeOpacity={0.7}
            >
              {/* Circular Radio Button */}
              <View style={styles.radioButtonContainer}>
                <View style={[
                  styles.radioButton,
                  isSelected && styles.radioButtonSelected,
                ]}>
                </View>
              </View>
              
              {/* Option Label */}
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Helper Text / Selected Groups */}
      {selectedValue === 'personal' && (
        <Text style={styles.helperText}>Only you will see this event</Text>
      )}
      
      {selectedValue === 'specificGroups' && selectedGroups.length > 0 && (
        <View style={styles.selectedGroupsContainer}>
          {getGroupNames().map((groupName, index) => (
            <View key={index} style={[styles.groupChip, index > 0 && styles.groupChipSpacing]}>
              <Text style={styles.groupChipText}>{groupName}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    // No background - buttons are standalone
  },
  standaloneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    flex: 1,
    minHeight: 36,
  },
  standaloneButtonSpacing: {
    marginLeft: 8,
  },
  standaloneButtonSelected: {
    backgroundColor: COLORS.ICON_BACKGROUND_HOME,
    borderColor: COLORS.ICON_BACKGROUND_HOME,
  },
  radioButtonContainer: {
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  optionLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    flexShrink: 1,
    textAlign: 'center',
  },
  optionLabelSelected: {
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.WHITE,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_TERTIARY,
    marginTop: 8,
  },
  selectedGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  groupChip: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 6,
    marginBottom: 6,
  },
  groupChipSpacing: {
    // Spacing handled by marginRight/marginBottom above
  },
  groupChipText: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_SECONDARY,
  },
});

export default WhoSeesThisSection;

