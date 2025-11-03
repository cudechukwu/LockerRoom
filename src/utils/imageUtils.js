import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

/**
 * Request camera and media library permissions
 */
export const requestPermissions = async () => {
  try {
    // Request camera permissions
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access to take photos.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Request media library permissions
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaPermission.status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'Please allow photo library access to select images.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

/**
 * Open camera to take a photo
 */
export const openCamera = async () => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error opening camera:', error);
    Alert.alert('Error', 'Failed to open camera. Please try again.');
    return null;
  }
};

/**
 * Open photo library to select images (multiple selection)
 */
export const openPhotoLibrary = async (maxImages = 5) => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return [];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxImages,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      return result.assets;
    }

    return [];
  } catch (error) {
    console.error('Error opening photo library:', error);
    Alert.alert('Error', 'Failed to open photo library. Please try again.');
    return [];
  }
};

/**
 * Compress and resize image
 * @param {Object} image - Image object from ImagePicker
 * @param {number} maxDimension - Maximum width or height (default: 1600)
 * @param {number} maxSizeMB - Maximum file size in MB (default: 10)
 * @returns {Object} Compressed image object
 */
export const compressImage = async (image, maxDimension = 1600, maxSizeMB = 10) => {
  try {
    if (!image || !image.uri) {
      throw new Error('Invalid image object');
    }

    // Get image dimensions
    const { width, height } = image;
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        newWidth = maxDimension;
        newHeight = (height * maxDimension) / width;
      } else {
        newHeight = maxDimension;
        newWidth = (width * maxDimension) / height;
      }
    }

    // Compress image
    const compressedImage = await ImageManipulator.manipulateAsync(
      image.uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Check file size
    if (compressedImage.fileSize && compressedImage.fileSize > maxSize) {
      // If still too large, compress more aggressively
      const aggressiveCompression = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width: newWidth * 0.8, height: newHeight * 0.8 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return aggressiveCompression;
    }

    return compressedImage;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

/**
 * Get file size in MB
 */
export const getFileSizeMB = (fileSize) => {
  return fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : 0;
};

/**
 * Validate image file
 */
export const validateImage = (image) => {
  if (!image || !image.uri) {
    return { valid: false, error: 'Invalid image' };
  }

  if (image.fileSize && image.fileSize > 10 * 1024 * 1024) { // 10MB
    return { valid: false, error: 'Image too large (max 10MB)' };
  }

  return { valid: true };
};
