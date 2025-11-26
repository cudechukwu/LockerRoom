/**
 * AppContent Component
 * Contains all the app logic that requires the Supabase client
 * This component uses useSupabase() hook, so it must be rendered inside SupabaseProvider
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSupabase } from './src/providers/SupabaseProvider';
import SplashScreen from './src/components/SplashScreen';
import VideoCoverScreen from './src/components/VideoCoverScreen';
import CreateAccountScreen from './src/screens/CreateAccountScreen';
import SignInScreen from './src/screens/SignInScreen';
import TeamSetupScreen from './src/screens/TeamSetupScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import TeamPickerScreen from './src/screens/TeamPickerScreen';
import JoinOrCreateTeamScreen from './src/screens/JoinOrCreateTeamScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import ComposePlaygroundScreen from './src/screens/ComposePlaygroundScreen';
import ChannelChatScreen from './src/screens/ChannelChatScreen';
import DirectMessageChatScreen from './src/screens/DirectMessageChatScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import ConversationInfoScreen from './src/screens/ConversationInfoScreen';
import AnimatedPlaybookScreen from './src/screens/AnimatedPlaybookScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import StorageDataScreen from './src/screens/StorageDataScreen';
import TeamManagementScreen from './src/screens/TeamManagementScreen';
import AttendanceGroupsScreen from './src/screens/AttendanceGroupsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ViewProfileScreen from './src/screens/ViewProfileScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import ActiveCallScreen from './src/screens/ActiveCallScreen';
import GroupCallScreen from './src/screens/GroupCallScreen';
import { COLORS } from './src/constants/colors';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AppBootstrapContext } from './src/contexts/AppBootstrapContext';
import { TeamContext } from './src/contexts/TeamContext';

const Stack = createStackNavigator();

// React Query client configuration (no persistence for now)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes (team info/events)
      cacheTime: 10 * 60 * 1000,    // 10 minutes
      refetchOnFocus: false,        // we'll manage focus explicitly
      retry: 1,
    },
  },
});

const DISABLE_CALL_REALTIME = true; // TODO: flip back to false once Realtime infra is stable

export default function AppContent() {
  const supabase = useSupabase(); // Get hydrated Supabase client from provider
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [activeTeamId, setActiveTeamIdState] = useState(null);
  const navigationRef = useRef(null);
  const callSubscriptionRef = useRef(null);
  const setupCallListenerPendingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const hasStoppedReconnectingRef = useRef(false);
  const lastClosedLogTimeRef = useRef(0);
  const closedEventCountRef = useRef(0);
  const userTeamIdRef = useRef(null);
  const bootstrappedRef = useRef(false);
  const navReadyRef = useRef(false);
  const pendingNavigationRef = useRef(null);
  const lastBootstrapRouteRef = useRef(null);
  const userId = user?.id ?? null;

  // ... (rest of the App.js logic will go here, using supabase from useSupabase() hook)
  // For now, this is a placeholder - we need to copy all the logic from App.js

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <AppBootstrapContext.Provider value={{}}>
            <TeamContext.Provider value={{}}>
              <NavigationContainer>
                <Stack.Navigator>
                  <Stack.Screen name="VideoCover" component={VideoCoverScreen} />
                </Stack.Navigator>
              </NavigationContainer>
            </TeamContext.Provider>
          </AppBootstrapContext.Provider>
        </NotificationProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

