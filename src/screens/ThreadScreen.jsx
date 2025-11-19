import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { COLORS } from '../constants/colors';
import ScreenBackground from '../components/ScreenBackground';
import RichMessageInput from '../components/RichMessageInput';
import { useThreadMessages } from '../hooks/useThreadMessages';
import { sendMessage, subscribeToMessages, unsubscribe } from '../api/chat';
import { useAuthTeam } from '../hooks/useAuthTeam';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ThreadScreen = ({ navigation, route }) => {
  const { parentMessageId, channelId, channelName, teamId } = route.params;
  
  const { data: authData } = useAuthTeam();
  const currentUserId = authData?.userId;
  
  const { data: threadData, isLoading, refetch } = useThreadMessages(parentMessageId);
  const parentMessage = threadData?.parent;
  const replies = threadData?.replies || [];
  
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isReplyActivated, setIsReplyActivated] = useState(false);
  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Set up realtime subscription for thread replies
  useEffect(() => {
    if (!channelId || !currentUserId || !parentMessageId) return;

    console.log('🔔 Setting up realtime subscription for thread:', parentMessageId);
    
    subscriptionRef.current = subscribeToMessages(channelId, (payload) => {
      console.log('📨 Thread realtime event:', payload.type, payload);
      
      if (payload.type === 'INSERT') {
        const newMessage = payload.new;
        // Only handle replies to this parent message
        if (newMessage.parent_message_id === parentMessageId) {
          console.log('💬 New reply in thread:', newMessage.id);
          // Refetch to get updated thread data
          refetch();
        }
      } else if (payload.type === 'UPDATE') {
        const updatedMessage = payload.new;
        // Update parent metadata if it's the parent message
        if (updatedMessage.id === parentMessageId) {
          console.log('💬 Parent message updated:', updatedMessage.id);
          refetch();
        }
      }
    });

    return () => {
      if (subscriptionRef.current) {
        console.log('🔕 Unsubscribing from thread realtime');
        unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [channelId, currentUserId, parentMessageId, refetch]);

  // Scroll to bottom when new replies arrive
  useEffect(() => {
    if (replies.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [replies.length]);

  const handleSendMessage = async (content, messageType = 'text', attachments = []) => {
    if (!content.trim() && attachments.length === 0) return;

    try {
      const { data, error } = await sendMessage(
        channelId,
        {
          content: content.trim(),
          message_type: messageType,
          parent_message_id: parentMessageId,
        },
        attachments
      );

      if (error) {
        throw error;
      }

      // Refetch thread messages to get updated list
      refetch();
      setReplyToMessage(null);
      setIsReplyActivated(false);
    } catch (err) {
      console.error('Error sending reply:', err);
      Alert.alert('Error', 'Failed to send reply. Please try again.');
    }
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  const scrollToNewest = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderParentMessage = () => {
    if (!parentMessage) return null;

    const isCurrentUser = parentMessage.sender_id === currentUserId;

    return (
      <View style={styles.parentMessageContainer}>
        <View style={styles.parentMessageHeader}>
          <Ionicons name="chatbubbles" size={16} color="#999" />
          <Text style={styles.parentMessageHeaderText}>Thread</Text>
        </View>
        <View
          style={[
            styles.parentMessageBubble,
            isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          ]}
        >
          {!isCurrentUser && (
            <Text style={styles.senderName}>{parentMessage.sender_name || 'Unknown'}</Text>
          )}
          {parentMessage.content && (
            <Text
              style={[
                styles.messageText,
                isCurrentUser ? styles.currentUserText : styles.otherUserText,
              ]}
            >
              {parentMessage.content}
            </Text>
          )}
          {parentMessage.attachments && parentMessage.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {parentMessage.attachments.map((att, idx) => {
                const imageUri = att.s3_url || att.thumbnail_url || att.uri;
                if (!imageUri) return null;
                return (
                  <Image key={idx} source={{ uri: imageUri }} style={styles.attachmentImage} />
                );
              })}
            </View>
          )}
          <Text style={styles.messageTime}>
            {new Date(parentMessage.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderReply = ({ item, index }) => {
    const isCurrentUser = item.sender_id === currentUserId;
    const previousReply = index > 0 ? replies[index - 1] : null;
    const showAvatar = !isCurrentUser && (!previousReply || previousReply.sender_id !== item.sender_id);

    return (
      <View style={styles.replyWrapper}>
        {showAvatar && (
          <View style={styles.avatarContainer}>
            {item.sender_avatar ? (
              <Image source={{ uri: item.sender_avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={16} color="#666" />
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.replyBubble,
            isCurrentUser ? styles.currentUserReply : styles.otherUserReply,
            !showAvatar && styles.replyBubbleNoAvatar,
          ]}
        >
          {!isCurrentUser && showAvatar && (
            <Text style={styles.replySenderName}>{item.sender_name || 'Unknown'}</Text>
          )}
          {item.content && (
            <Text
              style={[
                styles.replyText,
                isCurrentUser ? styles.currentUserReplyText : styles.otherUserReplyText,
              ]}
            >
              {item.content}
            </Text>
          )}
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {item.attachments.map((att, idx) => {
                const imageUri = att.s3_url || att.thumbnail_url || att.uri;
                if (!imageUri) return null;
                return (
                  <Image key={idx} source={{ uri: imageUri }} style={styles.attachmentImage} />
                );
              })}
            </View>
          )}
          <Text style={styles.replyTime}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const renderReplyPill = () => {
    if (!replyToMessage) return null;
    
    return (
      <View style={styles.replyPill}>
        <View style={styles.replyPillContent}>
          <View style={styles.replyPillIndicator} />
          <View style={styles.replyPillText}>
            <Text style={styles.replyPillSender}>{replyToMessage.sender_name}</Text>
            <Text style={styles.replyPillMessage} numberOfLines={1}>
              {replyToMessage.content || (replyToMessage.attachments?.length > 0 ? '📷 Media' : 'Message')}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.replyPillClose}
          onPress={() => {
            setReplyToMessage(null);
            setIsReplyActivated(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color="#CCCCCC" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Thread</Text>
        <Text style={styles.headerSubtitle}>
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </Text>
      </View>
    </View>
  );

  const renderInputArea = () => (
    <View style={styles.inputArea}>
      {renderReplyPill()}
      <RichMessageInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        isChannel={true}
        channelName={channelName}
        placeholder="Reply in thread"
      />
    </View>
  );

  if (isLoading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading thread...</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (!parentMessage) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Thread not found</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={replies}
            renderItem={renderReply}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderParentMessage}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
          
          {/* Scroll to newest FAB */}
          {replies.length > 3 && (
            <TouchableOpacity
              style={styles.scrollToNewestFab}
              onPress={scrollToNewest}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {renderInputArea()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#999',
    marginTop: 2,
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  parentMessageContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  parentMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  parentMessageHeaderText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  parentMessageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  currentUserMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    backgroundColor: '#1A1A1A',
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  attachmentsContainer: {
    marginTop: 8,
    gap: 8,
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  replyWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 40, // Indent replies
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyBubble: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    maxWidth: '85%',
  },
  replyBubbleNoAvatar: {
    marginLeft: 36, // Align with avatar space
  },
  currentUserReply: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  otherUserReply: {
    backgroundColor: '#1A1A1A',
    alignSelf: 'flex-start',
  },
  replySenderName: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  replyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  currentUserReplyText: {
    color: '#FFFFFF',
  },
  otherUserReplyText: {
    color: '#FFFFFF',
  },
  replyTime: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  inputArea: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  replyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  replyPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  replyPillIndicator: {
    width: 3,
    height: 20,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyPillText: {
    flex: 1,
  },
  replyPillSender: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  replyPillMessage: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#8E8E93',
  },
  replyPillClose: {
    padding: 4,
    marginLeft: 8,
  },
  scrollToNewestFab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#8E8E93',
  },
});

export default ThreadScreen;

