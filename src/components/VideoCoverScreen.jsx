import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, Animated } from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';

const { width, height } = Dimensions.get('window');

// Responsive scaling based on screen size
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedText = Animated.createAnimatedComponent(Text);

const VideoCoverScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headingTranslate = useRef(new Animated.Value(24)).current;
  const headingOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslate = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const gradientPulse = useRef(new Animated.Value(0)).current;
  const primaryScale = useRef(new Animated.Value(1)).current;
  const secondaryScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  const brandTopOffset = useMemo(
    () => insets.top + (isLargeTablet ? 96 : isTablet ? 72 : 56),
    [insets.top]
  );

  useEffect(() => {
    // Entry animations for container, headings, and overlay
    const enterAnimation = Animated.parallel([
    Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headingTranslate, {
        toValue: 0,
        damping: 12,
        mass: 0.8,
        stiffness: 140,
        useNativeDriver: true,
      }),
      Animated.timing(headingOpacity, {
        toValue: 1,
        duration: 450,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.spring(taglineTranslate, {
        toValue: 0,
        delay: 180,
        damping: 14,
        mass: 0.7,
        stiffness: 130,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        delay: 220,
        useNativeDriver: true,
      }),
    ]);

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientPulse, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        }),
        Animated.timing(gradientPulse, {
          toValue: 0,
          duration: 5000,
          useNativeDriver: true,
        }),
      ])
    );

    enterAnimation.start();
    pulseAnimation.start();

    return () => {
      enterAnimation.stop();
      pulseAnimation.stop();
    };
  }, [fadeAnim, gradientPulse, headingOpacity, headingTranslate, taglineOpacity, taglineTranslate]);

  const gradientOpacity = gradientPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.8],
  });

  const handlePressIn = (animation) => {
    Animated.spring(animation, {
      toValue: 0.97,
      useNativeDriver: true,
      damping: 10,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = (animation) => {
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 250,
    }).start();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar style="light" translucent />
      {/* Video Background */}
      <Video
        source={require('../../assets/SignUpCover.mp4')}
        style={styles.video}
        shouldPlay
        isLooping
        isMuted
        resizeMode="cover"
      />
      
      {/* Animated gradient overlay for depth */}
      <AnimatedLinearGradient
        colors={['rgba(0, 0, 0, 0.95)', 'rgba(0, 0, 0, 0.3)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.25, y: 1 }}
        style={[styles.overlay, { opacity: gradientOpacity }]}
      />
      
      {/* Centered Brand Section */}
      <Animated.View
        style={[
          styles.brandSection,
          {
            top: brandTopOffset,
            opacity: headingOpacity,
            transform: [{ translateY: headingTranslate }],
          },
        ]}
      >
        <Text style={styles.appName}>LockerRoom</Text>
        <AnimatedText
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslate }],
            },
          ]}
        >
          Where teams connect
        </AnimatedText>
      </Animated.View>
      
      {/* Action Section */}
      <View
        style={[
          styles.actionSectionWrapper,
          { bottom: insets.bottom + (isTablet ? 72 : 54) },
        ]}
      >
      <View style={styles.actionSection}>
          <AnimatedTouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.primaryButton,
              { transform: [{ scale: primaryScale }] },
            ]}
            onPressIn={() => handlePressIn(primaryScale)}
            onPressOut={() => handlePressOut(primaryScale)}
          onPress={() => navigation.navigate('CreateAccount')}
        >
          <Text style={styles.primaryButtonText}>Let's Get Started</Text>
          </AnimatedTouchableOpacity>

          <AnimatedTouchableOpacity
            activeOpacity={0.92}
            style={[
              styles.secondaryButton,
              { transform: [{ scale: secondaryScale }] },
            ]}
            onPressIn={() => handlePressIn(secondaryScale)}
            onPressOut={() => handlePressOut(secondaryScale)}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
          </AnimatedTouchableOpacity>
        
        <Text style={styles.legalText}>
          Your data is secure. By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
        </View>
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
    borderRadius: 0,
  },
  brandSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: isTablet ? 64 : 32,
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
    color: 'rgba(255, 255, 255, 0.72)', // Subtle secondary color
    letterSpacing: 0.3,
    fontFamily: 'Georgia', // Use Georgia which supports italic
    fontStyle: 'italic', // Make tagline italic
  },
  actionSectionWrapper: {
    position: 'absolute',
    left: isTablet ? 64 : 32,
    right: isTablet ? 64 : 32,
    zIndex: 1,
  },
  actionSection: {
    width: '100%',
    alignItems: 'stretch',
  },
  primaryButton: {
    backgroundColor: COLORS.LIGHT_GRAY, // Instagram-inspired off-white
    borderRadius: isTablet ? 18 : 14,
    paddingVertical: isTablet ? 20 : 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: isTablet ? 14 : 12,
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
    fontWeight: getFontWeight('BOLD'),
    letterSpacing: 0.5,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
  secondaryButton: {
    backgroundColor: 'transparent', // Clean transparent background
    borderRadius: isTablet ? 18 : 14,
    paddingVertical: isTablet ? 20 : 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.WHITE, // Clean white border like Uber
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: isTablet ? 16 : 12,
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
    textAlign: 'center',
    lineHeight: isTablet ? 20 : 18,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: isTablet ? 2 : 1,
  },
  link: {
    textDecorationLine: 'underline',
    color: COLORS.WHITE,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
});

export default VideoCoverScreen;
