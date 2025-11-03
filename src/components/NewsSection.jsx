import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

const NewsSection = ({ profile, userRole }) => {
  // Mock news data - will be replaced with real API data later
  const mockNewsData = [
    {
      id: 1,
      category: 'Team News',
      author: 'Wesleyan Cardinals',
      date: '22 Oct',
      headline: `${profile.user_profiles?.display_name || 'Player'} leads team to victory with 3 touchdowns`,
    },
    {
      id: 2,
      category: 'NESCAC',
      author: 'NESCAC Football, Week 8',
      date: '21 Oct',
      headline: 'Cardinals defense dominates in 28-14 win over Amherst',
    },
    {
      id: 3,
      category: 'Player Stats',
      author: userRole === 'player' ? `${profile.position || 'Defensive Line'}, ${profile.user_profiles?.display_name?.split(' ')[1] || 'Player'}` : 'Staff Update',
      date: '20 Oct',
      headline: userRole === 'player' 
        ? `${profile.user_profiles?.display_name?.split(' ')[1] || 'Player'} records 2 sacks in defensive showcase`
        : 'Coaching staff implements new defensive strategy',
    },
    {
      id: 4,
      category: 'Upcoming',
      author: 'Next Game, Middlebury',
      date: '13 Sept',
      headline: 'Cardinals prepare for crucial matchup against Middlebury',
    },
    {
      id: 5,
      category: 'Recruiting',
      author: 'Wesleyan Football',
      date: '18 Oct',
      headline: 'Top recruits visit campus for game day experience',
    },
  ];

  return (
    <View style={styles.newsSection}>
      <Text style={styles.newsSectionTitle}>Football News</Text>
      <ScrollView 
        style={styles.newsScrollView}
        showsVerticalScrollIndicator={false}
      >
        {mockNewsData.map((newsItem) => (
          <View key={newsItem.id} style={styles.newsItem}>
            <View style={styles.newsHeader}>
              <Text style={styles.newsCategory}>{newsItem.category}</Text>
              <Ionicons name="share-outline" size={16} color="#9CA3AF" />
            </View>
            <View style={styles.newsContent}>
              <View style={styles.newsAvatar} />
              <Text style={styles.newsText}>{newsItem.author}</Text>
            </View>
            <Text style={styles.newsDate}>{newsItem.date}</Text>
            <Text style={styles.newsHeadline}>{newsItem.headline}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  newsSection: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY, // Match HomeScreen nextUpCard background
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newsSectionTitle: {
    ...TYPOGRAPHY.eventTitle, // Match HomeScreen card primary text
    marginBottom: 15,
  },
  newsScrollView: {
    maxHeight: 120,
  },
  newsItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsCategory: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
  },
  newsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    marginRight: 10,
  },
  newsText: {
    ...TYPOGRAPHY.feedName, // Smaller than eventTitle (14px vs 16px)
  },
  newsDate: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
    marginBottom: 4,
  },
  newsHeadline: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
  },
});

export default NewsSection;
