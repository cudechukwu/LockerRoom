import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  LinearGradient,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';
import ScreenBackground from '../components/ScreenBackground';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ProfilePlaygroundScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedProfile, setSelectedProfile] = useState('player');

  // Mock data for players
  const mockPlayerData = {
    user_profiles: {
      display_name: 'Chukwudi Udechukwu',
      avatar_url: Image.resolveAssetSource(require('../../assets/chukwudi.jpg')).uri,
      bio: 'Dedicated quarterback with 3 years of experience leading the team to victory.',
    },
    team_members: {
      role: 'player',
      is_admin: false,
    },
    jersey_number: 94,
    position: 'Defensive Line',
    class_year: 'Junior',
    height_cm: 190,
    weight_kg: 101,
    hometown: 'Abuja',
    high_school: 'Milton High School',
    major: 'Computer Science',
    nickname: 'Chuck',
    max_bench: '500 lbs',
    favorite_nfl_team: '49ers',
    career_goals: 'Software Engineer',
    is_complete: true,
  };

  // Mock data for staff
  const mockStaffData = {
    user_profiles: {
      display_name: 'Quentin Jones',
      avatar_url: Image.resolveAssetSource(require('../../assets/coach_quentin.jpg')).uri,
      bio: 'Head Coach with 15 years of experience in college football.',
    },
    team_members: {
      role: 'coach',
      is_admin: false,
    },
    staff_title: 'Defensive Line Coordinator',
    department: 'Football',
    years_experience: 15,
    certifications: ['NFL Coaching License', 'CPR Certified'],
    specialties: ['Block Destruction', 'Player Development'],
    is_complete: true,
  };

  const renderPlayerProfile = () => (
    <View style={styles.profileContainer}>
      {/* Hero Section with Background */}
      <View style={styles.heroSection}>
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <Text style={styles.backgroundNumber}>15</Text>
        </View>
        
        {/* Player Image */}
        <View style={styles.playerImageContainer}>
          <Image
            source={{ uri: mockPlayerData.user_profiles.avatar_url }}
            style={styles.playerImage}
            resizeMode="cover"
          />
        </View>

        {/* Player Info */}
        <View style={styles.playerInfoSection}>
          <Text style={styles.playerName}>{mockPlayerData.user_profiles.display_name}</Text>
          <Text style={styles.playerTitle}>#{mockPlayerData.jersey_number} • {mockPlayerData.position}</Text>
          <Text style={styles.playerDepartment}>{mockPlayerData.class_year} • {mockPlayerData.major}</Text>
          
          <View style={styles.playerStats}>
            <View style={styles.playerStatCard}>
              <Text style={styles.playerStatValue}>{Math.floor(mockPlayerData.height_cm / 30.48)}'{Math.floor((mockPlayerData.height_cm % 30.48) / 2.54)}"</Text>
              <Text style={styles.playerStatLabel}>Height</Text>
            </View>
            <View style={styles.playerStatCard}>
              <Text style={styles.playerStatValue}>{Math.round(mockPlayerData.weight_kg * 2.205)}</Text>
              <Text style={styles.playerStatLabel}>Weight (lbs)</Text>
            </View>
            <View style={styles.playerStatCard}>
              <Text style={styles.playerStatValue}>{mockPlayerData.hometown}</Text>
              <Text style={styles.playerStatLabel}>Hometown</Text>
            </View>
          </View>
        </View>
      </View>

        {/* News Section */}
        <View style={styles.newsSection}>
          <Text style={styles.newsSectionTitle}>Football News</Text>
          <ScrollView 
            style={styles.newsScrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.newsItem}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsCategory}>Team News</Text>
                <Ionicons name="share-outline" size={16} color="#9CA3AF" />
              </View>
              <View style={styles.newsContent}>
                <View style={styles.newsAvatar} />
                <Text style={styles.newsText}>Wesleyan Cardinals, {mockPlayerData.user_profiles.display_name}</Text>
              </View>
              <Text style={styles.newsDate}>22 Oct</Text>
              <Text style={styles.newsHeadline}>{mockPlayerData.user_profiles.display_name} leads team to victory with 3 touchdowns</Text>
            </View>
            
            <View style={styles.newsItem}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsCategory}>NESCAC</Text>
                <Ionicons name="share-outline" size={16} color="#9CA3AF" />
              </View>
              <View style={styles.newsContent}>
                <View style={styles.newsAvatar} />
                <Text style={styles.newsText}>NESCAC Football, Week 8</Text>
              </View>
              <Text style={styles.newsDate}>21 Oct</Text>
              <Text style={styles.newsHeadline}>Cardinals defense dominates in 28-14 win over Amherst</Text>
            </View>
            
            <View style={styles.newsItem}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsCategory}>Player Stats</Text>
                <Ionicons name="share-outline" size={16} color="#9CA3AF" />
              </View>
              <View style={styles.newsContent}>
                <View style={styles.newsAvatar} />
                <Text style={styles.newsText}>Defensive Line, Udechukwu</Text>
              </View>
              <Text style={styles.newsDate}>20 Oct</Text>
              <Text style={styles.newsHeadline}>Udechukwu records 2 sacks in defensive showcase</Text>
            </View>
            
            <View style={styles.newsItem}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsCategory}>Upcoming</Text>
                <Ionicons name="share-outline" size={16} color="#9CA3AF" />
              </View>
              <View style={styles.newsContent}>
                <View style={styles.newsAvatar} />
                <Text style={styles.newsText}>Next Game, Middlebury</Text>
              </View>
              <Text style={styles.newsDate}>13 Sept</Text>
              <Text style={styles.newsHeadline}>Cardinals prepare for crucial matchup against Middlebury</Text>
            </View>
            
            <View style={styles.newsItem}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsCategory}>Recruiting</Text>
                <Ionicons name="share-outline" size={16} color="#9CA3AF" />
              </View>
              <View style={styles.newsContent}>
                <View style={styles.newsAvatar} />
                <Text style={styles.newsText}>Wesleyan Football</Text>
              </View>
              <Text style={styles.newsDate}>18 Oct</Text>
              <Text style={styles.newsHeadline}>Top recruits visit campus for game day experience</Text>
            </View>
          </ScrollView>
        </View>

      {/* About Section */}
      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>About</Text>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Nickname</Text>
          <Text style={styles.aboutValue}>{mockPlayerData.nickname}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Position</Text>
          <Text style={styles.aboutValue}>{mockPlayerData.position}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Year</Text>
          <Text style={styles.aboutValue}>{mockPlayerData.class_year}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Major</Text>
          <Text style={styles.aboutValue}>{mockPlayerData.major}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Max Bench Press</Text>
          <Text style={styles.aboutValue}>{mockPlayerData.max_bench}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Favorite NFL Team</Text>
          <Text style={styles.aboutValue}>{mockPlayerData.favorite_nfl_team}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Career Goals</Text>
          <Text style={styles.aboutValue}>{mockPlayerData.career_goals}</Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={20} color="#6B7280" />
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="server-outline" size={20} color="#6B7280" />
            <Text style={styles.settingLabel}>Storage & Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="create-outline" size={20} color="#6B7280" />
            <Text style={styles.settingLabel}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, styles.signOutItem]}>
          <View style={styles.settingLeft}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.settingLabel, styles.signOutText]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStaffProfile = () => (
    <View style={styles.profileContainer}>
      {/* Staff Hero Section */}
      <View style={styles.staffHeroSection}>
        {/* Background Pattern */}
        <View style={styles.backgroundPattern}>
          <Text style={styles.backgroundNumber}>HC</Text>
        </View>
        
        {/* Staff Image */}
        <View style={styles.staffImageContainer}>
          <Image
            source={{ uri: mockStaffData.user_profiles.avatar_url }}
            style={styles.staffImage}
            resizeMode="cover"
          />
        </View>

        {/* Staff Info */}
        <View style={styles.staffInfoSection}>
          <Text style={styles.staffName}>{mockStaffData.user_profiles.display_name}</Text>
          <Text style={styles.staffTitle}>{mockStaffData.staff_title}</Text>
          <Text style={styles.staffDepartment}>{mockStaffData.department}</Text>
          
          <View style={styles.staffStats}>
            <View style={styles.staffStatCard}>
              <Text style={styles.staffStatValue}>{mockStaffData.years_experience}</Text>
              <Text style={styles.staffStatLabel}>Years Exp</Text>
            </View>
            <View style={styles.staffStatCard}>
              <Text style={styles.staffStatValue}>{mockStaffData.certifications.length}</Text>
              <Text style={styles.staffStatLabel}>Certs</Text>
            </View>
            <View style={styles.staffStatCard}>
              <Text style={styles.staffStatValue}>{mockStaffData.specialties.length}</Text>
              <Text style={styles.staffStatLabel}>Specialties</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Staff About Section */}
      <View style={styles.aboutSection}>
        <Text style={styles.aboutTitle}>About</Text>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Full name</Text>
          <Text style={styles.aboutValue}>{mockStaffData.user_profiles.display_name}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Title</Text>
          <Text style={styles.aboutValue}>{mockStaffData.staff_title}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Department</Text>
          <Text style={styles.aboutValue}>{mockStaffData.department}</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Experience</Text>
          <Text style={styles.aboutValue}>{mockStaffData.years_experience} years</Text>
        </View>
        <View style={styles.aboutField}>
          <Text style={styles.aboutLabel}>Specialties</Text>
          <Text style={styles.aboutValue}>{mockStaffData.specialties.join(', ')}</Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={20} color="#6B7280" />
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="server-outline" size={20} color="#6B7280" />
            <Text style={styles.settingLabel}>Storage & Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="create-outline" size={20} color="#6B7280" />
            <Text style={styles.settingLabel}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, styles.signOutItem]}>
          <View style={styles.settingLeft}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[styles.settingLabel, styles.signOutText]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header matching HomeScreen */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('../../assets/cardinal.png')} 
              style={styles.teamLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.profileSwitcherButton, selectedProfile === 'player' && styles.profileSwitcherButtonActive]}
              onPress={() => setSelectedProfile('player')}
            >
              <Text style={[styles.profileSwitcherText, selectedProfile === 'player' && styles.profileSwitcherTextActive]}>
                P
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.profileSwitcherButton, selectedProfile === 'staff' && styles.profileSwitcherButtonActive]}
              onPress={() => setSelectedProfile('staff')}
            >
              <Text style={[styles.profileSwitcherText, selectedProfile === 'staff' && styles.profileSwitcherTextActive]}>
                S
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Design Area */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {selectedProfile === 'player' ? renderPlayerProfile() : renderStaffProfile()}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  teamLogo: {
    width: 32,
    height: 32,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  profileSwitcherButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  profileSwitcherButtonActive: {
    backgroundColor: COLORS.PRIMARY_BLACK,
  },
  profileSwitcherText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('BOLD'),
    color: '#6B7280',
  },
  profileSwitcherTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 75,
  },
  profileContainer: {
    flex: 1,
  },
  
  // Player Profile Styles
  heroSection: {
    backgroundColor: 'rgba(248, 248, 248, 0.8)',
    padding: 20,
    margin: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundNumber: {
    fontSize: 200,
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    opacity: 0.1,
  },
  playerImageContainer: {
    marginRight: 20,
  },
  playerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  playerInfoSection: {
    flex: 1,
  },
  playerName: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginBottom: 8,
  },
  playerTitle: {
    fontSize: 14,
    fontWeight: getFontWeight('MEDIUM'),
    color: '#F59E0B',
    marginBottom: 4,
  },
  playerDepartment: {
    fontSize: getFontSize('XS'),
    color: '#6B7280',
    marginBottom: 20,
  },
  playerStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  playerStatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    minWidth: 50,
    maxWidth: 70,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  playerStatValue: {
    color: COLORS.PRIMARY_BLACK,
    fontSize: 11,
    fontWeight: getFontWeight('BOLD'),
    marginBottom: 1,
    textAlign: 'center',
  },
  playerStatLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: getFontWeight('MEDIUM'),
    textAlign: 'center',
  },
  
  // News Section
  newsSection: {
    backgroundColor: 'rgba(248, 248, 248, 0.8)',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  newsSectionTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginBottom: 15,
  },
  newsScrollView: {
    maxHeight: 120,
  },
  newsItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(200, 200, 200, 0.3)',
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsCategory: {
    color: '#6B7280',
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  newsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },
  newsText: {
    color: '#3A3A3E',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  newsDate: {
    color: '#6B7280',
    fontSize: getFontSize('XS'),
    marginBottom: 4,
  },
  newsHeadline: {
    color: '#3A3A3E',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  
  // About Section
  aboutSection: {
    backgroundColor: 'rgba(248, 248, 248, 0.8)',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutTitle: {
    color: '#3A3A3E',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    marginBottom: 15,
  },
  aboutField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(200, 200, 200, 0.3)',
  },
  aboutLabel: {
    color: '#6B7280',
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  aboutValue: {
    color: '#3A3A3E',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  
  // Staff Profile Styles
  staffHeroSection: {
    backgroundColor: 'rgba(248, 248, 248, 0.8)',
    padding: 20,
    margin: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  staffImageContainer: {
    marginRight: 20,
  },
  staffImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  staffInfoSection: {
    flex: 1,
  },
  staffName: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginBottom: 8,
  },
  staffTitle: {
    fontSize: 14,
    fontWeight: getFontWeight('MEDIUM'),
    color: '#F59E0B',
    marginBottom: 4,
  },
  staffDepartment: {
    fontSize: getFontSize('XS'),
    color: '#6B7280',
    marginBottom: 20,
  },
  staffStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  staffStatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    minWidth: 50,
    maxWidth: 70,
    borderWidth: 0.5,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  staffStatValue: {
    color: COLORS.PRIMARY_BLACK,
    fontSize: 11,
    fontWeight: getFontWeight('BOLD'),
    marginBottom: 1,
    textAlign: 'center',
  },
  staffStatLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: getFontWeight('MEDIUM'),
    textAlign: 'center',
  },
  
  // Settings Section
  settingsSection: {
    backgroundColor: 'rgba(248, 248, 248, 0.8)',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsTitle: {
    color: '#3A3A3E',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(200, 200, 200, 0.3)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    color: '#3A3A3E',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    marginLeft: 12,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#EF4444',
  },
});

export default ProfilePlaygroundScreen;
``