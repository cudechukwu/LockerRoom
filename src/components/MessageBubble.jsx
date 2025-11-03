import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';

const MessageBubble = ({ message, showAvatar = true, onReaction }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'announcement':
        return colors.warning;
      case 'priority_alert':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'announcement':
        return 'megaphone';
      case 'priority_alert':
        return 'warning';
      default:
        return null;
    }
  };

  const handleLongPress = () => {
    setShowReactions(!showReactions);
  };

  const handleReactionPress = (emoji) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowReactions(false);
  };

  const handleEdit = () => {
    // TODO: Implement message editing
    Alert.alert('Edit Message', 'Message editing will be implemented soon');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement message deletion
            console.log('Delete message:', message.id);
          }
        }
      ]
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    return (
      <View style={styles.reactionsContainer}>
        {message.reactions.map((reaction, index) => (
          <TouchableOpacity
            key={index}
            style={styles.reaction}
            onPress={() => handleReactionPress(reaction.emoji)}
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={styles.reactionCount}>1</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReactionPicker = () => {
    if (!showReactions) return null;

    const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    return (
      <View style={styles.reactionPicker}>
        {commonReactions.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            style={styles.reactionButton}
            onPress={() => handleReactionPress(emoji)}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAttachments = () => {
    if (!message.message_attachments || message.message_attachments.length === 0) {
      return null;
    }

    return (
      <View style={styles.attachmentsContainer}>
        {message.message_attachments.map((attachment, index) => (
          <TouchableOpacity key={index} style={styles.attachment}>
            <Ionicons 
              name={attachment.file_type === 'image' ? 'image' : 'document'} 
              size={16} 
              color={colors.primary} 
            />
            <Text style={styles.attachmentText} numberOfLines={1}>
              {attachment.filename}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.messageContainer,
          isPressed && styles.messagePressed
        ]}
        onPress={() => setIsPressed(false)}
        onLongPress={handleLongPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        {showAvatar && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {message.sender_name ? message.sender_name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.messageContent}>
          {showAvatar && (
            <View style={styles.messageHeader}>
              <Text style={styles.senderName}>
                {message.sender_name || 'Unknown User'}
              </Text>
              <Text style={styles.timestamp}>
                {formatTime(message.created_at)}
              </Text>
            </View>
          )}

          <View style={styles.messageBubble}>
            {message.message_type !== 'text' && (
              <View style={styles.messageTypeIndicator}>
                <Ionicons
                  name={getMessageTypeIcon(message.message_type)}
                  size={14}
                  color={getMessageTypeColor(message.message_type)}
                />
                <Text style={[
                  styles.messageTypeText,
                  { color: getMessageTypeColor(message.message_type) }
                ]}>
                  {message.message_type.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={styles.messageText}>
              {message.content}
            </Text>

            {message.is_edited && (
              <Text style={styles.editedIndicator}>
                (edited)
              </Text>
            )}

            {renderAttachments()}
            {renderReactions()}
          </View>
        </View>
      </Pressable>

      {renderReactionPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  messageContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messagePressed: {
    backgroundColor: colors.lightGray,
  },
  avatarContainer: {
    marginRight: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  messageBubble: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageTypeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    marginLeft: 4,
  },
  messageText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 22,
  },
  editedIndicator: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
    fontStyle: 'italic',
    marginTop: 4,
  },
  attachmentsContainer: {
    marginTop: 8,
    gap: 8,
  },
  imageAttachment: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.lightGray,
  },
  attachmentImage: {
    width: 240,
    height: 180,
    borderRadius: 12,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginLeft: 4,
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 4,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  reactionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default MessageBubble;
