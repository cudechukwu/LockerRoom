import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

/**
 * Attendance Settings Section
 * Two subsections:
 * 1. Attendance Requirement (radio buttons)
 * 2. Attendance Method (checkboxes)
 */
const AttendanceSettingsSection = ({ 
  attendanceRequirement,
  onRequirementChange,
  checkInMethods,
  onMethodsChange,
  teamColors 
}) => {
  const requirementOptions = [
    { value: 'required', label: 'Required' },
    { value: 'coaches_only', label: 'Coaches only' },
    { value: 'players_only', label: 'Players only' },
  ];

  const methodOptions = [
    { value: 'qr_code', label: 'QR check in' },
    { value: 'location', label: 'Location check in' },
    { value: 'manual', label: 'Manual (coaches only)' },
  ];

  const toggleMethod = (method) => {
    if (checkInMethods.includes(method)) {
      onMethodsChange(checkInMethods.filter(m => m !== method));
    } else {
      onMethodsChange([...checkInMethods, method]);
    }
  };

  return (
    <View style={styles.container}>
        {/* Attendance Requirement */}
        <View style={styles.subsection}>
          <View style={styles.radioGroup}>
            {requirementOptions.map((option) => {
              const isSelected = attendanceRequirement === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() => onRequirementChange(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioButton}>
                    {isSelected && (
                      <View style={[
                        styles.radioSelected,
                        { backgroundColor: COLORS.ICON_BACKGROUND_HOME }
                      ]} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Attendance Method */}
        <View style={styles.subsection}>
          <View style={styles.checkboxGroup}>
            {methodOptions.map((option) => {
              const isSelected = checkInMethods.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.checkboxOption}
                  onPress={() => toggleMethod(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    isSelected && {
                      backgroundColor: COLORS.ICON_BACKGROUND_HOME,
                      borderColor: COLORS.ICON_BACKGROUND_HOME,
                    },
                  ]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={COLORS.WHITE} />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  subsection: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 16,
  },
  radioGroup: {
    // Spacing handled by marginBottom on radioOption
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.TEXT_TERTIARY,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
  },
  checkboxGroup: {
    // Spacing handled by marginBottom on checkboxOption
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.TEXT_TERTIARY,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxLabel: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
  },
});

export default AttendanceSettingsSection;


