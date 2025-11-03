import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';

const NotificationsScreen = ({ navigation }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    teamAnnouncements: true,
    gameReminders: true,
    practiceUpdates: true,
    directMessages: true,
    weeklyDigest: false,
    emailNotifications: true,
  });

  const handleToggle = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSaveSettings = () => {
    // TODO: Save to database/async storage
    Alert.alert('Settings Saved', 'Your notification preferences have been updated.');
  };

  const handleTestNotification = () => {
    Alert.alert(
      'Test Notification',
      'This is a test notification. In a real app, this would trigger a push notification.',
      [{ text: 'OK' }]
    );
  };

  const SettingRow = ({ icon, title, description, value, onToggle, disabled = false }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Ionicons name={icon} size={20} color={disabled ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
        </View>
        {description && (
          <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#8E8E93', true: '#48484A' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#3A3A3E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Push Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Push Notifications</Text>
            
            <SettingRow
              icon="notifications-outline"
              title="Push Notifications"
              description="Receive notifications on your device"
              value={notificationSettings.pushNotifications}
              onToggle={() => handleToggle('pushNotifications')}
            />

            <SettingRow
              icon="megaphone-outline"
              title="Team Announcements"
              description="Important team updates and announcements"
              value={notificationSettings.teamAnnouncements}
              onToggle={() => handleToggle('teamAnnouncements')}
              disabled={!notificationSettings.pushNotifications}
            />

            <SettingRow
              icon="football-outline"
              title="Game Reminders"
              description="Reminders for upcoming games"
              value={notificationSettings.gameReminders}
              onToggle={() => handleToggle('gameReminders')}
              disabled={!notificationSettings.pushNotifications}
            />

            <SettingRow
              icon="time-outline"
              title="Practice Updates"
              description="Practice schedule changes and updates"
              value={notificationSettings.practiceUpdates}
              onToggle={() => handleToggle('practiceUpdates')}
              disabled={!notificationSettings.pushNotifications}
            />

            <SettingRow
              icon="chatbubble-outline"
              title="Direct Messages"
              description="New messages from teammates"
              value={notificationSettings.directMessages}
              onToggle={() => handleToggle('directMessages')}
              disabled={!notificationSettings.pushNotifications}
            />
          </View>

          {/* Email Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email Notifications</Text>
            
            <SettingRow
              icon="mail-outline"
              title="Email Notifications"
              description="Receive notifications via email"
              value={notificationSettings.emailNotifications}
              onToggle={() => handleToggle('emailNotifications')}
            />

            <SettingRow
              icon="calendar-outline"
              title="Weekly Digest"
              description="Weekly summary of team activities"
              value={notificationSettings.weeklyDigest}
              onToggle={() => handleToggle('weeklyDigest')}
              disabled={!notificationSettings.emailNotifications}
            />
          </View>

          {/* Test Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Notifications</Text>
            
            <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
              <Ionicons name="notifications" size={20} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Send Test Notification</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#3A3A3E',
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: getFontSize('XS'),
    color: '#6B7280',
    marginLeft: 32,
    lineHeight: 16,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8E8E93',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#3A3A3E',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
});

export default NotificationsScreen;
