import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

const SettingsSection = ({ onEditProfile, onSignOut, onNotifications, onStorageData }) => {
  const handleNotifications = () => {
    // Placeholder - will navigate to notifications screen
    console.log('Navigate to notifications');
    if (onNotifications) onNotifications();
  };

  const handleStorageData = () => {
    // Placeholder - will navigate to storage & data screen
    console.log('Navigate to storage & data');
    if (onStorageData) onStorageData();
  };

  const handleEditProfile = () => {
    // Toggle edit mode for profile
    console.log('Toggle edit mode');
    if (onEditProfile) onEditProfile();
  };

  const handleSignOut = () => {
    // Sign out user
    console.log('Sign out user');
    if (onSignOut) onSignOut();
  };

  return (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsTitle}>Settings</Text>
      
      <TouchableOpacity style={styles.settingItem} onPress={handleNotifications}>
        <View style={styles.settingLeft}>
          <Ionicons name="notifications-outline" size={20} color="#6B7280" />
          <Text style={styles.settingLabel}>Notifications</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.settingItem} onPress={handleStorageData}>
        <View style={styles.settingLeft}>
          <Ionicons name="server-outline" size={20} color="#6B7280" />
          <Text style={styles.settingLabel}>Storage & Data</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
        <View style={styles.settingLeft}>
          <Ionicons name="create-outline" size={20} color="#6B7280" />
          <Text style={styles.settingLabel}>Edit Profile</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.settingItem, styles.signOutItem]} onPress={handleSignOut}>
        <View style={styles.settingLeft}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={[styles.settingLabel, styles.signOutText]}>Sign Out</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  settingsSection: {
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
  settingsTitle: {
    ...TYPOGRAPHY.eventTitle, // Match HomeScreen card primary text
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    ...TYPOGRAPHY.eventTime, // Match HomeScreen card secondary text
    marginLeft: 12,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#EF4444',
  },
});

export default SettingsSection;
