import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';

const MessageInput = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type a message...",
  maxLength = 2000
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage('');
  };

  const handleAttachment = () => {
    Alert.alert(
      'Attach File',
      'Choose attachment type',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => console.log('Open camera') },
        { text: 'Photo Library', onPress: () => console.log('Open photo library') },
        { text: 'Document', onPress: () => console.log('Open document picker') },
      ]
    );
  };

  const handleEmoji = () => {
    // TODO: Implement emoji picker
    Alert.alert('Emoji Picker', 'Emoji picker will be implemented soon');
  };

  const handleVoice = () => {
    // TODO: Implement voice message
    Alert.alert('Voice Message', 'Voice messages will be implemented soon');
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
        {/* Attachment Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAttachment}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={24} 
            color={disabled ? colors.gray : colors.primary} 
          />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor={colors.gray}
          multiline
          maxLength={maxLength}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="default"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />

        {/* Emoji Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEmoji}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="happy-outline" 
            size={24} 
            color={disabled ? colors.gray : colors.primary} 
          />
        </TouchableOpacity>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend && styles.sendButtonActive
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={canSend ? colors.white : colors.gray} 
          />
        </TouchableOpacity>
      </View>

      {/* Character Count */}
      {message.length > maxLength * 0.8 && (
        <View style={styles.characterCount}>
          <Text style={[
            styles.characterCountText,
            message.length > maxLength && styles.characterCountWarning
          ]}>
            {message.length}/{maxLength}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowOpacity: 0.2,
  },
  actionButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    maxHeight: 100,
    minHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCountText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  characterCountWarning: {
    color: colors.error,
  },
});

export default MessageInput;
