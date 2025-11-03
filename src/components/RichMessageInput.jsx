import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { openPhotoLibrary, compressImage, validateImage } from '../utils/imageUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RichMessageInput = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Message",
  isChannel = true,
  channelName = "general"
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const inputRef = useRef(null);

  // Use simple placeholder
  const dynamicPlaceholder = placeholder;

  const handleSend = () => {
    if ((!message.trim() && selectedImages.length === 0) || disabled) return;

    // Convert images to the format expected by the API
    const attachments = selectedImages.map(img => ({
      uri: img.uri,
      type: img.type || 'image/jpeg',
      name: img.filename || `image-${Date.now()}.jpg`
    }));

    onSendMessage(message.trim(), 'text', attachments);
    setMessage('');
    setSelectedImages([]);
  };

  const handleSelectPhotos = async () => {
    try {
      setIsProcessingImages(true);
      const images = await openPhotoLibrary(5 - selectedImages.length);
      
      if (images.length > 0) {
        // Process and compress images
        const processedImages = [];
        for (const image of images) {
          const validation = validateImage(image);
          if (!validation.valid) {
            Alert.alert('Invalid Image', validation.error);
            continue;
          }
          
          try {
            const compressedImage = await compressImage(image);
            processedImages.push(compressedImage);
          } catch (error) {
            console.error('Error compressing image:', error);
            Alert.alert('Error', 'Failed to process image. Please try again.');
          }
        }
        
        setSelectedImages(prev => [...prev, ...processedImages]);
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    } finally {
      setIsProcessingImages(false);
    }
  };


  const handleVoice = () => {
    Alert.alert('Voice Recording', 'Voice recording coming soon!');
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const canSend = (message.trim().length > 0 || selectedImages.length > 0) && !disabled && !isProcessingImages;

  return (
    <View style={styles.container}>
      {/* Image Preview Strip */}
      {selectedImages.length > 0 && (
        <View style={styles.imagePreviewStrip}>
          {selectedImages.map((image, index) => (
            <View key={index} style={styles.imagePreview}>
              <Image
                source={{ uri: image.uri }}
                style={styles.imageThumbnail}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
        {/* Image Upload Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSelectPhotos}
          disabled={disabled || isProcessingImages}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="image-outline" 
            size={24} 
            color={disabled || isProcessingImages ? "#8E8E93" : "#FFFFFF"} 
          />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder={dynamicPlaceholder}
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={2000}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="default"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          // Auto-expand behavior
          textAlignVertical="top"
          // Android-specific improvements
          underlineColorAndroid="transparent"
          keyboardType="default"
        />

        {/* Voice Button - Disabled for MVP */}
        <TouchableOpacity
          style={[styles.actionButton, styles.disabledButton]}
          onPress={handleVoice}
          disabled={true}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="mic-outline" 
            size={24} 
            color="#8E8E93" 
          />
        </TouchableOpacity>

        {/* Send Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="send" 
            size={22} 
            color={canSend ? "#FFFFFF" : "#8E8E93"} 
          />
        </TouchableOpacity>
      </View>

      {/* Attachment Modal - Removed for MVP */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: SCREEN_WIDTH * 0.001, // 0.5% of screen width (even closer to edges)
    paddingTop: 12,
    paddingBottom: 4, // Reduced bottom padding to bring closer to screen bottom
    // Ensure no extra margins that could cause gaps
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1A1A1A', // Dark grey to match chat theme
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6, // Reduced from 8 to 6 for slightly less height
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Removed border completely
  },
  inputFocused: {
    shadowOpacity: 0.2,
    // Removed border focus since we removed the border
  },
  actionButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  textInput: {
    flex: 1,
    fontSize: 14, // Reduced from 16 for smaller text
    fontFamily: fonts.regular,
    color: '#FFFFFF', // White text for dark background
    maxHeight: 100, // 4 lines max (25px per line)
    minHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  imagePreviewStrip: {
    flexDirection: 'row',
    paddingHorizontal: SCREEN_WIDTH * 0.005, // 0.5% of screen width (matches container)
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  imagePreview: {
    position: 'relative',
    marginRight: 8,
  },
  imageThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
  },
});

export default RichMessageInput;
