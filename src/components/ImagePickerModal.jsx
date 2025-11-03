import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { uploadAvatar } from '../api/profiles';

const ImagePickerModal = ({ visible, onClose, onImageSelected, currentImageUrl, userId, customUploadFunction, onDelete }) => {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to select a photo.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take a photo.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleImageUpload = async (imageAsset) => {
    try {
      setLoading(true);

      console.log('Image asset received:', imageAsset);

      // Use custom upload function if provided
      if (customUploadFunction) {
        console.log('Using custom upload function with image asset');
        // Pass the full image asset object for flexibility
        await customUploadFunction(imageAsset);
        onClose();
        return;
      }

      // Default: create file and upload
      const file = {
        uri: imageAsset.uri,
        name: `profile_${Date.now()}.jpg`,
        type: 'image/jpeg',
      };

      console.log('Uploading image with file:', file);

        const result = await uploadAvatar(userId, file);
      
      if (result.error) {
        console.error('Upload error details:', result.error);
        throw result.error;
      }

      console.log('Upload successful:', result.data);

      // Call the callback with the new image URL
      onImageSelected(result.data.url);
      onClose();
      
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (onDelete) {
              await onDelete();
            }
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Change Profile Photo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {currentImageUrl && (
            <View style={styles.currentImageContainer}>
              <Image 
                source={{ 
                  uri: `${currentImageUrl}?t=${Date.now()}` 
                }} 
                style={styles.currentImage} 
              />
              <Text style={styles.currentImageLabel}>Current Photo</Text>
            </View>
          )}

          <View style={styles.options}>
            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={pickImage}
              disabled={loading}
            >
              <Ionicons name="image-outline" size={20} color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={takePhoto}
              disabled={loading}
            >
              <Ionicons name="camera-outline" size={20} color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            {currentImageUrl && onDelete && (
              <TouchableOpacity 
                style={[styles.optionButton, styles.deleteButton]} 
                onPress={handleDelete}
                disabled={loading}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={[styles.optionText, styles.deleteText]}>Delete Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.loadingText}>Uploading image...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.BACKGROUND_CARD_SECONDARY, // Dark background to match app theme
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  currentImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND_MUTED,
  },
  currentImageLabel: {
    ...TYPOGRAPHY.eventTime, // Match app typography
    marginTop: 8,
  },
  options: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.BACKGROUND_CARD, // Dark background for buttons
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND_MUTED,
  },
  optionText: {
    ...TYPOGRAPHY.bodyMedium,
    marginLeft: 12,
  },
  deleteButton: {
    // No special border - just the red icon and text
  },
  deleteText: {
    color: '#FF3B30',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    ...TYPOGRAPHY.eventTime, // Match app typography
    marginTop: 8,
  },
});

export default ImagePickerModal;
