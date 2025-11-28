import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';

/**
 * SaveButton Component
 * Isolated save button with loading state to prevent unnecessary re-renders
 */
const SaveButton = memo(({ 
  onPress, 
  isSubmitting = false, 
  isUploadingAttachments = false 
}) => {
  const isDisabled = isSubmitting || isUploadingAttachments;
  const isLoading = isSubmitting || isUploadingAttachments;

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={styles.button}
      activeOpacity={0.7}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
      ) : (
        <Text style={styles.buttonText}>Save</Text>
      )}
    </TouchableOpacity>
  );
});

SaveButton.displayName = 'SaveButton';

const styles = StyleSheet.create({
  button: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
});

export default SaveButton;

