import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Easing,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../constants/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { useHomeData } from '../hooks/useHomeData';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useSupabase } from '../providers/SupabaseProvider';
import { getEventsInRange, getEventColor } from '../api/events';
import { EVENT_TYPES } from '../constants/eventTypes';
import { getTodayAnchor, addDays } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

// Countdown Ring Component
const CountdownRing = ({ progress, size = 44, strokeWidth = 3, color = '#CCCCCC', logo = null }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const logoSize = size * 0.65; // Logo is 65% of the ring size
  
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2A2A2A"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Team Logo in center */}
      {logo && (
        <Image 
          source={logo} 
          style={{ 
            width: logoSize, 
            height: logoSize, 
            borderRadius: logoSize / 2,
            backgroundColor: 'transparent'
          }} 
        />
      )}
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const supabase = useSupabase();
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 70 : 60;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 18, 0);
  
  // React Query hooks for instant render
  const { data, isLoading, isFetching, error } = useHomeData();
  const queryClient = useQueryClient();
  
  // Extract data from hook
  const teamId = data?.teamId;
  const teamInfo = data?.teamInfo;
  const notificationCount = data?.notificationCount ?? 0;
  const nextEvent = data?.nextEvent;
  const userName = data?.userName || 'Player';
  const userAvatar = data?.userAvatar;
  
  // Fetch events for next 24 hours to check for games
  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: next24HoursEvents } = useQuery({
    queryKey: ['next24HoursEvents', teamId],
    queryFn: async () => {
      if (!teamId || !supabase) return [];
      const result = await getEventsInRange(supabase, teamId, now, next24Hours);
      return result.data || [];
    },
    enabled: !!teamId && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  // Find the next game in the next 24 hours
  const nextGame = React.useMemo(() => {
    if (!next24HoursEvents) return null;
    const games = next24HoursEvents
      .filter(event => event.event_type === EVENT_TYPES.GAME || event.event_type === 'game')
      .map(event => ({
        id: event.id,
        title: event.title,
        startTime: new Date(event.start_time),
        location: event.location,
        eventType: event.event_type,
        color: event.color || getEventColor(event.event_type, { 
          primary: COLORS.BRAND_ACCENT, 
          secondary: COLORS.PRIMARY_BLACK 
        })
      }))
      .sort((a, b) => a.startTime - b.startTime);
    
    return games.length > 0 ? games[0] : null;
  }, [next24HoursEvents]);
  
  // Countdown timer state
  const [timeUntilGame, setTimeUntilGame] = React.useState(null);
  
  // Update countdown every second
  React.useEffect(() => {
    if (!nextGame) {
      setTimeUntilGame(null);
      return;
    }
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = nextGame.startTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeUntilGame(null);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeUntilGame({ hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [nextGame]);
  
  // Format countdown display as H:MM:SS
  const formatCountdown = () => {
    if (!timeUntilGame) return '';
    const { hours, minutes, seconds } = timeUntilGame;
    // Format as H:MM:SS (e.g., 3:33:12)
    const formattedHours = hours.toString();
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };
  
  // Local state for UI interactions
  const [isGameDay, setIsGameDay] = useState(false); // Mock game day state
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Fallback data
  const fallbackLogo = require('../../assets/cardinal.png');
  const fallbackTeamName = "Wesleyan Cardinals";

  // Handle errors from React Query with debounced alerts
  React.useEffect(() => {
    if (error) {
      console.error('HomeScreen error:', error);
      if (!error._alertShown) {
        const errorMessage = error.message || '';
        if (errorMessage.includes('NO_SESSION') || errorMessage.includes('NO_USER') || errorMessage.includes('Auth session missing')) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please sign in again.',
            [
              {
                text: 'Sign In',
                onPress: () => {
                  // Navigation will be handled by App.js onAuthStateChange
                  supabase.auth.signOut();
                },
              },
            ]
          );
        } else if (errorMessage.includes('NO_TEAM') || errorMessage.includes('INVALID_TEAM_ID')) {
          Alert.alert('Team Error', 'You are not a member of any team. Please contact your administrator.');
        } else {
          Alert.alert('Error', 'Failed to load team data. Please try again.');
        }
        error._alertShown = true; // Prevent repeated alerts
      }
    }
  }, [error]);

  // Manual refresh with haptic feedback using React Query
  const handleManualRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsManualRefreshing(true);
    
    // Refetch queries to ensure spinner stays until data is actually refreshed
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['teamInfo'] }),
      queryClient.refetchQueries({ queryKey: ['notificationSummary'] }),
      queryClient.refetchQueries({ queryKey: ['nextEvent'] }),
      queryClient.refetchQueries({ queryKey: ['profile'] }),
    ]);
    
    setIsManualRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Get personalized greeting based on time of day
  const getPersonalGreeting = () => {
    // Extract only the first name
    const firstName = userName.split(' ')[0];
    const hour = new Date().getHours();
    if (hour < 12) return `Good Morning, ${firstName}`;
    if (hour < 17) return `Good Afternoon, ${firstName}`;
    return `Good Evening, ${firstName}`;
  };

  // Get countdown for event
  const getCountdown = (startTime) => {
    const now = new Date();
    const eventDate = new Date(startTime);
    const diffMs = eventDate - now;
    
    if (diffMs < 0) return null; // Event already passed
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) return null; // More than 24 hours away
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Calculate countdown progress (0 to 1)
  const getCountdownProgress = (startTime) => {
    const now = new Date();
    const eventDate = new Date(startTime);
    const diffMs = eventDate - now;
    
    if (diffMs < 0) return 1; // Event passed
    
    // Calculate progress based on how close we are to the event
    // If event is in 24 hours, progress = 0
    // If event is now, progress = 1
    const hoursUntilEvent = diffMs / (1000 * 60 * 60);
    const progress = Math.max(0, Math.min(1, 1 - (hoursUntilEvent / 24)));
    
    return progress;
  };

  const renderHeader = () => {
    // Get user's profile picture or fallback to default
    const avatarSource = userAvatar 
      ? { uri: `${userAvatar}?t=${Date.now()}` } // Add timestamp to bust cache
      : require('../../assets/chukwudi.jpg'); // Fallback to default avatar
    
    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            key={`avatar-${userAvatar}`} // Force re-render when avatar changes
            source={avatarSource} 
            style={styles.profileAvatar}
            onLoad={() => console.log('✅ HomeScreen avatar loaded:', userAvatar)}
            onError={(error) => console.log('❌ HomeScreen avatar error:', error.nativeEvent?.error)}
          />
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.personalGreeting}>{getPersonalGreeting()}</Text>
        </View>
        
        <View style={styles.headerRight}>
          {teamInfo?.logo_url && (
          <TouchableOpacity 
              style={[styles.switchTeamHeaderButton, styles.switchTeamHeaderButtonLogo]}
              onPress={() => navigation.navigate('TeamPicker')}
          >
              <Image
                source={{ uri: `${teamInfo.logo_url}?v=${teamInfo.updated_at || Date.now()}` }}
                style={styles.switchTeamLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
          {!teamInfo?.logo_url && (
          <TouchableOpacity
            style={styles.switchTeamHeaderButton}
            onPress={() => navigation.navigate('TeamPicker')}
          >
              <Ionicons name="people-outline" size={22} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderNextUpSection = () => {
    const formatEventTime = (startTime) => {
      const now = new Date();
      const eventDate = new Date(startTime);
      const diffInHours = (eventDate - now) / (1000 * 60 * 60);
      
      if (diffInHours < 24 && eventDate.toDateString() === now.toDateString()) {
        return `Today • ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      } else if (diffInHours < 48 && eventDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()) {
        return `Tomorrow • ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      } else {
        return `${eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Up</Text>
        
        {nextEvent ? (
          <TouchableOpacity 
            style={styles.nextUpCardNew}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Schedule');
            }}
            activeOpacity={0.9}
          >
            {/* Left: Countdown Ring */}
            <View style={styles.countdownRingContainer}>
              <CountdownRing 
                progress={getCountdownProgress(nextEvent.startTime)} 
                size={44} 
                color={nextEvent.color}
                logo={teamInfo?.logo_url ? { uri: teamInfo.logo_url } : require('../../assets/cardinal.png')}
              />
            </View>
            
            {/* Middle: Event Info */}
            <View style={styles.eventInfoNew}>
              <Text style={styles.eventTitleNew}>{nextEvent.title}</Text>
              <Text style={styles.eventTimeNew}>{formatEventTime(nextEvent.startTime)}</Text>
            </View>
            
            {/* Right: Chevron */}
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.nextUpCardNew}
            onPress={() => navigation.navigate('Schedule')}
            activeOpacity={0.7}
          >
            <View style={styles.eventInfoNew}>
              <Text style={styles.eventTitleNew}>No upcoming events</Text>
              <Text style={styles.eventTimeNew}>Check back later for updates</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        )}
        
        {/* Game Mode Tag - Show if game in next 24 hours */}
        {nextGame && (
          <TouchableOpacity 
            style={styles.gameModeTag}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsGameDay(!isGameDay);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={14} color="#FF3333" />
            <Text style={styles.gameModeText}>Game Mode</Text>
            {timeUntilGame && (
              <Text style={styles.gameModeCountdown}>{formatCountdown()}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTeamInsightsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Team Insights</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsScrollContent}>
        {/* Sacks Card */}
        <TouchableOpacity style={styles.insightCard} activeOpacity={0.7}>
          <View style={styles.insightIconContainer}>
            <Ionicons name="shield" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightLabel}>Sacks</Text>
            <Text style={styles.insightValue}>12</Text>
            <Text style={styles.insightSubtext}>This Season</Text>
          </View>
        </TouchableOpacity>
        
        {/* Rushing Yards Card */}
        <TouchableOpacity style={styles.insightCard} activeOpacity={0.7}>
          <View style={styles.insightIconContainer}>
            <Ionicons name="flash" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightLabel}>Rush Yds</Text>
            <Text style={styles.insightValue}>1,847</Text>
            <Text style={styles.insightSubtext}>Team Total</Text>
          </View>
        </TouchableOpacity>
        
        {/* Touchdowns Card */}
        <TouchableOpacity style={styles.insightCard} activeOpacity={0.7}>
          <View style={styles.insightIconContainer}>
            <Ionicons name="trophy" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightLabel}>Touchdowns</Text>
            <Text style={styles.insightValue}>28</Text>
            <Text style={styles.insightSubtext}>Season Total</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderCalendarSnapshot = () => {
    // Mock week data with different event types
    const weekData = [
      { day: 'Mon', events: [] },
      { day: 'Tue', events: [{ type: 'practice', color: '#7E1A21', letter: 'P' }] },
      { day: 'Wed', events: [{ type: 'game', color: '#000000', letter: 'G' }] },
      { day: 'Thu', events: [{ type: 'training', color: '#666666', letter: 'L' }] },
      { day: 'Fri', events: [{ type: 'practice', color: '#7E1A21', letter: 'P' }] },
      { day: 'Sat', events: [] },
      { day: 'Sun', events: [] },
    ];
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarScroll} contentContainerStyle={styles.calendarScrollContent}>
          {weekData.map((dayData, index) => (
            <TouchableOpacity 
              key={dayData.day} 
              style={styles.calendarDay}
              onPress={() => navigation.navigate('Schedule')}
              activeOpacity={0.7}
            >
              <Text style={styles.calendarDayText}>{dayData.day}</Text>
              {dayData.events.length > 0 ? (
                <View style={[styles.calendarCircle, { backgroundColor: dayData.events[0].color }]}>
                  <Text style={styles.calendarCircleText}>{dayData.events[0].letter}</Text>
                </View>
              ) : (
                <View style={styles.calendarEmptyCircle} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTeamFeed = () => {
    const feedItems = [
      {
        id: 1,
        name: 'Coach Quentin',
        role: 'coach',
        action: 'posted new playbook',
        content: 'Violent Blocks - Defensive Set',
        time: '2h ago',
        reactions: { '💪': 8, '🔥': 12 },
        cta: { label: 'Open Playbook', action: () => navigation.navigate('Playbook') },
        avatar: require('../../assets/coach_quentin.jpg')
      },
      {
        id: 2,
        name: 'Captain Dean',
        role: 'captain',
        action: 'created a poll',
        content: 'Which colors for Friday?',
        time: '4h ago',
        reactions: { '💪': 5 },
        cta: { label: 'Vote Now', action: () => {} },
        avatar: require('../../assets/DeanSokaris.png')
      },
      {
        id: 3,
        name: 'Trainer Ken',
        role: 'trainer',
        action: 'assigned new drills',
        content: 'Core strength • Agility • Speed',
        time: '1d ago',
        reactions: { '🏆': 3 },
        cta: { label: 'View Drills', action: () => {} },
        avatar: require('../../assets/KenDompier.webp')
      }
    ];

    const getRoleBadge = (role) => {
      const badges = {
        coach: { label: 'COACH', color: '#CCCCCC', bgColor: 'rgba(204, 204, 204, 0.15)' },
        captain: { label: 'CAPTAIN', color: '#666666', bgColor: 'rgba(102, 102, 102, 0.15)' },
        trainer: { label: 'TRAINER', color: '#EFBF29', bgColor: 'rgba(239, 191, 41, 0.15)' },
        player: { label: 'PLAYER', color: '#A8A8A8', bgColor: 'rgba(168, 168, 168, 0.1)' }
      };
      return badges[role] || badges.player;
    };

    const getCTAStyle = (role) => {
      const styles = {
        coach: { 
          backgroundColor: '#2A2A2A', 
          borderColor: 'transparent',
          textColor: '#CCCCCC' 
        },
        captain: { 
          backgroundColor: 'transparent', 
          borderColor: 'rgba(255, 255, 255, 0.15)',
          textColor: 'rgba(255, 255, 255, 0.9)' 
        },
        trainer: { 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          borderColor: 'rgba(255, 255, 255, 0.08)',
          textColor: 'rgba(255, 255, 255, 0.9)' 
        }
      };
      return styles[role] || styles.captain;
    };
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Feed</Text>
        {feedItems.map((item, index) => {
          const badge = getRoleBadge(item.role);
          const ctaStyle = getCTAStyle(item.role);
          return (
            <View key={item.id}>
              <View style={styles.feedItemCard}>
                <View style={styles.feedItemHeader}>
                  <View style={styles.feedItemLeft}>
                    <Image 
                      source={item.avatar} 
                      style={styles.feedAvatar}
                      resizeMode="cover"
                    />
                    <View style={styles.feedItemInfo}>
                      <View style={styles.feedNameRow}>
                        <Text style={styles.feedName}>{item.name}</Text>
                        <View style={[styles.feedRoleBadge, { backgroundColor: badge.bgColor }]}>
                          <Text style={[styles.feedRoleBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.feedAction}>{item.action}</Text>
                    </View>
                  </View>
                  <Text style={styles.feedTime}>{item.time}</Text>
                </View>
                
                <Text style={styles.feedContent}>{item.content}</Text>
                
                {/* Reactions */}
                {Object.keys(item.reactions).length > 0 && (
                  <View style={styles.feedReactions}>
                    {Object.entries(item.reactions).map(([emoji, count]) => (
                      <TouchableOpacity key={emoji} style={styles.feedReaction}>
                        <Text style={styles.feedReactionEmoji}>{emoji}</Text>
                        <Text style={styles.feedReactionCount}>{count}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* CTA Button */}
                <TouchableOpacity 
                  style={[
                    styles.feedCTAButton,
                    { 
                      backgroundColor: ctaStyle.backgroundColor,
                      borderColor: ctaStyle.borderColor 
                    }
                  ]}
                  onPress={item.cta.action}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.feedCTAButtonText, { color: ctaStyle.textColor }]}>
                    {item.cta.label}
                  </Text>
                </TouchableOpacity>
              </View>
              {index < feedItems.length - 1 && <View style={styles.feedDivider} />}
            </View>
          );
        })}
      </View>
    );
  };

  // Memoize expensive render functions to prevent unnecessary re-renders
  const memoizedTeamFeed = React.useMemo(() => renderTeamFeed(), [teamInfo, notificationCount]);
  const memoizedCalendarSnapshot = React.useMemo(() => renderCalendarSnapshot(), [nextEvent]);
  const memoizedTeamInsights = React.useMemo(() => renderTeamInsightsSection(), [teamInfo, notificationCount]);

  // Skeleton loading component for first-time load (only when no cached data exists)
  const SkeletonLoader = () => (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingBottom: adjustedTabBarHeight }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND_PRIMARY} />
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          {/* Header skeleton */}
          <View style={{ width: 180, height: 24, backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY, borderRadius: 8, marginBottom: 20 }} />
          
          {/* Next up section skeleton */}
          <View style={{ height: 100, backgroundColor: COLORS.BACKGROUND_CARD, borderRadius: 20, marginBottom: 24 }} />
          
          {/* Team insights skeleton */}
          <View style={{ height: 120, backgroundColor: COLORS.BACKGROUND_CARD, borderRadius: 20, marginBottom: 24 }} />
          
          {/* Calendar snapshot skeleton */}
          <View style={{ height: 80, backgroundColor: COLORS.BACKGROUND_CARD, borderRadius: 20, marginBottom: 24 }} />
          
          {/* Team feed skeleton */}
          <View style={{ height: 200, backgroundColor: COLORS.BACKGROUND_CARD, borderRadius: 20 }} />
        </View>
      </SafeAreaView>
    </View>
  );

  // Show skeleton only when there's no cached data (first-time load)
  // But if we have an error, show error state instead
  if (isLoading && !error) {
    return <SkeletonLoader />;
  }
  
  // If we have an error and no data, show error state
  if (error && !data?.teamId) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.safeArea, { paddingBottom: adjustedTabBarHeight }]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
              {error.message?.includes('NO_SESSION') || error.message?.includes('NO_USER') 
                ? 'Session Expired'
                : error.message?.includes('NO_TEAM') || error.message?.includes('INVALID_TEAM_ID')
                ? 'Team Not Found'
                : 'Failed to Load Data'}
            </Text>
            <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
              {error.message?.includes('NO_SESSION') || error.message?.includes('NO_USER')
                ? 'Please sign in again.'
                : error.message?.includes('NO_TEAM') || error.message?.includes('INVALID_TEAM_ID')
                ? 'You are not a member of any team.'
                : error.message || 'Please try again.'}
            </Text>
            {(error.message?.includes('NO_SESSION') || error.message?.includes('NO_USER')) && (
              <TouchableOpacity
                style={{ backgroundColor: COLORS.BRAND_ACCENT, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                onPress={() => supabase.auth.signOut()}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND_PRIMARY} />
      <SafeAreaView style={[styles.safeArea, { paddingBottom: adjustedTabBarHeight }]}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          alwaysBounceVertical={true}
          refreshControl={
            <RefreshControl
              refreshing={isManualRefreshing}
              onRefresh={handleManualRefresh}
              tintColor={COLORS.TEXT_PRIMARY}
              titleColor={COLORS.TEXT_PRIMARY}
              colors={[COLORS.TEXT_PRIMARY]}
              progressBackgroundColor={COLORS.BACKGROUND_CARD_SECONDARY}
            />
          }
        >
          {renderHeader()}
          {renderNextUpSection()}
          {memoizedTeamInsights}
          {memoizedCalendarSnapshot}
          {memoizedTeamFeed}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY, // Now correctly points to #0E0E0E
  },

  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: {
    paddingLeft: 16,
    marginRight: 20,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  personalGreeting: {
    ...TYPOGRAPHY.greeting,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  teamName: {
    ...TYPOGRAPHY.teamName,
  },
  teamSubtitle: {
    ...TYPOGRAPHY.teamSubtitle,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 16,
  },
  refreshButton: {
    padding: 4,
  },
  switchTeamHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  switchTeamHeaderButtonLogo: {
    backgroundColor: 'transparent',
  },
  switchTeamLogo: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 10,
  },
  nextUpCardNew: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownRingContainer: {
    marginRight: 16,
  },
  eventInfoNew: {
    flex: 1,
  },
  eventTitleNew: {
    ...TYPOGRAPHY.eventTitle,
    marginBottom: 4,
  },
  eventTimeNew: {
    ...TYPOGRAPHY.eventTime,
  },
  gameModeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Pure black with translucency
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
    gap: 6,
    // Subtle border for definition
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  gameModeText: {
    ...TYPOGRAPHY.gameMode,
    color: '#FF3333', // Closer to pure red but not quite (#FF0000)
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  gameModeCountdown: {
    ...TYPOGRAPHY.gameMode,
    color: '#FF3333',
    fontWeight: FONT_WEIGHTS.REGULAR,
    marginLeft: 8,
    opacity: 0.8,
  },
  nextUpCard: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 12,
    padding: 16,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventTypeEmoji: {
    fontSize: 16,
  },
  eventInfo: {
    flex: 1,
    paddingTop: 2,
  },
  eventTitle: {
    ...TYPOGRAPHY.bodyLarge,
    marginBottom: 8,
    lineHeight: 20,
  },
  eventDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  eventDetails: {
    ...TYPOGRAPHY.bodyMedium,
    lineHeight: 18,
  },
  countdownText: {
    ...TYPOGRAPHY.countdown,
  },
  statsScroll: {
    marginHorizontal: -20,
  },
  statsScrollContent: {
    paddingHorizontal: 20,
    paddingRight: 4,
  },
  insightCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginRight: 10,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ICON_BACKGROUND_HOME,
    marginBottom: 7,
  },
  insightContent: {
    alignItems: 'center',
  },
  insightLabel: {
    ...TYPOGRAPHY.insightLabel,
    marginBottom: 4,
  },
  insightValue: {
    ...TYPOGRAPHY.insightValue,
    marginBottom: 2,
  },
  insightSubtext: {
    ...TYPOGRAPHY.insightSubtext,
  },
  statCard: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY,
    borderRadius: 10,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 14,
    marginRight: 10,
    width: 185,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF15',
  },
  statContent: {
    flex: 1,
  },
  statText: {
    ...TYPOGRAPHY.statText,
    marginBottom: 2,
    flexShrink: 1,
  },
  statSubtext: {
    ...TYPOGRAPHY.statSubtext,
  },
  calendarSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  viewAllLink: {
    ...TYPOGRAPHY.viewAllLink,
  },
  calendarScroll: {
    marginHorizontal: -20,
  },
  calendarScrollContent: {
    paddingHorizontal: 20,
  },
  calendarDay: {
    alignItems: 'center',
    marginRight: 14,
    minWidth: 48,
  },
  calendarDayText: {
    ...TYPOGRAPHY.calendarDay,
    marginBottom: 8,
  },
  calendarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCircleText: {
    ...TYPOGRAPHY.calendarCircle,
  },
  calendarEmptyCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  calendarEvent: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarEventText: {
    ...TYPOGRAPHY.calendarEvent,
  },
  feedItemCard: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  feedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  feedItemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  feedAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(204, 204, 204, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  feedAvatarInitial: {
    ...TYPOGRAPHY.feedAvatar,
  },
  feedItemInfo: {
    flex: 1,
  },
  feedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  feedName: {
    ...TYPOGRAPHY.feedName,
  },
  feedRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  feedRoleBadgeText: {
    ...TYPOGRAPHY.feedRoleBadge,
  },
  feedAction: {
    ...TYPOGRAPHY.feedAction,
  },
  feedContent: {
    ...TYPOGRAPHY.feedContent,
    marginBottom: 10,
  },
  feedTime: {
    ...TYPOGRAPHY.feedTime,
  },
  feedReactions: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  feedReaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  feedReactionEmoji: {
    ...TYPOGRAPHY.feedReaction,
  },
  feedReactionCount: {
    ...TYPOGRAPHY.feedReactionCount,
  },
  feedCTAButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  feedCTAButtonText: {
    ...TYPOGRAPHY.feedCTAButton,
  },
  feedDivider: {
    height: 0.5,
    backgroundColor: '#1A1A1A',
    marginVertical: 4,
  },
  feedItem: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  feedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 9,
  },
  feedHeader: {
    ...TYPOGRAPHY.feedHeader,
    marginBottom: 6,
  },
  feedPoll: {
    ...TYPOGRAPHY.feedPoll,
    marginBottom: 6,
  },
  feedDrills: {
    ...TYPOGRAPHY.feedDrills,
    marginBottom: 6,
  },
});

export default HomeScreen;

