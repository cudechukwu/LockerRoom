import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ActionCard = ({ 
  action, 
  onPress, 
  style,
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const [scaleValue] = useState(new Animated.Value(1));

  const getCardDimensions = () => {
    const screenWidth = width;
    const cardSpacing = 16; // 16px gap between cards
    const screenPadding = 40; // 20px padding on each side
    const availableWidth = screenWidth - screenPadding - cardSpacing;
    const cardWidth = availableWidth / 2; // Two cards per row
    
    switch (size) {
      case 'small':
        return { width: 120, height: 80 };
      case 'large':
        return { 
          width: cardWidth, 
          height: cardWidth * 0.8 // 4:5 aspect ratio
        };
      default: // medium
        return { width: isTablet ? 160 : 140, height: isTablet ? 120 : 100 };
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const dimensions = getCardDimensions();

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleValue }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            width: dimensions.width,
            height: dimensions.height,
          },
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconBackground, { backgroundColor: `${action.color}15` }]}>
            <Ionicons
              name={action.icon}
              size={size === 'small' ? 20 : size === 'large' ? 32 : 24}
              color={action.color}
            />
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>
            {action.title}
          </Text>
          
          {size !== 'small' && (
            <Text style={styles.subtitle}>
              {action.subtitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.BACKGROUND_CARD, // Match other screens' card colors
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 2,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    // No border for clean look
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.feedName,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 22,
  },
  subtitle: {
    ...TYPOGRAPHY.eventTime,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
});

export default ActionCard;
