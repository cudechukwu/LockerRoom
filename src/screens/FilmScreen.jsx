import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import ScreenBackground from '../components/ScreenBackground';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const FilmScreen = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 60;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 10, 0);
  
  return (
    <ScreenBackground>
      <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Film</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.placeholderSection}>
            <Text style={styles.placeholderTitle}>🎥 Game Film & Feedback</Text>
            <Text style={styles.placeholderSubtitle}>
              Review game footage and receive coaching feedback
            </Text>
            
            <View style={styles.filmList}>
              <View style={styles.filmItem}>
                <View style={styles.filmThumbnail}>
                  <Text style={styles.filmIcon}>📹</Text>
                </View>
                <View style={styles.filmInfo}>
                  <Text style={styles.filmTitle}>Last Game vs Rivals</Text>
                  <Text style={styles.filmDate}>Oct 15, 2024</Text>
                  <Text style={styles.filmDuration}>2h 15m</Text>
                </View>
              </View>
              
              <View style={styles.filmItem}>
                <View style={styles.filmThumbnail}>
                  <Text style={styles.filmIcon}>🎬</Text>
                </View>
                <View style={styles.filmInfo}>
                  <Text style={styles.filmTitle}>Practice Highlights</Text>
                  <Text style={styles.filmDate}>Oct 12, 2024</Text>
                  <Text style={styles.filmDuration}>45m</Text>
                </View>
              </View>
              
              <View style={styles.filmItem}>
                <View style={styles.filmThumbnail}>
                  <Text style={styles.filmIcon}>📊</Text>
                </View>
                <View style={styles.filmInfo}>
                  <Text style={styles.filmTitle}>Performance Analysis</Text>
                  <Text style={styles.filmDate}>Oct 10, 2024</Text>
                  <Text style={styles.filmDuration}>30m</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: getFontSize(isTablet ? 'LG' : 'BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  content: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : 20,
    paddingTop: 20,
  },
  placeholderSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: getFontSize(isTablet ? '2XL' : 'XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 16,
  },
  placeholderSubtitle: {
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  filmList: {
    width: '100%',
    maxWidth: 400,
  },
  filmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6', // Uber-style soft light gray
    padding: 16,
    borderRadius: 12,
    marginBottom: 16, // Uber-style spacing
  },
  filmThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E5E5', // Uber-style thumbnail gray
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  filmIcon: {
    fontSize: 24,
  },
  filmInfo: {
    flex: 1,
  },
  filmTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#F9F9F9',
    marginBottom: 4,
  },
  filmDate: {
    fontSize: getFontSize('SM'),
    color: '#F5F5F5',
    marginBottom: 2,
  },
  filmDuration: {
    fontSize: getFontSize('SM'),
    color: '#F5F5F5',
  },
});

export default FilmScreen;
