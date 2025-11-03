import React from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';

const { width, height } = Dimensions.get('window');

// Responsive scaling based on screen size
const isTablet = width >= 768;
const isLargeTablet = width >= 1024;

const SplashScreen = ({ navigation }) => {
  // Proper splash screen duration
  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('VideoCover');
    }, 800); // 1.5 seconds for proper splash experience

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/LockerRoom.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.appName}>
          LockerRoom
        </Text>
      </View>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_BLACK, // Same background as video screen
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: isTablet ? 32 : 24,
  },
  logo: {
    width: isLargeTablet ? 180 : isTablet ? 150 : 120,
    height: isLargeTablet ? 180 : isTablet ? 150 : 120,
    borderRadius: isLargeTablet ? 18 : isTablet ? 15 : 12,
  },
  appName: {
    fontSize: isLargeTablet ? 48 : isTablet ? 40 : 32,
    fontWeight: getFontWeight('BOLD'), // Using BOLD for serif
    color: COLORS.LIGHT_GRAY,
    letterSpacing: 2.0, // Increased spacing for athletic feel
    fontFamily: 'Georgia', // Use Georgia for better font support
    textTransform: 'none', // Ensure no text transform is applied
    fontStyle: 'normal', // Ensure no italic styling
    // Make it look more distinctive
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
};

export default SplashScreen;
