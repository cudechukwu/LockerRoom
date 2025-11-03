import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Dimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import HomeScreen from '../screens/HomeScreen';
import ChatsScreen from '../screens/ChatsScreen';
import PlaybookScreen from '../screens/PlaybookScreen';
import ActionsScreen from '../screens/ActionsScreen';
// import FilmScreen from '../screens/FilmScreen';
import ProfileScreen from '../screens/ProfileScreen';
// import ProfilePlaygroundScreen from '../screens/ProfilePlaygroundScreen';
import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();

// Custom Tab Bar with Blur Effect and Haptic Feedback
const BlurTabBar = (props) => {
  const insets = useSafeAreaInsets();
  const BottomTabBar = require('@react-navigation/bottom-tabs').BottomTabBar;
  
  // Add haptic feedback on tab press
  const handleTabPress = (e) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    props.navigation.navigate(e.target);
  };
  
  return (
    <BlurView
      intensity={80}
      tint="light"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      <View style={{ paddingBottom: Math.max(insets.bottom - 18, 0) }}>
        <BottomTabBar {...props} />
      </View>
    </BlurView>
  );
};

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  
  // Calculate proper tab bar height based on device
  const tabBarHeight = Platform.OS === 'ios' ? 70 : 60;
  // Reduce the bottom padding to bring the tab bar closer to the screen edge
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 18, 0);
  
  return (
    <Tab.Navigator
      tabBar={(props) => <BlurTabBar {...props} />}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Playbook') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Actions') {
            iconName = focused ? 'grid' : 'grid-outline';
          // } else if (route.name === 'Film') {
          //   iconName = focused ? 'videocam' : 'videocam-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          // } else if (route.name === 'Playground') {
          //   iconName = focused ? 'code-slash' : 'code-slash';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 0,
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          paddingTop: Platform.OS === 'ios' ? 8 : 5,
          height: tabBarHeight,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: Platform.OS === 'ios' ? 0 : 0,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen}
        options={{
          title: 'Chats',
        }}
      />
      <Tab.Screen 
        name="Playbook" 
        component={PlaybookScreen}
        options={{
          title: 'Playbook',
        }}
      />
      <Tab.Screen 
        name="Actions" 
        component={ActionsScreen}
        options={{
          title: 'Locker',
        }}
      />
      {/* <Tab.Screen 
        name="Film" 
        component={FilmScreen}
        options={{
          title: 'Film',
        }}
      /> */}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      {/* <Tab.Screen 
        name="Playground" 
        component={ProfilePlaygroundScreen}
        options={{
          title: 'Design',
        }}
      /> */}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
