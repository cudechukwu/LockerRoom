import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const MainScreen = ({ navigation }) => {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigation.navigate('VideoCover');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LockerRoom</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Text style={styles.appName}>LockerRoom</Text>
          <Text style={styles.tagline}>Where teams connect</Text>
        </View>

        <View style={styles.dashboardSection}>
          <Text style={styles.dashboardTitle}>Team Dashboard</Text>
          <Text style={styles.dashboardSubtitle}>
            Welcome! Your team has been created successfully.
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Team</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Member</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Invites</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Manage Team</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY, // Grey background like HomeScreen
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 16,
    // Removed border for cleaner look
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.TEXT_PRIMARY,
  },
  signOutButton: {
    backgroundColor: COLORS.BACKGROUND_SURFACE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : 20,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: isTablet ? 40 : 30,
    marginBottom: isTablet ? 60 : 40,
  },
  appName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: 2.0,
    marginBottom: 16,
  },
  tagline: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  dashboardSection: {
    flex: 1,
    alignItems: 'center',
  },
  dashboardTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  dashboardSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryButton: {
    backgroundColor: COLORS.BACKGROUND_SURFACE,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.TEXT_PRIMARY,
  },
});

export default MainScreen;
