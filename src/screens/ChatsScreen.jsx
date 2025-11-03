import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ChannelsListScreen, DirectMessagesListScreen, NewDirectMessageScreen } from './chat/index';
// import SimpleUnifiedChatsScreen from './SimpleUnifiedChatsScreen';
import { COLORS } from '../constants/colors';
import { getFontSize } from '../constants/fonts';
import { useAuthTeam } from '../hooks/useAuthTeam';

const Stack = createStackNavigator();

const ChatsScreen = () => {
  // Use React Query hook for team data (no more useFocusEffect needed!)
  const { data: authData, isLoading, error } = useAuthTeam();
  const teamId = authData?.teamId;

  // Show loading state while team ID is being fetched
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY_BLACK} />
        <Text style={styles.loadingText}>Loading team data...</Text>
      </View>
    );
  }

  // Show error state if team data failed to load
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Failed to load team data</Text>
      </View>
    );
  }

  // If no team ID, show error state
  if (!teamId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>You are not a member of any team.</Text>
      </View>
    );
  }
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.PRIMARY_BLACK,
        },
        headerTintColor: '#F9F9F9',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
      }}
    >
      {/* Back to using the working ChannelsListScreen */}
      {/* Keep the old screens for backward compatibility during transition */}
      <Stack.Screen 
        name="ChannelsList" 
        component={ChannelsListScreen}
        initialParams={{ teamId: teamId }}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DirectMessages" 
        component={DirectMessagesListScreen}
        initialParams={{ teamId: teamId }}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="NewDirectMessage" 
        component={NewDirectMessageScreen}
        initialParams={{ teamId: teamId }}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};



const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E0E0E',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: getFontSize('BASE'),
    color: '#F9F9F9',
    textAlign: 'center',
  },
  errorText: {
    fontSize: getFontSize('BASE'),
    color: '#FF6B6B',
    textAlign: 'center',
  },
});

export default ChatsScreen;
