import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
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
import MainTabNavigator from './src/navigation/MainTabNavigator';
import ComposePlaygroundScreen from './src/screens/ComposePlaygroundScreen';
import ChannelChatScreen from './src/screens/ChannelChatScreen';
import DirectMessageChatScreen from './src/screens/DirectMessageChatScreen';
import ConversationInfoScreen from './src/screens/ConversationInfoScreen';
import AnimatedPlaybookScreen from './src/screens/AnimatedPlaybookScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import StorageDataScreen from './src/screens/StorageDataScreen';
import TeamManagementScreen from './src/screens/TeamManagementScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import ViewProfileScreen from './src/screens/ViewProfileScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import ActiveCallScreen from './src/screens/ActiveCallScreen';
import { supabase } from './src/lib/supabase';
import { COLORS } from './src/constants/colors';
import { NotificationProvider } from './src/contexts/NotificationContext';

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

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // AppState listener for background refresh
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <SplashScreen navigation={{ replace: () => {} }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#FFFFFF' }
            }}
            initialRouteName={user ? "Main" : "VideoCover"}
          >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="VideoCover" component={VideoCoverScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="TeamSetup" component={TeamSetupScreen} />
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator}
            options={{
              gestureEnabled: false,
            }}
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
            name="Calendar" 
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
        </Stack.Navigator>
      </NavigationContainer>
    </NotificationProvider>
    </QueryClientProvider>
  );
}
