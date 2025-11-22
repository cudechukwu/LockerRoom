import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS } from '../constants/typography';
import ActionCard from '../components/ActionCard';
import { getActionsByRole, ACTION_CONFIGS } from '../constants/actions';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const ActionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 60;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 10, 0);

  const [userRole, setUserRole] = useState('player'); // Default to player
  const [actions, setActions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.navigate('VideoCover');
        return;
      }
      setCurrentUser(user);

      // Get user's team role
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role, is_admin')
        .eq('user_id', user.id)
        .single();

      if (teamMember) {
        // Set role based on admin status or actual role
        const role = teamMember.is_admin ? 'coach' : teamMember.role;
        setUserRole(role);
        console.log('User role loaded:', role);
      } else {
        setUserRole('player'); // Default fallback
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('player'); // Fallback on error
    }
  };

  useEffect(() => {
    if (userRole) {
      const orderedActions = getActionsByRole(userRole);
      setActions(orderedActions);
    }
  }, [userRole]);

  const handleActionPress = (action) => {
    console.log('Action pressed:', action.title);
    
    switch (action.id) {
      case 'calendar':
        navigation.navigate('Schedule', {
          initialView: 'day',
          initialDate: new Date().toISOString(),
        });
        break;
      case 'notes':
        // TODO: Navigate to Notes screen
        console.log('Notes not implemented yet');
        break;
      case 'polls':
        // TODO: Navigate to Polls screen
        console.log('Polls not implemented yet');
        break;
      default:
        console.log(`${action.title} not implemented yet`);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Actions</Text>
        <Text style={styles.headerSubtitle}>
          {userRole === 'coach' || userRole === 'admin' ? 'Manage your team' : 'Stay connected'}
        </Text>
      </View>
    </View>
  );


  const renderMainActions = () => (
    <View style={styles.mainActionsSection}>
      <View style={styles.actionsGrid}>
        {actions.map((action, index) => (
          <ActionCard
            key={action.id}
            action={action}
            size="large"
            onPress={() => handleActionPress(action)}
            style={styles.gridCard}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {renderMainActions()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY, // Grey background like HomeScreen
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
    // Removed border for cleaner look
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_MUTED,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isTablet ? 24 : 20,
    paddingTop: 20,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  mainActionsSection: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  gridCard: {
    marginBottom: 16,
    // Width will be calculated dynamically in ActionCard component
  },
});

export default ActionsScreen;
