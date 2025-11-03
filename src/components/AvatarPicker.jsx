import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const AvatarPicker = ({ 
  currentAvatarUrl, 
  onAvatarSelected, 
  size = 'large',
  editable = true,
  style 
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const getSize = () => {
    switch (size) {
      case 'small':
        return isTablet ? 60 : 48;
      case 'medium':
        return isTablet ? 80 : 64;
      case 'large':
        return isTablet ? 120 : 96;
      default:
        return isTablet ? 100 : 80;
    }
  };

  const avatarSize = getSize();

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload a profile photo.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    if (!editable) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Create a file object for upload
        const file = {
          uri: asset.uri,
          name: `avatar.${asset.uri.split('.').pop()}`,
          type: `image/${asset.uri.split('.').pop()}`,
        };

        onAvatarSelected(file);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const takePhoto = async () => {
    if (!editable) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        const file = {
          uri: asset.uri,
          name: `avatar.${asset.uri.split('.').pop()}`,
          type: `image/${asset.uri.split('.').pop()}`,
        };

        onAvatarSelected(file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const showImageOptions = () => {
    if (!editable) return;

    Alert.alert(
      'Change Profile Photo',
      'Choose how you want to update your profile photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.avatarContainer,
          { 
            width: avatarSize, 
            height: avatarSize,
            borderRadius: avatarSize / 2,
          }
        ]}
        onPress={showImageOptions}
        disabled={!editable || isUploading}
        activeOpacity={editable ? 0.7 : 1}
      >
        {currentAvatarUrl ? (
          <Image
            source={{ uri: currentAvatarUrl }}
            style={[
              styles.avatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              }
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              }
            ]}
          >
            <Text style={[styles.avatarText, { fontSize: avatarSize * 0.4 }]}>
              ?
            </Text>
          </View>
        )}

        {/* Upload overlay */}
        {editable && (
          <View style={[styles.uploadOverlay, { borderRadius: avatarSize / 2 }]}>
            <View style={styles.uploadIcon}>
              <Text style={styles.uploadIconText}>
                {isUploading ? '⏳' : '📷'}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {editable && (
        <TouchableOpacity
          style={styles.changeButton}
          onPress={showImageOptions}
          disabled={isUploading}
        >
          <Text style={styles.changeButtonText}>
            {isUploading ? 'Uploading...' : 'Change Photo'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  avatar: {
    // Image styles handled inline
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#9CA3AF',
    fontWeight: getFontWeight('BOLD'),
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  uploadIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconText: {
    fontSize: 16,
  },
  changeButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  changeButtonText: {
    fontSize: getFontSize('SM'),
    color: COLORS.PRIMARY_BLACK,
    fontWeight: getFontWeight('MEDIUM'),
  },
});

export default AvatarPicker;
