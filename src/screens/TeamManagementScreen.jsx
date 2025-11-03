import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { supabase } from '../lib/supabase';
import ScreenBackground from '../components/ScreenBackground';
import ImagePickerModal from '../components/ImagePickerModal';
import { 
  getTeamInfo, 
  updateTeamInfo, 
  uploadTeamLogo, 
  isTeamAdmin 
} from '../api/teamMembers';
import { dataCache } from '../utils/dataCache';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const TeamManagementScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 60;
  const adjustedTabBarHeight = tabBarHeight + Math.max(insets.bottom - 10, 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamId, setTeamId] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    school: '',
    primary_color: '#1C1C1C',
    secondary_color: '#F5F5F5',
  });

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.navigate('VideoCover');
        return;
      }

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id, is_admin')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) {
        Alert.alert('Error', 'You are not a member of any team.');
        return;
      }

      setTeamId(teamMember.team_id);
      setIsAdmin(teamMember.is_admin);

      if (!teamMember.is_admin) {
        Alert.alert('Access Denied', 'Only team admins can manage team settings.');
        navigation.goBack();
        return;
      }

      // Load team info
      const teamData = await getTeamInfo(teamMember.team_id);
      setTeamInfo(teamData);
      setFormData({
        name: teamData.name || '',
        school: teamData.school || '',
        primary_color: teamData.primary_color || '#1C1C1C',
        secondary_color: teamData.secondary_color || '#F5F5F5',
      });

    } catch (error) {
      console.error('Error loading team data:', error);
      Alert.alert('Error', 'Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updates = {
        name: formData.name.trim(),
        school: formData.school.trim(),
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
      };

      await updateTeamInfo(teamId, updates);
      
      // Clear cache for this team
      dataCache.clearTeamData(teamId);
      
      // Reload team data
      await loadTeamData();
      
      setEditing(false);
      Alert.alert('Success', 'Team information updated successfully!');
      
    } catch (error) {
      console.error('Error updating team info:', error);
      Alert.alert('Error', 'Failed to update team information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelected = async (imageUri) => {
    try {
      setSaving(true);
      
      await uploadTeamLogo(teamId, imageUri);
      
      // Clear cache for this team
      dataCache.clearTeamData(teamId);
      
      // Reload team data to get new logo URL
      await loadTeamData();
      
      Alert.alert('Success', 'Team logo updated successfully!');
      
    } catch (error) {
      console.error('Error uploading team logo:', error);
      Alert.alert('Error', 'Failed to upload team logo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: teamInfo?.name || '',
      school: teamInfo?.school || '',
      primary_color: teamInfo?.primary_color || '#1C1C1C',
      secondary_color: teamInfo?.secondary_color || '#F5F5F5',
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY_BLACK} />
            <Text style={styles.loadingText}>Loading team data...</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
          <View style={styles.errorContainer}>
            <Ionicons name="shield" size={64} color="#FF4444" />
            <Text style={styles.errorTitle}>Access Denied</Text>
            <Text style={styles.errorText}>Only team admins can manage team settings.</Text>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={[styles.container, { paddingBottom: adjustedTabBarHeight }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY_BLACK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Management</Text>
          <View style={styles.headerRight}>
            {editing ? (
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Team Logo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Logo</Text>
            <View style={styles.logoContainer}>
              <Image 
                source={(() => {
                  // Smart logo display: Only show LockerRoom logo if team has never uploaded a logo
                  if (loading && !teamInfo) {
                    // Still loading initial data - show LockerRoom logo as placeholder
                    return require('../../assets/LockerRoom.png');
                  }
                  
                  if (teamInfo?.logo_url) {
                    // Team has a logo - show it with cache busting
                    return { uri: `${teamInfo.logo_url}?t=${Date.now()}` };
                  }
                  
                  if (teamInfo && !teamInfo.logo_url) {
                    // Team data loaded but no logo set - show LockerRoom logo
                    return require('../../assets/LockerRoom.png');
                  }
                  
                  // Fallback case
                  return require('../../assets/LockerRoom.png');
                })()} 
                style={styles.teamLogo}
                resizeMode="contain"
              />
              <TouchableOpacity 
                style={styles.changeLogoButton}
                onPress={() => setShowImagePicker(true)}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.changeLogoButtonText}>Change Logo</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.logoNote}>
              Upload a square logo (recommended: 512x512px) for best results
            </Text>
          </View>

          {/* Team Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Team Name *</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                placeholder="Enter team name"
                editable={editing}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>School/Organization *</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.school}
                onChangeText={(text) => setFormData({...formData, school: text})}
                placeholder="Enter school or organization name"
                editable={editing}
                maxLength={100}
              />
            </View>

            <View style={styles.colorRow}>
              <View style={styles.colorGroup}>
                <Text style={styles.label}>Primary Color</Text>
                <View style={styles.colorInputContainer}>
                  <View 
                    style={[styles.colorPreview, { backgroundColor: formData.primary_color }]}
                  />
                  <TextInput
                    style={[styles.colorInput, !editing && styles.inputDisabled]}
                    value={formData.primary_color}
                    onChangeText={(text) => setFormData({...formData, primary_color: text})}
                    placeholder="#1C1C1C"
                    editable={editing}
                    maxLength={7}
                  />
                </View>
              </View>

              <View style={styles.colorGroup}>
                <Text style={styles.label}>Secondary Color</Text>
                <View style={styles.colorInputContainer}>
                  <View 
                    style={[styles.colorPreview, { backgroundColor: formData.secondary_color }]}
                  />
                  <TextInput
                    style={[styles.colorInput, !editing && styles.inputDisabled]}
                    value={formData.secondary_color}
                    onChangeText={(text) => setFormData({...formData, secondary_color: text})}
                    placeholder="#F5F5F5"
                    editable={editing}
                    maxLength={7}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Team Stats Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>Channels</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>-</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Image Picker Modal */}
        <ImagePickerModal
          visible={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onImageSelected={handleImageSelected}
          currentImageUrl={teamInfo?.logo_url}
          userId={null} // Not needed for team logos
          customUploadFunction={(imageUri) => uploadTeamLogo(teamId, imageUri)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: 16,
    borderBottomWidth: 0.2,
    borderBottomColor: COLORS.PRIMARY_BLACK,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: getFontSize(isTablet ? 'LG' : 'BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  content: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: getFontSize(isTablet ? 'LG' : 'BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  teamLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  changeLogoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY_BLACK,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  changeLogoButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  logoNote: {
    fontSize: getFontSize('XS'),
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: getFontSize('BASE'),
    color: COLORS.PRIMARY_BLACK,
    backgroundColor: '#1A1A1A',
  },
  inputDisabled: {
    backgroundColor: '#1A1A1A',
    color: '#6B7280',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 16,
  },
  colorGroup: {
    flex: 1,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: getFontSize('SM'),
    color: COLORS.PRIMARY_BLACK,
    backgroundColor: '#1A1A1A',
    fontFamily: 'monospace',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '48%',
    minWidth: 120,
  },
  statValue: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: getFontSize('BASE'),
    color: '#3A3A3E',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('BOLD'),
    color: '#FF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: getFontSize('BASE'),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
  },
});

export default TeamManagementScreen;
