import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import AvatarPicker from './AvatarPicker';
import { uploadAvatar, upsertUserProfile, upsertTeamMemberProfile } from '../api/profiles';
import { useSupabase } from '../providers/SupabaseProvider';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const EditProfileModal = ({ 
  visible, 
  onClose, 
  profile, 
  teamId, 
  userId, 
  userRole,
  isAdmin = false,
  onProfileUpdated 
}) => {
  const supabase = useSupabase();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        // User profile fields
        display_name: profile.user_profiles?.display_name || '',
        bio: profile.user_profiles?.bio || '',
        
        // Team member profile fields
        jersey_number: profile.jersey_number?.toString() || '',
        position: profile.position || '',
        class_year: profile.class_year || '',
        height_cm: profile.height_cm?.toString() || '',
        weight_kg: profile.weight_kg?.toString() || '',
        hometown: profile.hometown || '',
        high_school: profile.high_school || '',
        major: profile.major || '',
        
        // Staff fields
        staff_title: profile.staff_title || '',
        department: profile.department || '',
        years_experience: profile.years_experience?.toString() || '',
      });
    }
  }, [profile]);

  const isPlayer = userRole === 'player';
  const isStaff = ['coach', 'trainer', 'assistant'].includes(userRole);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarSelected = (file) => {
    setAvatarFile(file);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Upload avatar if selected
      let avatarUrl = profile?.user_profiles?.avatar_url;
      if (avatarFile) {
        console.log('Uploading avatar...');
        const { data: uploadData, error: uploadError } = await uploadAvatar(supabase, userId, avatarFile);
        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw uploadError;
        }
        avatarUrl = uploadData.url;
        console.log('Avatar uploaded successfully');
      }

      // Update user profile
      const userProfileData = {
        user_id: userId,
        display_name: formData.display_name.trim(),
        bio: formData.bio.trim(),
        avatar_url: avatarUrl,
      };

      console.log('Saving user profile with avatar URL:', avatarUrl);
      const { error: userError } = await upsertUserProfile(supabase, userProfileData);
      if (userError) throw userError;
      console.log('User profile saved successfully');

      // Update team member profile
      const teamProfileData = {
        // Player fields
        jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
        position: formData.position.trim() || null,
        class_year: formData.class_year.trim() || null,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
        hometown: formData.hometown.trim() || null,
        high_school: formData.high_school.trim() || null,
        major: formData.major.trim() || null,
        
        // Staff fields
        staff_title: formData.staff_title.trim() || null,
        department: formData.department.trim() || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        
        // Check completion
        is_complete: checkProfileCompletion(),
      };

      const { error: teamError } = await upsertTeamMemberProfile(supabase, teamId, userId, teamProfileData);
      if (teamError) throw teamError;

      Alert.alert('Success', 'Profile updated successfully!');
      // Clear the avatar file state
      setAvatarFile(null);
      onProfileUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkProfileCompletion = () => {
    if (isPlayer) {
      return !!(formData.jersey_number && formData.position && formData.class_year);
    } else if (isStaff) {
      return !!(formData.staff_title && formData.department);
    }
    return true;
  };

  const renderPlayerFields = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Jersey Number *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.jersey_number}
          onChangeText={(value) => handleInputChange('jersey_number', value)}
          placeholder="e.g., 15"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Position *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.position}
          onChangeText={(value) => handleInputChange('position', value)}
          placeholder="e.g., Quarterback"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Class Year *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.class_year}
          onChangeText={(value) => handleInputChange('class_year', value)}
          placeholder="e.g., Junior"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.halfWidth]}>
          <Text style={styles.fieldLabel}>Height (cm)</Text>
          <TextInput
            style={styles.textInput}
            value={formData.height_cm}
            onChangeText={(value) => handleInputChange('height_cm', value)}
            placeholder="e.g., 185"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.fieldGroup, styles.halfWidth]}>
          <Text style={styles.fieldLabel}>Weight (kg)</Text>
          <TextInput
            style={styles.textInput}
            value={formData.weight_kg}
            onChangeText={(value) => handleInputChange('weight_kg', value)}
            placeholder="e.g., 85"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Hometown</Text>
        <TextInput
          style={styles.textInput}
          value={formData.hometown}
          onChangeText={(value) => handleInputChange('hometown', value)}
          placeholder="e.g., Milton, Mass."
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>High School</Text>
        <TextInput
          style={styles.textInput}
          value={formData.high_school}
          onChangeText={(value) => handleInputChange('high_school', value)}
          placeholder="e.g., Milton High School"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Major</Text>
        <TextInput
          style={styles.textInput}
          value={formData.major}
          onChangeText={(value) => handleInputChange('major', value)}
          placeholder="e.g., Computer Science"
        />
      </View>
    </>
  );

  const renderStaffFields = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.staff_title}
          onChangeText={(value) => handleInputChange('staff_title', value)}
          placeholder="e.g., Head Coach, Athletic Trainer"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Department *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.department}
          onChangeText={(value) => handleInputChange('department', value)}
          placeholder="e.g., Football, Athletics"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Years of Experience</Text>
        <TextInput
          style={styles.textInput}
          value={formData.years_experience}
          onChangeText={(value) => handleInputChange('years_experience', value)}
          placeholder="e.g., 5"
          keyboardType="numeric"
        />
      </View>

    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Edit Profile</Text>
          
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            <Text style={[styles.saveText, loading && styles.saveTextDisabled]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <AvatarPicker
              currentAvatarUrl={profile?.user_profiles?.avatar_url}
              onAvatarSelected={handleAvatarSelected}
              size="large"
              editable={true}
            />
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Display Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.display_name}
                onChangeText={(value) => handleInputChange('display_name', value)}
                placeholder="Enter your name"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.bio}
                onChangeText={(value) => handleInputChange('bio', value)}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Role-specific fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isPlayer ? 'Player Information' : 'Staff Information'}
            </Text>
            
            {isPlayer ? renderPlayerFields() : renderStaffFields()}
          </View>

          {/* Completion status */}
          <View style={styles.completionSection}>
            <View style={styles.completionRow}>
              <Text style={styles.completionLabel}>Profile Complete:</Text>
              <View style={[styles.completionBadge, checkProfileCompletion() ? styles.complete : styles.incomplete]}>
                <Text style={[styles.completionText, checkProfileCompletion() ? styles.completeText : styles.incompleteText]}>
                  {checkProfileCompletion() ? '✓ Complete' : '⚠ Incomplete'}
                </Text>
              </View>
            </View>
            <Text style={styles.completionNote}>
              {isPlayer 
                ? 'Required: Jersey Number, Position, Class Year'
                : 'Required: Title, Department'
              }
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    ...TYPOGRAPHY.bodyMedium, // Match app typography
    color: COLORS.TEXT_MUTED,
  },
  headerTitle: {
    ...TYPOGRAPHY.sectionTitle, // Match app typography
    color: COLORS.TEXT_PRIMARY,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.PRIMARY_BLACK,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveText: {
    ...TYPOGRAPHY.bodyMedium, // Match app typography
    color: COLORS.WHITE,
  },
  saveTextDisabled: {
    color: '#D1D5DB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle, // Match app typography
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    ...TYPOGRAPHY.eventTime, // Match app typography
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...TYPOGRAPHY.bodyMedium, // Match app typography
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  completionSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  completionLabel: {
    ...TYPOGRAPHY.bodyMedium, // Match app typography
    color: COLORS.TEXT_PRIMARY,
  },
  completionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  complete: {
    backgroundColor: '#D1FAE5',
  },
  incomplete: {
    backgroundColor: '#FEF3C7',
  },
  completionText: {
    ...TYPOGRAPHY.eventTime, // Match app typography
  },
  completeText: {
    color: '#065F46',
  },
  incompleteText: {
    color: '#92400E',
  },
  completionNote: {
    ...TYPOGRAPHY.eventTime, // Match app typography
    color: COLORS.TEXT_MUTED,
  },
});

export default EditProfileModal;
