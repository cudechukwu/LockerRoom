import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';

/**
 * GradientCard Component
 * Wraps content with a gradient border effect matching EventsList style
 */
const GradientCard = ({ children, style }) => {
  // Non-game gradient colors - shiny white-grey on both sides
  // White-grey gradient fading from both edges to transparent in the middle
  const gradientColors = [
    'rgba(255, 255, 255, 0.25)', // left edge, shiny white-grey
    'rgba(200, 200, 200, 0.15)', // mid-left, lighter grey
    'rgba(0, 0, 0, 0.0)',        // transparent in the middle
    'rgba(200, 200, 200, 0.15)', // mid-right, lighter grey
    'rgba(255, 255, 255, 0.25)', // right edge, shiny white-grey
  ];

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.3, 0.5, 0.7, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.gradientBorder, style]}
    >
      <View style={styles.inner}>
        {children}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: 16,
    padding: 1, // Thinner border width
    marginHorizontal: 20,
    marginBottom: 20,
    // Single, subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  inner: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY, // Match background card color
    borderRadius: 15.2, // Slightly smaller to account for border (16 - 0.8)
    padding: 20,
    borderWidth: 0, // The gradient is the border
    shadowOpacity: 0, // No shadow on inner - shadow is on outer gradient only
    elevation: 0,
  },
});

export default GradientCard;

