import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontSize, getFontWeight } from '../constants/fonts';
import { useSupabase } from '../providers/SupabaseProvider';
import { getUserProfile, upsertUserProfile } from '../api/profiles';
import ImagePickerModal from '../components/ImagePickerModal';
import { AppBootstrapContext } from '../contexts/AppBootstrapContext';

const ROLE_OPTIONS = [
  { value: 'player', label: 'Player' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Staff' },
  { value: 'trainer', label: 'Trainer' },
];

const ProfileSetupScreen = ({ navigation }) => {
  const supabase = useSupabase();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    primaryRole: 'player',
    jerseyNumber: '',
    position: '',
  });
  const { refreshBootstrap } = useContext(AppBootstrapContext);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }

        if (!user) {
          if (isActive) {
            Alert.alert(
              'Session Expired',
              'Please sign in again to continue.',
              [
                {
                  text: 'OK',
                  onPress: () =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'SignIn' }],
                    }),
                },
              ],
              { cancelable: false }
            );
          }
          return;
        }

        if (!isActive) return;

        setUserId(user.id);

        const { data: profileData, error: profileError } = await getUserProfile(supabase, user.id);

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (!isActive) return;

        if (profileData) {
          setExistingProfile(profileData);
          setFormData({
            displayName: profileData.display_name || '',
            primaryRole: profileData.primary_role || 'player',
            jerseyNumber: profileData.preferred_jersey_number
              ? String(profileData.preferred_jersey_number)
              : '',
            position: profileData.primary_position || '',
          });
          setAvatarUrl(profileData.avatar_url || null);
        } else {
          setFormData((prev) => ({
            ...prev,
            displayName:
              user.user_metadata?.name ||
              (user.email ? user.email.split('@')[0] : ''),
          }));
        }
      } catch (loadError) {
        console.error('Error loading profile setup data:', loadError);
        if (isActive) {
          Alert.alert(
            'Error',
            'We could not load your profile information. Please try again.'
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [navigation]);

  const updateFormData = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAvatarSelected = (url) => {
    setAvatarUrl(url);
  };

  const handleComplete = async () => {
    const trimmedName = formData.displayName.trim();

    if (!trimmedName) {
      Alert.alert('Display Name Required', 'Please enter your name.');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'We could not verify your account. Please sign in again.');
      return;
    }

    let parsedNumber = null;
    if (formData.jerseyNumber.trim()) {
      const numeric = parseInt(formData.jerseyNumber.trim(), 10);
      if (Number.isNaN(numeric)) {
        Alert.alert('Invalid Number', 'Jersey number must be a valid number.');
        return;
      }
      parsedNumber = numeric;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        user_id: userId,
        display_name: trimmedName,
        avatar_url: avatarUrl || existingProfile?.avatar_url || null,
        bio: existingProfile?.bio || '',
        primary_role: formData.primaryRole || null,
        preferred_jersey_number: parsedNumber,
        primary_position: formData.position.trim() ? formData.position.trim() : null,
      };

      const { error } = await upsertUserProfile(supabase, payload);

      if (error) {
        throw error;
      }

      await refreshBootstrap({ showSpinner: true });
    } catch (saveError) {
      console.error('Error saving profile:', saveError);
      Alert.alert('Error', saveError.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (!isSubmitting) {
      handleComplete();
    }
  };

  const renderContent = () => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>
            Tell your teammates who you are. You can always edit this later.
          </Text>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setShowImagePicker(true)}
            activeOpacity={0.8}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: `${avatarUrl}?t=${Date.now()}` }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera-outline" size={28} color={COLORS.MEDIUM_GRAY} />
                <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowImagePicker(true)}>
            <Text style={styles.avatarActionText}>
              {avatarUrl ? 'Change photo' : 'Upload photo'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Display Name</Text>
          <TextInput
            value={formData.displayName}
            onChangeText={(text) => updateFormData('displayName', text)}
            onFocus={() => setFocusedField('displayName')}
            onBlur={() => setFocusedField(null)}
            style={[
              styles.input,
              focusedField === 'displayName' && styles.inputFocused,
            ]}
            placeholder="e.g. Jordan Reed"
            placeholderTextColor={COLORS.MEDIUM_GRAY}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Role</Text>
          <View style={styles.roleContainer}>
            {ROLE_OPTIONS.map((option) => {
              const isSelected = formData.primaryRole === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.roleOption,
                    isSelected && styles.roleOptionSelected,
                  ]}
                  onPress={() => updateFormData('primaryRole', option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      isSelected && styles.roleOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inlineFields}>
          <View style={[styles.section, styles.inlineField, styles.inlineFieldLeft]}>
            <Text style={styles.sectionLabel}>Preferred Jersey #</Text>
            <TextInput
              value={formData.jerseyNumber}
              onChangeText={(text) =>
                updateFormData('jerseyNumber', text.replace(/[^0-9]/g, ''))
              }
              onFocus={() => setFocusedField('jerseyNumber')}
              onBlur={() => setFocusedField(null)}
              style={[
                styles.input,
                focusedField === 'jerseyNumber' && styles.inputFocused,
              ]}
              keyboardType="number-pad"
              placeholder="Optional"
              placeholderTextColor={COLORS.MEDIUM_GRAY}
              maxLength={3}
            />
          </View>

          <View style={[styles.section, styles.inlineField, styles.inlineFieldRight]}>
            <Text style={styles.sectionLabel}>Primary Position</Text>
            <TextInput
              value={formData.position}
              onChangeText={(text) => updateFormData('position', text)}
              onFocus={() => setFocusedField('position')}
              onBlur={() => setFocusedField(null)}
              style={[
                styles.input,
                focusedField === 'position' && styles.inputFocused,
              ]}
              placeholder="Optional"
              placeholderTextColor={COLORS.MEDIUM_GRAY}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!formData.displayName.trim() || isSubmitting) && styles.primaryButtonDisabled,
            ]}
            onPress={handleComplete}
            disabled={!formData.displayName.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
            disabled={!formData.displayName.trim() || isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Fill this out later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY_BLACK} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        renderContent()
      )}

      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImageSelected={handleAvatarSelected}
        currentImageUrl={avatarUrl}
        userId={userId}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: getFontSize('MD'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.MEDIUM_GRAY,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: getFontSize('2XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  subtitle: {
    marginTop: 12,
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
    lineHeight: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.WHITE,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BACKGROUND_MUTED,
  },
  avatarPlaceholderText: {
    marginTop: 6,
    fontSize: getFontSize('SM'),
    color: COLORS.MEDIUM_GRAY,
  },
  avatarActionText: {
    marginTop: 10,
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: getFontSize('MD'),
    color: COLORS.PRIMARY_BLACK,
    backgroundColor: COLORS.WHITE,
  },
  inputFocused: {
    borderColor: COLORS.PRIMARY_BLACK,
    borderWidth: 2,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  roleOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 6,
    marginBottom: 12,
  },
  roleOptionSelected: {
    borderColor: COLORS.PRIMARY_BLACK,
    backgroundColor: COLORS.PRIMARY_BLACK,
  },
  roleOptionText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
  },
  roleOptionTextSelected: {
    color: COLORS.WHITE,
  },
  inlineFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineField: {
    flex: 1,
  },
  inlineFieldLeft: {
    marginRight: 8,
  },
  inlineFieldRight: {
    marginLeft: 8,
  },
  actions: {
    marginTop: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: getFontSize('MD'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.WHITE,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  secondaryButtonText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.MEDIUM_GRAY,
    textDecorationLine: 'underline',
  },
});

export default ProfileSetupScreen;


