import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const MessageActionSheet = ({ visible, onClose, message, currentUserId, onEdit, onDelete, onReaction, position = {} }) => {
  const isCurrentUser = message?.sender_id === currentUserId;
  
  // Check if message can be edited (within 15 min window) - memoized for performance
  const canEdit = useMemo(() => {
    if (!message?.created_at) return false;
    const editWindow = new Date(message.created_at);
    editWindow.setMinutes(editWindow.getMinutes() + 15);
    return isCurrentUser && new Date() < editWindow;
  }, [message?.created_at, isCurrentUser]);

  const handleEdit = () => {
    onClose();
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = () => {
    onClose();
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(message.id);
            }
          }
        }
      ]
    );
  };

  const handleReaction = (emoji) => {
    Haptics.selectionAsync();
    onClose();
    if (onReaction) {
      onReaction(message.id, emoji);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Quick Reactions Bar */}
              <View style={styles.reactionsBar}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionButton}
                    onPress={() => handleReaction(emoji)}
                    accessibilityLabel={`React with ${emoji}`}
                    testID={`reaction-${emoji}`}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                {canEdit && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleEdit}
                    accessibilityLabel="Edit message"
                    testID="edit-message-button"
                  >
                    <Ionicons name="pencil" size={20} color={COLORS.TEXT_PRIMARY} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                )}

                {isCurrentUser && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleDelete}
                    accessibilityLabel="Delete message"
                    testID="delete-message-button"
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <Text style={[styles.actionText, { color: '#FF3B30' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                accessibilityLabel="Cancel"
                testID="cancel-button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  reactionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
  },
  reactionButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 32,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND_MUTED,
    paddingBottom: 12,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  actionText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.TEXT_PRIMARY,
  },
  cancelButton: {
    marginTop: 20,
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 12,
  },
  cancelText: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
});

export default MessageActionSheet;