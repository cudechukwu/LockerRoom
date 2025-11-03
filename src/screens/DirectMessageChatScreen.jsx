import React, { useState, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  ScrollView
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import ScreenBackground from '../components/ScreenBackground';
import RichMessageInput from '../components/RichMessageInput';
import ImageViewer from '../components/ImageViewer';
import { getMessages, sendMessage, deleteMessage, subscribeToMessages, unsubscribe, markMessageAsRead } from '../api/chat';
import { getTeamInfo } from '../api/teamMembers';
import { dataCache, CACHE_KEYS } from '../utils/dataCache';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DirectMessageChatScreen = ({ navigation, route }) => {
  const { channelId, channelName, teamId, isGroup = false } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(true);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isReplyActivated, setIsReplyActivated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);
  const { showToast } = useNotifications();
  const queryClient = useQueryClient();


  useEffect(() => {
    loadMessages();
    getCurrentUser();
  }, [channelId]);

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!channelId || !currentUserId) return;

    console.log('🔔 Setting up realtime subscription for DM channel:', channelId);
    
    const subscription = subscribeToMessages(channelId, (payload) => {
      console.log('📨 Realtime DM message event:', payload.type, payload);
      
      switch (payload.type) {
        case 'INSERT':
          handleNewMessage(payload.new);
          break;
        case 'UPDATE':
          handleMessageUpdate(payload.new);
          break;
        case 'DELETE':
          handleMessageDelete(payload.old);
          break;
        case 'TOMBSTONE':
          handleMessageTombstone(payload.new);
          break;
        case 'REACTION_ADD':
          handleReactionAdd(payload.new);
          break;
        case 'REACTION_REMOVE':
          handleReactionRemove(payload.old);
          break;
        case 'ATTACHMENT_ADDED':
          handleAttachmentAdded(payload.attachment);
          break;
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      console.log('🔕 Cleaning up realtime subscription for DM channel:', channelId);
      if (subscriptionRef.current) {
        unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [channelId, currentUserId]);

  // Track screen focus for notifications
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  // Smart refresh when screen comes into focus - only reload if data is stale
  useFocusEffect(
    React.useCallback(() => {
      if (teamId) {
        // Check if we have cached team data
        const cachedTeamInfo = dataCache.get(CACHE_KEYS.TEAM_INFO(teamId));
        
        if (cachedTeamInfo) {
          console.log('DirectMessageChatScreen - Using cached team data, no reload needed');
          // Use cached data immediately
          setTeamInfo(cachedTeamInfo);
          setTeamLoading(false);
          
          // Refresh in background (silent refresh)
          loadTeamData(true);
        } else {
          console.log('DirectMessageChatScreen - No cached data, loading...');
          loadTeamData();
        }
      }
    }, [teamId])
  );

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id);
  };

  const loadTeamData = async (silentRefresh = false) => {
    try {
      if (!silentRefresh) {
        setTeamLoading(true);
      }
      
      if (teamId) {
        const teamData = await getTeamInfo(teamId);
        
        // Cache the team data
        dataCache.set(CACHE_KEYS.TEAM_INFO(teamId), teamData, 5 * 60 * 1000); // 5 minutes
        
        setTeamInfo(teamData);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      if (!silentRefresh) {
        setTeamLoading(false);
      }
    }
  };

  const loadMessages = async () => {
    try {
      if (!channelId) {
        console.warn('DirectMessageChatScreen: channelId is undefined; skipping loadMessages');
        setMessagesLoading(false);
        return;
      }
      // ✅ WhatsApp-style: Check persistent cache first
      const cachedMessages = dataCache.getMessages(channelId);
      
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('💬 Using PERSISTENT cached messages for DM, instant render');
        // Show cached immediately
        setMessages(cachedMessages);
        setMessagesLoading(false);
        
        // Refresh in background
        const { data, error } = await getMessages(channelId);
        if (error) {
          console.warn('Background refresh failed:', error);
          return;
        }
        
        const messagesWithNames = (data || []).map((message) => {
          const { message_attachments, sender_profile, ...rest } = message;
          return {
            ...rest,
            sender_name: message.sender_id === currentUserId 
              ? 'You' 
              : message.sender_profile?.display_name || 'Unknown User',
            sender_avatar: message.sender_profile?.avatar_url || null,
            attachments: message.message_attachments || []
          };
        });
        
        await dataCache.setMessages(channelId, messagesWithNames);
        setMessages(messagesWithNames);
        return;
      }
      
      setMessagesLoading(true);
      const { data, error } = await getMessages(channelId);
      
      if (error) {
        throw error;
      }
      
      // Use existing currentUserId from state (avoid extra auth call)
      // currentUserId is already set in getCurrentUser()
      
      // Use real sender data from the sender_profile join
      const messagesWithNames = (data || []).map((message) => {
        const { message_attachments, sender_profile, ...rest } = message;
        return {
          ...rest,
          sender_name: message.sender_id === currentUserId 
            ? 'You' 
            : message.sender_profile?.display_name || 'Unknown User',
          sender_avatar: message.sender_profile?.avatar_url || null,
          // Map message_attachments to attachments for component compatibility
          attachments: message.message_attachments || []
        };
      });
      
      // ✅ WhatsApp-style: Persist to AsyncStorage
      await dataCache.setMessages(channelId, messagesWithNames);
      
      console.log('💬 Messages loaded for DM:', channelId, messagesWithNames?.length || 0);
      setMessages(messagesWithNames);
    } catch (err) {
      console.error('Error loading messages:', err);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (content, messageType = 'text', attachments = []) => {
    if (!content.trim() && attachments.length === 0) return;

    try {
      // Get current user ID to identify sent messages
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Add optimistic message with isUploading flag
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        content: content.trim(),
        sender_id: currentUserId,
        sender_name: 'You',
        isCurrentUser: true,
        message_type: messageType,
        reply_to_message_id: replyToMessage?.id || null,
        created_at: new Date().toISOString(),
        attachments: attachments.map(att => ({ uri: att.uri, isUploading: true })),
        isUploading: attachments.length > 0
      };
      
      setMessages(prev => [...prev, optimisticMessage]);

      const { data, error } = await sendMessage(
        channelId, 
        {
          content: content.trim(),
          message_type: messageType,
          reply_to_message_id: replyToMessage?.id || null
        },
        attachments  // Pass attachments separately
      );

      console.log('📤 sendMessage result:', { data, error });

      if (error) {
        console.error('❌ sendMessage error:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw error;
      }

      if (!data) {
        console.error('❌ sendMessage returned no data');
        setMessages(prev => prev.filter(m => m.id !== tempId));
        return;
      }

      // Replace optimistic message with real message
      // Preserve attachments from optimistic message
      setMessages(prev => {
        const updated = prev.map(m => 
          m.id === tempId 
            ? {
                ...data,
                content: content.trim(), // Preserve content
                sender_id: currentUserId,
                sender_name: 'You',
                isCurrentUser: true,
                reply_to_message_id: replyToMessage?.id || null,
                attachments: m.attachments || [] // Preserve attachments
              }
            : m
        );
        
        // ✅ Persist to AsyncStorage for WhatsApp-style persistence
        dataCache.setMessages(channelId, updated).catch(err => {
          console.warn('Failed to persist messages:', err);
        });
        
        return updated;
      });
      
      // Mark the sent message as read (we just saw it)
      if (data?.id) {
        await markMessageAsRead(data.id);
      }

      // Optimistically add/update this DM in the All conversations cache
      try {
        if (teamId && currentUserId) {
          const key = queryKeys.teamConversations(teamId, currentUserId);
          queryClient.setQueryData(key, (existing) => {
            if (!existing) return existing;
            const convs = existing.allConversations ? [...existing.allConversations] : [];
            const idx = convs.findIndex(c => c.id === channelId);
            const nowIso = new Date().toISOString();
            const optimisticConv = {
              id: channelId,
              name: channelName,
              description: null,
              type: 'dm',
              is_private: true,
              is_announcements: false,
              image_url: null,
              visibility: 'hidden',
              created_at: nowIso,
              updated_at: nowIso,
              icon_name: 'person',
              unread_count: 0,
              last_message_time: nowIso,
            };
            if (idx >= 0) {
              // Update timestamp and move to top
              const updated = { ...convs[idx], last_message_time: nowIso, updated_at: nowIso };
              convs.splice(idx, 1);
              convs.unshift(updated);
            } else {
              convs.unshift(optimisticConv);
            }
            return { ...existing, allConversations: convs };
          });
        }
      } catch (e) {
        console.warn('Failed to optimistically add DM to conversations:', e);
      }
      
      // Clear reply state after sending
      setReplyToMessage(null);
      setIsReplyActivated(false);
      
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Realtime message handlers
  const handleNewMessage = async (newMessage) => {
    // Guard against ghost events from other channels
    if (newMessage.channel_id !== channelId) return;
    
    // Don't show our own messages as new (they're already added optimistically)
    if (newMessage.sender_id === currentUserId) {
      return;
    }

    // Fetch sender profile if not included in realtime payload
    let senderName = 'Loading...';
    let senderAvatar = null;
    
    if (newMessage.sender_profile?.display_name) {
      senderName = newMessage.sender_profile.display_name;
      senderAvatar = newMessage.sender_profile.avatar_url;
    } else {
      // Fallback: fetch sender profile
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('user_id', newMessage.sender_id)
          .single();
        
        senderName = profile?.display_name || 'Unknown User';
        senderAvatar = profile?.avatar_url || null;
      } catch (err) {
        console.warn('Could not fetch sender profile:', err);
      }
    }

    // Fetch attachments for this message
    let attachments = [];
    try {
      const { data: attachmentData } = await supabase
        .from('message_attachments')
        .select('id, filename, file_type, file_size, s3_url, thumbnail_url')
        .eq('message_id', newMessage.id);
      
      if (attachmentData && attachmentData.length > 0) {
        attachments = attachmentData.map(att => ({
          s3_url: att.s3_url,
          thumbnail_url: att.thumbnail_url,
          file_type: att.file_type,
          filename: att.filename
        }));
        console.log('📎 Fetched attachments for DM message:', newMessage.id, attachments.length);
      }
    } catch (err) {
      console.warn('Could not fetch attachments:', err);
    }

    const messageWithSender = {
      ...newMessage,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      attachments: attachments
    };

    setMessages(prev => [...prev, messageWithSender]);

    // If we're focused on this thread, mark it as read immediately
    if (isScreenFocused && newMessage?.id) {
      markMessageAsRead(newMessage.id);
    }

    // Show toast notification if screen is not focused
    if (!isScreenFocused) {
      showToast({
        message: newMessage.content,
        senderName: messageWithSender.sender_name,
        channelName: channelName,
        channelId: channelId
      });
    }
  };

  const handleMessageUpdate = (updatedMessage) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === updatedMessage.id 
          ? { ...msg, ...updatedMessage }
          : msg
      )
    );
  };

  const handleMessageDelete = (deletedMessage) => {
    setMessages(prev => 
      prev.filter(msg => msg.id !== deletedMessage.id)
    );
  };

  const handleMessageTombstone = (tombstone) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === tombstone.message_id 
          ? { ...msg, isDeleted: true, tombstoneText: tombstone.tombstone_text }
          : msg
      )
    );
  };

  const handleReactionAdd = (reaction) => {
    setMessages(prev => 
      prev.map(msg => {
        if (msg.id === reaction.message_id) {
          const existingReactions = msg.reactions || [];
          const newReactions = [...existingReactions, reaction];
          return { ...msg, reactions: newReactions };
        }
        return msg;
      })
    );
  };

  const handleReactionRemove = (reaction) => {
    setMessages(prev => 
      prev.map(msg => {
        if (msg.id === reaction.message_id) {
          const existingReactions = msg.reactions || [];
          const newReactions = existingReactions.filter(r => 
            !(r.user_id === reaction.user_id && r.emoji === reaction.emoji)
          );
          return { ...msg, reactions: newReactions };
        }
        return msg;
      })
    );
  };

  const handleAttachmentAdded = (attachment) => {
    // Update the message with the new attachment
    setMessages(prev => 
      prev.map(msg => {
        if (msg.id === attachment.message_id) {
          const existingAttachments = msg.attachments || [];
          return { ...msg, attachments: [...existingAttachments, attachment] };
        }
        return msg;
      })
    );
  };

  const clearReply = () => {
    setReplyToMessage(null);
    setIsReplyActivated(false);
  };

  const scrollToParentMessage = (parentMessageId) => {
    const parentIndex = messages.findIndex(msg => msg.id === parentMessageId);
    if (parentIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: parentIndex, animated: true });
    }
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from local state immediately for better UX
              setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
              
              // Call API to delete message from server
              const { error } = await deleteMessage(messageId, 'sender');
              
              if (error) {
                console.error('Error deleting message:', error);
                // Revert the local state change if server deletion fails
                loadMessages();
                Alert.alert('Error', 'Failed to delete message. Please try again.');
              } else {
                console.log('Message deleted successfully:', messageId);
              }
            } catch (error) {
              console.error('Error deleting message:', error);
              // Revert the local state change if server deletion fails
              loadMessages();
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDownloadImage = (imageUri) => {
    Alert.alert(
      'Download Image',
      'Image download functionality will be implemented when we integrate with the main chat system.',
      [{ text: 'OK' }]
    );
  };

  const AnimatedMessage = ({ item, showProfilePicture = false }) => {
    const translateX = useSharedValue(0);
    const replyIconOpacity = useSharedValue(0);
    const [hasActivated, setHasActivated] = useState(false);

    const gestureHandler = {
      onStart: (_, context) => {
        context.startX = translateX.value;
      },
      onActive: (event, context) => {
        const { translationX, translationY } = event;
        
        // Only activate if horizontal movement is greater than vertical
        if (Math.abs(translationX) > Math.abs(translationY)) {
          const newTranslateX = Math.max(0, translationX);
          translateX.value = newTranslateX;
          
          // Show reply icon at threshold
          if (newTranslateX > 28 && !hasActivated) {
            replyIconOpacity.value = withTiming(1, { duration: 200 });
            runOnJS(setHasActivated)(true);
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          } else if (newTranslateX <= 28 && hasActivated) {
            replyIconOpacity.value = withTiming(0, { duration: 200 });
            runOnJS(setHasActivated)(false);
          }
        }
      },
      onEnd: (event) => {
        const { translationX } = event;
        
        if (translationX > 28) {
          // Activate reply
          runOnJS(setReplyToMessage)(item);
          runOnJS(setIsReplyActivated)(true);
        }
        
        // Snap back to original position
        translateX.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
        
        // Hide reply icon
        replyIconOpacity.value = withTiming(0, { duration: 200 });
        runOnJS(setHasActivated)(false);
      },
    };

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
      };
    });

    const replyIconStyle = useAnimatedStyle(() => {
      return {
        opacity: replyIconOpacity.value,
      };
    });

    const parentMessage = item.reply_to_message_id ? 
      messages.find(msg => msg.id === item.reply_to_message_id) : null;

    return (
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={10}
        failOffsetY={[-5, 5]}
      >
        <Animated.View style={[styles.messageWrapper, animatedStyle]}>
          {/* Reply header if this is a reply */}
          {parentMessage && (
            <TouchableOpacity 
              style={styles.replyHeader}
              onPress={() => scrollToParentMessage(parentMessage.id)}
              activeOpacity={0.7}
            >
              <View style={styles.replyIndicator} />
              <View style={styles.replyContent}>
                <Text style={styles.replySenderName}>{parentMessage.sender_name}</Text>
                <Text style={styles.replyText} numberOfLines={2}>
                  {parentMessage.content || (parentMessage.attachments?.length > 0 ? '📷 Media' : 'Message')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Sender name above message */}
          {item.sender_id !== currentUserId && !item.isCurrentUser && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          
          {/* Message content with optional profile picture */}
          <View style={[
            styles.messageContainer,
            (item.sender_id === currentUserId || item.isCurrentUser) ? styles.currentUserContainer : styles.otherUserContainer
          ]}>
            {/* Profile picture for received messages */}
            {showProfilePicture && item.sender_id !== currentUserId && !item.isCurrentUser && (
              <Image 
                source={(() => {
                  // Smart logo display: Only show LockerRoom logo if team has never uploaded a logo
                  if (teamLoading && !teamInfo) {
                    // Still loading initial data - show LockerRoom logo as placeholder
                    return require('../../assets/LockerRoom.png');
                  }
                  
                  if (teamInfo?.logo_url) {
                    // Team has a logo - show it with cache busting
                    return { uri: `${teamInfo.logo_url}?t=${Date.now()}` };
                  }
                  
                  if (teamInfo && !teamInfo.logo_url) {
                    // Team data loaded but no logo set - show LockerRoom logo
                    return require('../../assets/LockerRoom.png');
                  }
                  
                  // Fallback case
                  return require('../../assets/LockerRoom.png');
                })()} 
                style={styles.senderProfilePicture} 
              />
            )}
            
            {/* Text content in bubble */}
            {item.content && (
              <View style={[
                styles.messageBubble,
                (item.sender_id === currentUserId || item.isCurrentUser) ? styles.currentUserMessage : styles.otherUserMessage
              ]}>
                <Text style={[
                  styles.messageText,
                  (item.sender_id === currentUserId || item.isCurrentUser) ? styles.currentUserText : styles.otherUserText
                ]}>
                  {item.content}
                </Text>
                <View style={styles.messageTimeContainer}>
                  <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {/* Delete icon for sent messages */}
                  {(item.sender_id === currentUserId || item.isCurrentUser) && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteMessage(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={12} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
          
          {/* Images in dedicated media bubble */}
          {item.attachments && item.attachments.length > 0 && (
            <View style={[
              styles.mediaBubble,
              (item.sender_id === currentUserId || item.isCurrentUser) ? styles.currentUserMedia : styles.otherUserMedia
            ]}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imageScrollView}
              >
                {item.attachments.map((attachment, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.messageImageContainer}
                    onPress={() => {
                      setSelectedImageUri(attachment.s3_url || attachment.thumbnail_url || attachment.uri);
                      setShowImageViewer(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: attachment.s3_url || attachment.thumbnail_url || attachment.uri }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <Ionicons name="expand-outline" size={16} color={colors.white} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[
                styles.mediaTime,
                (item.sender_id === currentUserId || item.isCurrentUser) ? styles.currentUserMediaTime : styles.otherUserMediaTime
              ]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          
          {/* Reply icon that appears during swipe */}
          <Animated.View style={[styles.replyIcon, replyIconStyle]}>
            <Ionicons name="arrow-undo" size={16} color={colors.primary} />
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const renderMessage = ({ item, index }) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showProfilePicture = item.sender_id !== currentUserId && !item.isCurrentUser && 
      (!previousMessage || previousMessage.sender_id !== item.sender_id);
    
    return <AnimatedMessage item={item} showProfilePicture={showProfilePicture} />;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color="#3A3A3E" />
      </TouchableOpacity>
      
      <Image 
        source={(() => {
          // Smart logo display: Only show LockerRoom logo if team has never uploaded a logo
          if (teamLoading && !teamInfo) {
            // Still loading initial data - show LockerRoom logo as placeholder
            return require('../../assets/LockerRoom.png');
          }
          
          if (teamInfo?.logo_url) {
            // Team has a logo - show it with cache busting
            return { uri: `${teamInfo.logo_url}?t=${Date.now()}` };
          }
          
          if (teamInfo && !teamInfo.logo_url) {
            // Team data loaded but no logo set - show LockerRoom logo
            return require('../../assets/LockerRoom.png');
          }
          
          // Fallback case
          return require('../../assets/LockerRoom.png');
        })()} 
        style={styles.teamLogo} 
      />
      
      <TouchableOpacity 
        style={styles.headerCenter}
        onPress={() => navigation.navigate('ConversationInfo', { 
          conversationId: channelId,
          conversationType: isGroup ? 'group_dm' : 'dm',
          channelName: channelName,
          teamId: teamId
        })}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>
          {isGroup ? `#${channelName}` : `@${channelName}`}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => {/* Future: Toggle conversation settings */}}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="grid" 
          size={20} 
          color="#3A3A3E" 
        />
      </TouchableOpacity>
    </View>
  );

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
          onPress={clearReply}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderInputArea = () => (
    <View style={styles.inputArea}>
      {renderReplyPill()}
      
      <RichMessageInput
        onSendMessage={handleSendMessage}
        disabled={messagesLoading}
        isChannel={false}
        channelName={channelName}
        placeholder={isGroup ? `Message ${channelName}` : `Message @${channelName}`}
      />
    </View>
  );

  if (messagesLoading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}
        
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            inverted={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            onScrollToIndexFailed={(info) => {
              // Handle scroll to index failure gracefully
              console.log('Scroll to index failed:', info);
            }}
          />
        </View>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={styles.keyboardAvoidingView}
        >
          {renderInputArea()}
        </KeyboardAvoidingView>

        {/* Image Viewer Modal */}
        <ImageViewer
          visible={showImageViewer}
          imageUri={selectedImageUri}
          onClose={() => {
            setShowImageViewer(false);
            setSelectedImageUri(null);
          }}
          onDownload={handleDownloadImage}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.2,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  titleTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
  },
  headerSubtitle: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F',
    marginTop: 2,
  },
  toggleButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 80, // Extra padding for composer height
  },
  messageWrapper: {
    marginVertical: 4, // Reduced from 4 to minimize gaps
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  senderProfilePicture: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 2,
  },
  senderName: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: '#5A5A5F',
    marginBottom: 4,
    marginLeft: 40, // Align with the start of the message bubble (profile picture width + margin)
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 18,
  },
  currentUserMessage: {
    backgroundColor: '#333333',
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    backgroundColor: colors.lightGray,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  currentUserText: {
    color: colors.white,
  },
  otherUserText: {
    color: '#0A0A0F',
  },
  // Dedicated media bubble styles - no background, minimal padding
  mediaBubble: {
    maxWidth: '85%',
    marginTop: 4, // Small gap from text message if both exist
  },
  currentUserMedia: {
    alignSelf: 'flex-end',
  },
  otherUserMedia: {
    alignSelf: 'flex-start',
  },
  imageScrollView: {
    // Remove maxHeight to let it size naturally
    flexGrow: 0, // Don't expand beyond content
    flexShrink: 0, // Don't shrink
  },
  messageImageContainer: {
    position: 'relative',
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
    // Ensure no extra spacing
    marginTop: 0,
    marginBottom: 0,
  },
  messageImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginTop: 4,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  deleteButton: {
    marginLeft: 6,
    padding: 2,
  },
  mediaTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginTop: 4, // Small gap from images
  },
  currentUserMediaTime: {
    alignSelf: 'flex-end',
  },
  otherUserMediaTime: {
    alignSelf: 'flex-start',
  },
  keyboardAvoidingView: {
    // Ensure proper behavior on both platforms
  },
  inputArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // Remove any extra margins/padding that could cause gaps
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginTop: 16,
  },
  // Reply functionality styles
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  replyIndicator: {
    width: 3,
    backgroundColor: '#0A0A0F',
    borderRadius: 1.5,
    marginRight: 8,
    marginTop: 2,
  },
  replyContent: {
    flex: 1,
  },
  replySenderName: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: '#0A0A0F',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: '#0A0A0F',
    lineHeight: 16,
  },
  replyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E9E9E9',
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
    color: colors.primary,
    marginBottom: 2,
  },
  replyPillMessage: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
  },
  replyPillClose: {
    padding: 4,
    marginLeft: 8,
  },
  replyIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default DirectMessageChatScreen;
