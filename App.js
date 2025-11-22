import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Temporarily disable persistence to fix import issue
// import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
// Temporarily disable persistence to fix import issue
// import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
// Temporarily disable DevTools to fix React Native compatibility
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// Temporarily disable persistence to fix import issue
// import AsyncStorage from '@react-native-async-storage/async-storage';
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
import CalendarScreen from './src/screens/CalendarScreen';
import ViewProfileScreen from './src/screens/ViewProfileScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import ActiveCallScreen from './src/screens/ActiveCallScreen';
import GroupCallScreen from './src/screens/GroupCallScreen';
import { supabase } from './src/lib/supabase';
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

export default function App() {
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

  const resetNavigation = useCallback((routeName, params = {}) => {
    if (!routeName) {
      return;
    }

    const resetState = {
      index: 0,
      routes: [{ name: routeName, params }],
    };

    if (navigationRef.current && navReadyRef.current) {
      navigationRef.current.reset(resetState);
      pendingNavigationRef.current = null;
    } else {
      pendingNavigationRef.current = resetState;
    }
  }, []);

  const fetchUserTeams = useCallback(async (userId) => {
    if (!userId) {
      console.warn('⚠️ fetchUserTeams called without userId');
      return [];
    }

    try {
      console.log('🔍 Fetching teams for user:', userId);
      const { data, error } = await supabase
        .from('user_teams')
        .select('user_id, team_id, team_name, team_logo_url, role, is_admin, joined_at')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error fetching from user_teams view:', error);
        throw error;
      }

      console.log('✅ user_teams view query successful, found:', data?.length || 0, 'teams');
      return data || [];
    } catch (viewError) {
      console.warn('⚠️ user_teams view unavailable, falling back to team_members:', viewError?.message || viewError);

      try {
        const { data: fallbackTeams, error: fallbackError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            team_id,
            role,
            is_admin,
            joined_at,
            teams:teams!inner (
              name,
              logo_url
            )
          `)
          .eq('user_id', userId);

        if (fallbackError) {
          console.error('❌ Error fetching from team_members fallback:', fallbackError);
          throw fallbackError;
        }

        const mappedTeams = (fallbackTeams || []).map((member) => ({
          user_id: member.user_id,
          team_id: member.team_id,
          team_name: member.teams?.name || null,
          team_logo_url: member.teams?.logo_url || null,
          role: member.role,
          is_admin: member.is_admin,
          joined_at: member.joined_at,
        }));
        console.log('✅ team_members fallback query successful, found:', mappedTeams.length, 'teams');
        return mappedTeams;
      } catch (fallbackError) {
        console.error('❌ Error loading team memberships (both queries failed):', fallbackError?.message || fallbackError);
        return [];
      }
    }
  }, []);

  const persistLastActiveTeam = useCallback(async (teamId) => {
    if (!userId) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_active_team_id: teamId })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.warn('Failed to persist last active team:', error?.message || error);
    }
  }, [userId]);

  const bootstrapUserContext = useCallback(
    async (sessionUser, options = {}) => {
      const { showSpinner = true } = options;
      let resolvedRoute = 'VideoCover';

      if (showSpinner) {
        setIsLoading(true);
      }

      try {
        let targetRoute = 'VideoCover';
        let profile = null;
        let teams = [];

        if (sessionUser) {
          setUser((prev) => (prev?.id === sessionUser.id ? prev : sessionUser));

          try {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('user_id, display_name, avatar_url, bio, primary_role, preferred_jersey_number, primary_position, last_active_team_id')
              .eq('user_id', sessionUser.id)
              .maybeSingle();

            if (error) {
              throw error;
            }

            profile = data || null;
          } catch (profileError) {
            console.error('Error loading user profile:', profileError?.message || profileError);
            profile = null;
          }

          if (profile) {
            const needsProfileCompletion =
              !profile?.display_name ||
              !profile?.primary_role;

            setUserProfile((prev) => {
              if (prev?.user_id === profile.user_id) {
                return { ...prev, ...profile };
              }
              return profile;
            });

            if (needsProfileCompletion) {
              setUserTeams([]);
              userTeamIdRef.current = null;
              setActiveTeamIdState(null);
              persistLastActiveTeam(null);
              targetRoute = 'ProfileSetup';
            } else {
              teams = await fetchUserTeams(sessionUser.id);
              console.log('🔍 Team check result:', {
                userId: sessionUser.id,
                teamsFound: teams?.length || 0,
                teams: teams,
              });
              setUserTeams(teams);

              if (!teams || teams.length === 0) {
                console.log('⚠️ No teams found for user, showing JoinOrCreateTeam screen');
                userTeamIdRef.current = null;
                setActiveTeamIdState(null);
                persistLastActiveTeam(null);
                targetRoute = 'JoinOrCreateTeam';

              } else {
                const lastActive = profile?.last_active_team_id;
                const matchedTeam = teams.find((team) => team.team_id === lastActive);
                const resolvedTeam = matchedTeam ? matchedTeam.team_id : teams[0]?.team_id || null;

                if (resolvedTeam) {
                  userTeamIdRef.current = resolvedTeam;
                  setActiveTeamIdState(resolvedTeam);
                  persistLastActiveTeam(resolvedTeam);
                  targetRoute = 'Main';
                } else {
                  userTeamIdRef.current = null;
                  setActiveTeamIdState(null);
                  persistLastActiveTeam(null);
                  targetRoute = 'TeamPicker';
                }
              }
            }
          } else {
            setUserProfile(null);
            setUserTeams([]);
            userTeamIdRef.current = null;
            setActiveTeamIdState(null);
            persistLastActiveTeam(null);
            targetRoute = 'ProfileSetup';
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setUserTeams([]);
          userTeamIdRef.current = null;
          setActiveTeamIdState(null);
          persistLastActiveTeam(null);
          targetRoute = 'VideoCover';
        }

        if (lastBootstrapRouteRef.current !== targetRoute) {
          lastBootstrapRouteRef.current = targetRoute;
          resetNavigation(targetRoute);
        }
        resolvedRoute = targetRoute;
      } catch (error) {
        console.error('Error bootstrapping user context:', error?.message || error);
        setUser(null);
        setUserProfile(null);
        setUserTeams([]);
        userTeamIdRef.current = null;
        lastBootstrapRouteRef.current = 'VideoCover';
        resetNavigation('VideoCover');
        resolvedRoute = 'VideoCover';
      } finally {
        if (showSpinner) {
          setIsLoading(false);
        }
      }

      return resolvedRoute;
    },
    [fetchUserTeams, resetNavigation, persistLastActiveTeam]
  );

  const refreshBootstrap = useCallback(
    async (options = {}) => {
      const { showSpinner = true } = options;
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        return await bootstrapUserContext(session?.user ?? null, { showSpinner });
      } catch (error) {
        console.error('refreshBootstrap error:', error?.message || error);
        return await bootstrapUserContext(null, { showSpinner });
      }
    },
    [bootstrapUserContext]
  );

  // Global incoming call listener - moved outside useEffect to avoid closure issues
  const setupCallListener = async () => {
    if (DISABLE_CALL_REALTIME) {
      if (__DEV__) {
        console.warn('🛑 setupCallListener: Realtime calling temporarily disabled');
      }
      return;
    }

    // Throttling: prevent overlapping setup calls
    if (setupCallListenerPendingRef.current) {
      console.log('⏸️ Call listener setup already in progress, skipping...');
      return;
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (
      callSubscriptionRef.current &&
      (callSubscriptionRef.current.isJoined?.() ||
        callSubscriptionRef.current.state === 'joined')
    ) {
      console.log('⚠️ setupCallListener: already active, skipping re-subscribe');
      return;
    }

    setupCallListenerPendingRef.current = true;

    const cleanupActiveCallChannel = async () => {
      const existingChannel = callSubscriptionRef.current;
      if (!existingChannel) {
        return;
      }

      try {
        if (typeof existingChannel.unsubscribe === 'function') {
          await existingChannel.unsubscribe();
        }
      } catch (unsubscribeError) {
        console.warn('Error unsubscribing from call channel:', unsubscribeError);
      }

      try {
        supabase.removeChannel(existingChannel);
      } catch (removeError) {
        console.warn('Error removing call channel:', removeError);
      }

      callSubscriptionRef.current = null;
    };

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !navigationRef.current) {
        return;
      }

      let userTeamId = userTeamIdRef.current;

      if (!userTeamId) {
        const { data: teamMember, error: teamMemberError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        console.log('📋 setupCallListener team member check:', {
          currentUserId: currentUser.id,
          teamMember,
          teamMemberError,
        });

        if (teamMemberError) {
          console.error('❌ Error loading team member info:', teamMemberError);
          return;
        }

        if (!teamMember) {
          console.warn('⚠️ User has no team, skipping call listener setup');
          return;
        }

        userTeamId = teamMember.team_id;
        userTeamIdRef.current = userTeamId;
      } else {
        console.log('📋 setupCallListener using cached team info:', {
          currentUserId: currentUser.id,
          teamId: userTeamId,
        });
      }

      const targetChannelName = 'public:call_participants';

      // Guard against duplicate active subscriptions
      if (callSubscriptionRef.current) {
        const existingChannel = callSubscriptionRef.current;
        const existingTopic =
          existingChannel.topic ||
          existingChannel.params?.channel ||
          existingChannel._channelTopic;
        const isSameTopic = existingTopic === targetChannelName;
        const isJoined =
          typeof existingChannel.isJoined === 'function'
            ? existingChannel.isJoined()
            : existingChannel.state === 'joined';

        if (isSameTopic && isJoined) {
          console.log('⚠️ setupCallListener: channel already active, skipping re-subscribe');
          return;
        }

        await cleanupActiveCallChannel();
      }

      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Ensure Realtime connection uses fresh auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const setAuthFn =
          typeof supabase.realtime.setAuth === 'function'
            ? supabase.realtime.setAuth.bind(supabase.realtime)
            : typeof supabase.realtime.setAuthToken === 'function'
              ? supabase.realtime.setAuthToken.bind(supabase.realtime)
              : null;

        if (setAuthFn) {
          await setAuthFn(session.access_token);
          console.log('🔑 Realtime auth set before subscribing');
        } else {
          console.warn('⚠️ Realtime auth setter not available on current client version');
        }
      } else {
        console.warn('⚠️ No session access token available for realtime');
      }

      // Use unique channel name per user for better isolation
      // Enable built-in Supabase auto-reconnect with proper configuration
      const callChannel = supabase.channel(targetChannelName, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUser.id },
          retry: true, // ✅ ensures auto-reconnect (prevents CLOSE event spam)
        },
      });

      // Reconnection guard: detect when Realtime reconnects
      callChannel.on('presence', { event: 'join' }, () => {
        console.log('🔄 Realtime reconnected: call listener restored');
      });

      callChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_participants',
          filter: `user_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          const participant = payload.new;
          const callSessionId = participant.call_session_id;

          // Fetch the call session with team verification in one query
          const { data: callSession, error } = await supabase
            .from('call_sessions')
            .select('*')
            .eq('id', callSessionId)
            .eq('team_id', userTeamId) // Security: verify team membership
            .single();

          if (error || !callSession) {
            console.error('Error fetching call session or team mismatch:', error);
            return;
          }

          // Additional security check: verify user is actually a participant
          if (callSession.initiator_id === currentUser.id) {
            // User is the initiator, not an incoming call
            return;
          }

          // Only navigate if:
          // 1. Call status is 'ringing'
          // 2. Current user is NOT the initiator (it's an incoming call)
          // 3. Navigation is ready
          // 4. Not already on IncomingCallScreen (prevent double navigation)
          if (
            callSession.status === 'ringing' &&
            navigationRef.current
          ) {
            // Navigation stability: prevent double navigation
            const currentRoute = navigationRef.current.getCurrentRoute();
            if (currentRoute?.name === 'IncomingCall') {
              console.log('⚠️ Already on IncomingCall screen, skipping navigation');
              return;
            }

            console.log('📞 Incoming call detected:', callSessionId);
            
            // Haptic feedback for incoming call
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (hapticError) {
              console.warn('Haptic feedback failed:', hapticError);
            }
            
            // Navigate to IncomingCallScreen
            navigationRef.current.navigate('IncomingCall', {
              callSessionId: callSessionId,
            });
          }
        }
      );

      const handleStatusChange = async (status) => {
        // Ignore all events if we've stopped reconnecting
        if (hasStoppedReconnectingRef.current && status !== 'SUBSCRIBED') {
          return;
        }

        // Debug: Log all status changes to understand what's happening
        if (__DEV__) {
          console.debug(`[Realtime] Status: ${status}`);
        }

        if (status === 'SUBSCRIBED') {
          console.log(`✅ Global call listener subscribed for user ${currentUser.id}`);
          setupCallListenerPendingRef.current = false;
          reconnectAttemptsRef.current = 0; // Reset on successful connection
          hasStoppedReconnectingRef.current = false; // Reset flag on success
          closedEventCountRef.current = 0; // Reset closed event counter
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Global call listener error');
          setupCallListenerPendingRef.current = false;
          reconnectAttemptsRef.current = 0; // Reset on error
          hasStoppedReconnectingRef.current = false; // Reset flag
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Call listener subscription timed out, retrying...');
          setupCallListenerPendingRef.current = false;
          reconnectAttemptsRef.current = 0; // Reset on timeout
          hasStoppedReconnectingRef.current = false; // Reset flag
          // Retry subscription after a short delay
          await cleanupActiveCallChannel();
          reconnectTimeoutRef.current = setTimeout(() => {
            setupCallListener();
          }, 2000);
        } else if (status === 'CLOSED') {
          closedEventCountRef.current += 1;
          
          // Throttle logging to prevent infinite spam (log first 3, then every 10 seconds)
          const now = Date.now();
          const shouldLog = closedEventCountRef.current <= 3 || (now - lastClosedLogTimeRef.current > 10000);
          
          if (shouldLog) {
            if (closedEventCountRef.current > 3) {
              console.warn(`⚠️ Channel closed (${closedEventCountRef.current} times) — attempting manual reconnect...`);
            } else {
              console.warn('⚠️ Channel closed — attempting reconnect');
            }
            lastClosedLogTimeRef.current = now;
          }
          
          setupCallListenerPendingRef.current = false;
          
          // If Supabase auto-reconnect isn't working, manually retry after delay
          // But only if we haven't exceeded reasonable retry limit
          await cleanupActiveCallChannel();
          if (closedEventCountRef.current <= 10 && !reconnectTimeoutRef.current) {
            const backoffDelay = Math.min(2000 * closedEventCountRef.current, 30000); // Exponential backoff, max 30s
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (!hasStoppedReconnectingRef.current) {
                console.log('🔄 Manually retrying call listener connection...');
                setupCallListener();
              }
            }, backoffDelay);
          } else if (closedEventCountRef.current > 10) {
            console.error('❌ Channel closed too many times. Check Supabase Realtime configuration.');
            console.error('📋 Troubleshooting steps:');
            console.error('   1. Go to Supabase Dashboard → Settings → API → Ensure Realtime is enabled');
            console.error('   2. Go to Database → Replication → Enable replication for call_sessions and call_participants');
            console.error('   3. Check RLS policies allow SELECT for authenticated users');
            console.error('   4. See REALTIME_TROUBLESHOOTING.md for detailed steps');
            hasStoppedReconnectingRef.current = true;
          }
        }
      };

      let subscriptionResult;
      try {
        subscriptionResult = await callChannel.subscribe(handleStatusChange);
      } catch (subscribeError) {
        console.error('❌ Exception while subscribing to call channel:', subscribeError);
        setupCallListenerPendingRef.current = false;
        return;
      }

      const subscriptionError =
        subscriptionResult && typeof subscriptionResult === 'object' && 'error' in subscriptionResult
          ? subscriptionResult.error
          : null;
      const subscriptionData =
        subscriptionResult && typeof subscriptionResult === 'object' && 'data' in subscriptionResult
          ? subscriptionResult.data
          : subscriptionResult;

      if (subscriptionError) {
        console.error('❌ Call listener subscription error:', subscriptionError);
        setupCallListenerPendingRef.current = false;
        return;
      }

      console.log('✅ Call listener subscribe() resolved successfully', subscriptionData);

      let resolvedChannel = callChannel;
      if (subscriptionData && typeof subscriptionData === 'object') {
        if ('subscription' in subscriptionData) {
          resolvedChannel = subscriptionData.subscription || resolvedChannel;
        } else if ('on' in subscriptionData) {
          resolvedChannel = subscriptionData;
        }
      }

      callSubscriptionRef.current = resolvedChannel;
    } catch (error) {
      console.error('Error setting up call listener:', error);
    } finally {
      setupCallListenerPendingRef.current = false;
    }
  };

  useEffect(() => {
    // AppState listener for background refresh
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    
    return () => sub.remove();
  }, []);

  // Realtime connection observability
  // Add global Realtime socket event logs
  useEffect(() => {
    // Check if Supabase Realtime exposes these methods
    if (supabase.realtime) {
      // Note: These may not be available in all Supabase client versions
      // They're optional and won't break if unavailable
      try {
        if (supabase.realtime.onOpen) {
          supabase.realtime.onOpen(() => console.log('🔌 Realtime socket opened'));
        }
        if (supabase.realtime.onClose) {
          supabase.realtime.onClose(() => console.log('🔌 Realtime socket closed'));
        }
        if (supabase.realtime.onError) {
          supabase.realtime.onError((e) => console.error('🔌 Realtime error:', e));
        }
      } catch (err) {
        // Silently fail if methods don't exist
        console.debug('Realtime event listeners not available:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let isMounted = true;

    const sessionTimeout = setTimeout(() => {
      if (isMounted) {
      console.warn('⚠️ Session check timed out after 10 seconds');
      setIsLoading(false);
      }
    }, 10000);

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error('❌ Error getting session:', error);
          await bootstrapUserContext(null, { showSpinner: true });
          return;
        }

        if (session?.user) {
          console.log('✅ Session found (bootstrapped):', session.user.id);
        } else {
          console.log('ℹ️ No active session');
        }

        await bootstrapUserContext(session?.user ?? null, { showSpinner: true });
      })
      .catch(async (error) => {
        console.error('❌ Failed to get session:', error);
        await bootstrapUserContext(null, { showSpinner: true });
      })
      .finally(() => {
        clearTimeout(sessionTimeout);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        if (callSubscriptionRef.current) {
          try {
            supabase.removeChannel(callSubscriptionRef.current);
          } catch (cleanupError) {
            console.warn('Error removing call channel on sign out:', cleanupError);
          }
          callSubscriptionRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        reconnectAttemptsRef.current = 0;
        setupCallListenerPendingRef.current = false;
        hasStoppedReconnectingRef.current = false;
        userTeamIdRef.current = null;
        setActiveTeamIdState(null);
        lastBootstrapRouteRef.current = 'VideoCover';
        pendingNavigationRef.current = null;
        if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'VideoCover' }],
        });
        }
      }

      const showSpinner = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' ? false : true;
      await bootstrapUserContext(newUser, { showSpinner });

      if (
        !DISABLE_CALL_REALTIME &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        newUser
      ) {
        setTimeout(() => {
          if (!hasStoppedReconnectingRef.current) {
            setupCallListener();
          }
        }, 2000);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [bootstrapUserContext]);

  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event.url || event;
      console.log('🔗 Deep link triggered:', url);
      
      // Check if this is an auth callback
      if (url.includes('auth/callback')) {
        try {
          // Parse the URL - Supabase email confirmation uses hash fragments
          // Format: lockerroom://auth/callback#access_token=...&refresh_token=...
          if (url.includes('#')) {
            const hashParams = url.split('#')[1];
            const params = new URLSearchParams(hashParams);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken && refreshToken) {
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (sessionError) {
                console.error('Error setting session:', sessionError);
              } else if (sessionData?.user) {
                console.log('User signed in via email confirmation!');
                // The onAuthStateChange listener will update the user state automatically
              }
            }
          } else if (url.includes('code=')) {
            // Handle PKCE flow with code parameter
            const { data, error } = await supabase.auth.exchangeCodeForSession(url);
            if (error) {
              console.error('Error exchanging code for session:', error);
            } else if (data?.user) {
              console.log('User signed in via email confirmation!');
            }
          }
        } catch (error) {
          console.error('Deep link error:', error);
        }
      }
    };

    // Check for initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Cleanup function
    return () => {
      linkingSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (DISABLE_CALL_REALTIME) {
      return;
    }

    if (user) {
      setupCallListener();
    } else if (callSubscriptionRef.current) {
      try {
        supabase.removeChannel(callSubscriptionRef.current);
      } catch (cleanupError) {
        console.warn('Error removing call channel on cleanup:', cleanupError);
      }
      callSubscriptionRef.current = null;
      setupCallListenerPendingRef.current = false;
    }

    return () => {
      if (DISABLE_CALL_REALTIME && callSubscriptionRef.current) {
        try {
          supabase.removeChannel(callSubscriptionRef.current);
        } catch (cleanupError) {
          console.warn('Error removing call channel on cleanup:', cleanupError);
        }
        callSubscriptionRef.current = null;
      }
      if (callSubscriptionRef.current) {
        try {
          supabase.removeChannel(callSubscriptionRef.current);
        } catch (cleanupError) {
          console.warn('Error removing call channel on cleanup:', cleanupError);
        }
        callSubscriptionRef.current = null;
      }
      setupCallListenerPendingRef.current = false;
    };
  }, [user]); // Re-run when user changes (login/logout)

  const bootstrapContextValue = useMemo(
    () => ({
      user,
      userProfile,
      userTeams,
      refreshBootstrap,
    }),
    [user, userProfile, userTeams, refreshBootstrap]
  );

  const teamContextValue = useMemo(
    () => ({
      teams: userTeams,
      activeTeamId,
      setActiveTeamId: (teamId) => {
        if (userTeamIdRef.current === teamId) {
          setActiveTeamIdState(teamId);
          return;
        }
        userTeamIdRef.current = teamId;
        setActiveTeamIdState(teamId);
        persistLastActiveTeam(teamId);
      },
      refreshTeams: async () => {
        if (!userId) {
          return;
        }
        const teams = await fetchUserTeams(userId);
        setUserTeams(teams);
      },
    }),
    [userTeams, activeTeamId, userId, fetchUserTeams, persistLastActiveTeam]
  );

  if (isLoading) {
    return <SplashScreen navigation={{ replace: () => {} }} />;
  }

  const resolvedInitialRoute =
    lastBootstrapRouteRef.current ||
    (userProfile
      ? (userTeams?.length || activeTeamId ? 'Main' : 'JoinOrCreateTeam')
      : user
        ? 'ProfileSetup'
        : 'VideoCover');

  const navigatorKey = `${resolvedInitialRoute}-${user?.id ?? 'anon'}`;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <AppBootstrapContext.Provider value={bootstrapContextValue}>
          <TeamContext.Provider value={teamContextValue}>
            <NavigationContainer
              key={navigatorKey}
              ref={navigationRef}
              onReady={() => {
                navReadyRef.current = true;
                if (pendingNavigationRef.current && navigationRef.current) {
                  navigationRef.current.reset(pendingNavigationRef.current);
                  pendingNavigationRef.current = null;
                }
              }}
            >
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#FFFFFF' }
            }}
            initialRouteName={resolvedInitialRoute}
          >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="VideoCover" component={VideoCoverScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <Stack.Screen name="TeamSetup" component={TeamSetupScreen} />
          <Stack.Screen name="TeamPicker" component={TeamPickerScreen} />
          <Stack.Screen name="JoinOrCreateTeam" component={JoinOrCreateTeamScreen} />
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator}
          />
          <Stack.Screen 
            name="ComposePlayground" 
            component={ComposePlaygroundScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: true,
              gestureDirection: 'vertical',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="ChannelChat" 
            component={ChannelChatScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="DirectMessageChat" 
            component={DirectMessageChatScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="ThreadScreen" 
            component={ThreadScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
              cardStyle: { backgroundColor: '#181818' },
            }}
          />
          <Stack.Screen 
            name="ConversationInfo" 
            component={ConversationInfoScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen 
            name="AnimatedPlaybook" 
            component={AnimatedPlaybookScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="StorageData" 
            component={StorageDataScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="TeamManagement" 
            component={TeamManagementScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Schedule" 
            component={CalendarScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="ViewProfile" 
            component={ViewProfileScreen}
            options={{
              presentation: 'card',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="IncomingCall" 
            component={IncomingCallScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false, // Prevent swipe to dismiss during call
              headerShown: false,
              animationTypeForReplace: 'push',
            }}
          />
          <Stack.Screen 
            name="ActiveCall" 
            component={ActiveCallScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false, // Prevent swipe to dismiss during active call
              headerShown: false,
              animationTypeForReplace: 'push',
            }}
          />
          <Stack.Screen 
            name="GroupCall" 
            component={GroupCallScreen}
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false,
              animationTypeForReplace: 'push',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
          </TeamContext.Provider>
        </AppBootstrapContext.Provider>
    </NotificationProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
