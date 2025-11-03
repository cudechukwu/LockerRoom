import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, Animated } from 'react-native';
import { Video } from 'expo-av';
import { COLORS } from '../constants/colors';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';

const { width, height } = Dimensions.get('window');

// Responsive scaling based on screen size
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

const VideoCoverScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation when component mounts
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500, // Smooth 500ms fade in
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Video Background */}
      <Video
        source={require('../../assets/SignUpCover.mp4')}
        style={styles.video}
        shouldPlay
        isLooping
        isMuted
        resizeMode="cover"
      />
      
      {/* Dark overlay for Uber aesthetic */}
      <View style={styles.overlay} />
      
      {/* Centered Brand Section (like Uber logo) */}
      <View style={styles.brandSection}>
        <Text style={styles.appName}>LockerRoom</Text>
        <Text style={styles.tagline}>Where teams connect</Text>
      </View>
      
      {/* Action Section (like Uber's login fields) */}
      <View style={styles.actionSection}>
        {/* Primary Button - Greyish to match splash screen vibe */}
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => navigation.navigate('CreateAccount')}
        >
          <Text style={styles.primaryButtonText}>Let's Get Started</Text>
        </TouchableOpacity>
        
        {/* Secondary Button - Clean white style */}
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
        
        {/* Legal Text - Subtle and minimal */}
        <Text style={styles.legalText}>
          Your data is secure. By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_BLACK, // Same background as splash for seamless transition
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darker overlay for Uber aesthetic
  },
  brandSection: {
    position: 'absolute',
    top: '25%', // Moved up from 35% to reduce top space
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  appName: {
    fontSize: getFontSize(isLargeTablet ? '5XL' : isTablet ? '4XL' : '3XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.WHITE, // Pure white like Uber
    letterSpacing: 2.0,
    marginBottom: isTablet ? 16 : 12,
    fontFamily: 'Georgia', // Use Georgia for better font support
    textTransform: 'none',
    fontStyle: 'normal',
    // Uber-style clean shadow
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontSize: getFontSize(isLargeTablet ? '2XL' : isTablet ? 'XL' : 'BASE'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.TEXT_SECONDARY, // Subtle secondary color
    letterSpacing: 0.3,
    fontFamily: 'Georgia', // Use Georgia which supports italic
    fontStyle: 'italic', // Make tagline italic
  },
  actionSection: {
    position: 'absolute',
    top: '60%', // Below the brand section
    left: 48, // Increased from 24 for less width
    right: 48, // Increased from 24 for less width
    alignItems: 'center',
    zIndex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.LIGHT_GRAY, // Instagram-inspired off-white
    borderRadius: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 20 : 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: isTablet ? 16 : 12, // Reduced from 24:20 to 16:12
    width: '100%',
    // Instagram-style subtle shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.PRIMARY_BLACK, // Dark text on light background
    fontSize: getFontSize(isLargeTablet ? 'XL' : isTablet ? 'LG' : 'BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    letterSpacing: 0.5,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
  secondaryButton: {
    backgroundColor: 'transparent', // Clean transparent background
    borderRadius: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 20 : 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: isTablet ? 32 : 24,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.WHITE, // Clean white border like Uber
  },
  secondaryButtonText: {
    color: COLORS.WHITE,
    fontSize: getFontSize(isLargeTablet ? 'LG' : isTablet ? 'BASE' : 'SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    letterSpacing: 0.3,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
  legalText: {
    fontSize: getFontSize(isTablet ? 'SM' : 'XS'),
    color: COLORS.TEXT_SECONDARY, // Subtle color
    textAlign: 'center',
    lineHeight: isTablet ? 20 : 18,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    opacity: 0.8, // Subtle opacity like Uber
  },
  link: {
    textDecorationLine: 'underline',
    color: COLORS.WHITE,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
});

export default VideoCoverScreen;
