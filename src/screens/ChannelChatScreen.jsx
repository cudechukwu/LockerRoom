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
  TouchableWithoutFeedback,
  Dimensions,
  Image,
  ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { COLORS } from '../constants/colors';
import ScreenBackground from '../components/ScreenBackground';
import RichMessageInput from '../components/RichMessageInput';
import ImageViewer from '../components/ImageViewer';
import ReactionBar from '../components/ReactionBar';
import { getMessages, sendMessage, deleteMessage, subscribeToMessages, unsubscribe, markMessageAsRead, editMessage, toggleReaction, addReaction, removeReaction, getChannel } from '../api/chat';
import { getTeamInfo } from '../api/teamMembers';
import { dataCache, CACHE_KEYS } from '../utils/dataCache';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuthTeam } from '../hooks/useAuthTeam';
import { getUserProfile } from '../api/profiles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Get channel icon based on name and type
const getChannelIcon = (type, name) => {
  const nameLower = name ? name.toLowerCase() : '';
  
  // Check for specific channel names first
  if (nameLower.includes('announcement')) return 'megaphone';
  if (nameLower.includes('general')) return 'chatbubbles';
  if (nameLower.includes('offense')) return 'football';
  if (nameLower.includes('defense')) return 'shield';
  if (nameLower.includes('special')) return 'flash';
  if (nameLower.includes('coach')) return 'school';
  if (nameLower.includes('trainer')) return 'fitness';
  if (nameLower.includes('training')) return 'fitness';
  
  // Then check by type
  switch (type) {
    case 'team':
      return 'people';
    case 'announcements':
      return 'megaphone';
    case 'position':
      return 'football';
    case 'coach':
      return 'school';
    case 'trainer':
      return 'fitness';
    case 'casual':
      return 'chatbubbles';
    default:
      return 'chatbubbles';
  }
};

const ChannelChatScreen = ({ navigation, route }) => {
  const { channelId, channelName, teamId } = route.params;
  
  // Get user ID from global cache (10-minute TTL, no redundant calls)
  const { data: authData } = useAuthTeam();
  const currentUserId = authData?.userId;
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(true);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isReplyActivated, setIsReplyActivated] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [channelDetails, setChannelDetails] = useState(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [reactionBarVisible, setReactionBarVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [reactionBarAnchor, setReactionBarAnchor] = useState({ x: 0, y: 0, messageId: null });
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const actionSheetOpacity = useSharedValue(0);
  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);
  const firstLoadRef = useRef(true);
  const reactionBatchRef = useRef([]);
  const reactionTimeoutRef = useRef(null);
  const { showToast } = useNotifications();


  // Load channel details (for image_url) with caching
  useEffect(() => {
    const loadChannelDetails = async () => {
      try {
        // Check cache first
        const cacheKey = `channel_details_${channelId}`;
        const cachedDetails = dataCache.get(cacheKey);
        
        if (cachedDetails) {
          setChannelDetails(cachedDetails);
          // Refresh in background
          const { data, error } = await getChannel(channelId);
          if (!error && data) {
            dataCache.set(cacheKey, data, 5 * 60 * 1000);
            setChannelDetails(data);
          }
        } else {
          const { data, error } = await getChannel(channelId);
          if (error) {
            console.warn('Error loading channel details:', error);
            return;
          }
          if (data) {
            dataCache.set(cacheKey, data, 5 * 60 * 1000);
            setChannelDetails(data);
          }
        }
      } catch (err) {
        console.warn('Error loading channel details:', err);
      }
    };
    
    loadChannelDetails();
    
    // Listen for when screen comes into focus to refresh if cache was invalidated
    return () => {
      // Cleanup
    };
  }, [channelId]);

  useEffect(() => {
    if (!currentUserId) return; // Wait for user ID to load from cache
    
    // Check persistent cache IMMEDIATELY on mount (WhatsApp-style)
    if (firstLoadRef.current) {
      const cachedMessages = dataCache.getMessages(channelId);
      
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('💬 Found PERSISTENT messages, instant WhatsApp-style render');
        // Normalize and show immediately
        const normalizeMessages = (msgs) => {
          if (!msgs) return [];
          return msgs.map((message) => {
            const { message_attachments, sender_profile, ...rest } = message;
            
            // Cache user profile for future lookups (async but won't block)
            if (sender_profile) {
              dataCache.setUserProfile(message.sender_id, sender_profile).catch(err => {
                // Silent fail - not critical
              });
            }
            
            // ✅ BAKED-IN NAMES: Persist name directly into message cache
            const bakedName = message.sender_id === currentUserId 
              ? 'You' 
              : sender_profile?.display_name || message.sender_name || 'Unknown User';
            
            const bakedAvatar = sender_profile?.avatar_url || message.sender_avatar || null;
            
            return {
              ...rest,
              sender_id: String(message.sender_id),
              sender_name: bakedName, // Baked in - will persist to AsyncStorage
              sender_avatar: bakedAvatar, // Baked in - will persist to AsyncStorage
              sender_profile: sender_profile, // Keep for future hydration
              isCurrentUser: message.sender_id === currentUserId,
              attachments: message.message_attachments || []
            };
          });
        };
        
        setMessages(normalizeMessages(cachedMessages));
        setMessagesLoading(false);
      }
      
      firstLoadRef.current = false;
      loadMessages(); // This will refresh in background
    } else {
      loadMessages(true); // background refresh only
    }
  }, [channelId, currentUserId]);

  // Reset firstLoadRef when channelId changes
  useEffect(() => {
    firstLoadRef.current = true;
  }, [channelId]);

  // Load current user's avatar for optimistic messages
  useEffect(() => {
    const loadUserAvatar = async () => {
      if (!currentUserId) return;
      
      // Try cache first
      const cachedProfile = await dataCache.getUserProfile(currentUserId);
      if (cachedProfile?.avatar_url) {
        setCurrentUserAvatar(cachedProfile.avatar_url);
        return;
      }
      
      // Fetch if not in cache
      const { data: profile } = await getUserProfile(currentUserId);
      if (profile?.avatar_url) {
        setCurrentUserAvatar(profile.avatar_url);
        // Cache it
        await dataCache.setUserProfile(currentUserId, profile);
      }
    };
    
    loadUserAvatar();
  }, [currentUserId]);

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!channelId || !currentUserId) return;

    console.log('🔔 Setting up realtime subscription for channel:', channelId);
    
    const subscription = subscribeToMessages(channelId, (payload) => {
      console.log('📨 Realtime message event:', payload.type, payload);
      
      switch (payload.type) {
        case 'INSERT':
          requestAnimationFrame(() => handleNewMessage(payload.new));
          break;
        case 'UPDATE':
          requestAnimationFrame(() => handleMessageUpdate(payload.new));
          break;
        case 'DELETE':
          requestAnimationFrame(() => handleMessageDelete(payload.old));
          break;
        case 'TOMBSTONE':
          requestAnimationFrame(() => handleMessageTombstone(payload.new));
          break;
        case 'REACTION_ADD':
          // Batch reaction updates to reduce re-renders
          requestAnimationFrame(() => handleReactionAdd(payload.new));
          break;
        case 'REACTION_REMOVE':
          requestAnimationFrame(() => handleReactionRemove(payload.old));
          break;
        case 'ATTACHMENT_ADDED':
          requestAnimationFrame(() => handleAttachmentAdded(payload.attachment));
          break;
        default:
          console.log('⚠️ Unknown realtime payload type:', payload.type, payload);
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      console.log('🔕 Cleaning up realtime subscription for channel:', channelId);
      if (subscriptionRef.current) {
        unsubscribe(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      // Clear any pending reaction timeout on unmount
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = null;
      }
      // Clear batch queue on unmount
      reactionBatchRef.current = [];
    };
  }, [channelId, currentUserId]);

  // Track screen focus for notifications and refresh channel details
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      
      // Refresh channel details when screen comes into focus
      // This ensures we get the latest image if it was updated elsewhere
      const loadChannelDetails = async () => {
        try {
          const { data, error } = await getChannel(channelId);
          if (!error && data) {
            const cacheKey = `channel_details_${channelId}`;
            dataCache.set(cacheKey, data, 5 * 60 * 1000);
            setChannelDetails(data);
          }
        } catch (err) {
          // Silent fail
        }
      };
      
      loadChannelDetails();
      
      return () => setIsScreenFocused(false);
    }, [channelId])
  );

  // Smart refresh when screen comes into focus - only reload if data is stale
  useFocusEffect(
    React.useCallback(() => {
      if (teamId) {
        // Check if we have cached team data
        const cachedTeamInfo = dataCache.get(CACHE_KEYS.TEAM_INFO(teamId));
        
        if (cachedTeamInfo) {
          console.log('ChannelChatScreen - Using cached team data, no reload needed');
          // Use cached data immediately
          setTeamInfo(cachedTeamInfo);
          setTeamLoading(false);
          
          // Refresh in background (silent refresh)
          loadTeamData(true);
        } else {
          console.log('ChannelChatScreen - No cached data, loading...');
          loadTeamData();
        }
      }
    }, [teamId])
  );

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

  // Helper function to scroll to first unread message
  const scrollToUnreadOrBottom = () => {
    if (!flatListRef.current || messages.length === 0) return;
    
    // Find the first unread message (not from current user)
    const firstUnreadIndex = messages.findIndex(m => !m.is_read && m.sender_id !== currentUserId);
    
    if (firstUnreadIndex !== -1) {
      // Found unread messages, scroll to first unread
      console.log(`📌 Scrolling to unread message at index ${firstUnreadIndex}`);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ 
          index: firstUnreadIndex, 
          animated: false,
          viewPosition: 0.1 // Position slightly from top
        });
      }, 100);
    } else {
      // No unread messages, scroll to bottom
      console.log('📌 No unread messages, scrolling to bottom');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  const loadMessages = async (useCache = true) => {
    try {
      // Check persistent cache first (like WhatsApp - messages survive app restart)
      const cachedMessages = dataCache.getMessages(channelId);
      
      // Helper to normalize messages with isMine flag
      const normalizeMessages = (msgs) => {
        if (!msgs) return [];
        return msgs.map((message) => {
          const { message_attachments, sender_profile, ...rest } = message;
          
          // Cache user profile for future lookups (async but won't block)
          if (sender_profile) {
            dataCache.setUserProfile(message.sender_id, sender_profile).catch(err => {
              // Silent fail - not critical
            });
          }
          
          // ✅ BAKED-IN NAMES: Persist name directly into message cache
          // This ensures when loading from AsyncStorage, names are already there
          const bakedName = message.sender_id === currentUserId 
            ? 'You' 
            : sender_profile?.display_name || message.sender_name || 'Unknown User';
          
          const bakedAvatar = sender_profile?.avatar_url || message.sender_avatar || null;
          
          return {
            ...rest,
            sender_id: String(message.sender_id), // Normalize to string
            sender_name: bakedName, // Baked in - will persist to AsyncStorage
            sender_avatar: bakedAvatar, // Baked in - will persist to AsyncStorage
            sender_profile: sender_profile, // Keep for future hydration
            isCurrentUser: message.sender_id === currentUserId, // Precompute alignment
            // Map message_attachments to attachments for component compatibility
            attachments: message.message_attachments || []
          };
        });
      };
      
      // Use normalized messages
      if (cachedMessages && useCache) {
        console.log('💬 Using PERSISTENT cached messages, instant render');
        const normalizedCached = normalizeMessages(cachedMessages);
        setMessages(normalizedCached);
        setMessagesLoading(false);
        
        // Scroll to unread or bottom immediately
        setTimeout(() => {
          scrollToUnreadOrBottom();
        }, 100);
        
        // WhatsApp-style: Refresh in background without loading spinner
        (async () => {
          const { data, error } = await getMessages(channelId);
          if (error) {
            console.warn('Background refresh failed:', error);
            return;
          }
          
          const messagesWithNames = normalizeMessages(data || []);
          
          // Persist to AsyncStorage (like WhatsApp - survives app restart)
          await dataCache.setMessages(channelId, messagesWithNames);
          setMessages(messagesWithNames);
          
          // Batch mark last 5 messages as read
          const recentMessages = messagesWithNames.slice(-5);
          await Promise.all(recentMessages.map(m => markMessageAsRead(m.id)));
          
          console.log('💬 Background refresh complete for channel:', channelId);
        })();
        
        return;
      }
      
      setMessagesLoading(true);
      const { data, error } = await getMessages(channelId);
      
      if (error) {
        throw error;
      }
      
      // Use normalized messages (with baked-in names/avatars)
      const messagesWithNames = normalizeMessages(data || []);
      
      console.log('💬 Messages loaded for channel:', channelId, messagesWithNames?.length || 0);
      
      // ✅ WhatsApp-style: Persist normalized messages to AsyncStorage
      // This saves baked-in names/avatars so next time there's zero flicker
      await dataCache.setMessages(channelId, messagesWithNames);
      
      setMessages(messagesWithNames);

      // Batch mark last 5 messages as read (efficient)
      const recentMessages = messagesWithNames.slice(-5);
      await Promise.all(recentMessages.map(m => markMessageAsRead(m.id)));
      
      // Scroll to unread or bottom after messages are set
      setTimeout(() => {
        scrollToUnreadOrBottom();
      }, 300);
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
      // currentUserId is already available from useAuthTeam hook

      // Add optimistic message with isUploading flag
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        content: content.trim(),
        sender_id: currentUserId,
        sender_name: 'You',
        sender_avatar: currentUserAvatar, // Include user's avatar optimistically
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
      setMessages(prev => prev.map(m => 
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
      ));
      
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
        console.log('📎 Fetched attachments for message:', newMessage.id, attachments.length);
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
    // Add to batch queue
    reactionBatchRef.current.push({ type: 'add', reaction });
    
    // Clear existing timeout
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
    }
    
    // Throttle: process batch after 100ms of inactivity
    reactionTimeoutRef.current = setTimeout(() => {
      const batch = [...reactionBatchRef.current];
      reactionBatchRef.current = [];
      
      // Apply all batched reaction updates at once (using functional update to avoid stale closure)
      setMessages(prev => {
        let updatedMessages = [...prev];
        
        batch.forEach(({ type, reaction: r }) => {
          if (type === 'add') {
            updatedMessages = updatedMessages.map(msg => {
              if (msg.id === r.message_id) {
                const existingReactions = msg.reactions || [];
                const alreadyExists = existingReactions.some(existing => 
                  existing.user_id === r.user_id && existing.emoji === r.emoji
                );
                
                if (!alreadyExists) {
                  return { ...msg, reactions: [...existingReactions, r] };
                }
              }
              return msg;
            });
          }
        });
        
        // Update cache with latest state
        const cacheKey = `channel_messages_${channelId}`;
        dataCache.set(cacheKey, updatedMessages, 5 * 60 * 1000);
        
        return updatedMessages;
      });
    }, 100);
  };

  const handleReactionRemove = (reaction) => {
    // Add to batch queue
    reactionBatchRef.current.push({ type: 'remove', reaction });
    
    // Clear existing timeout
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
    }
    
    // Throttle: process batch after 100ms of inactivity
    reactionTimeoutRef.current = setTimeout(() => {
      const batch = [...reactionBatchRef.current];
      reactionBatchRef.current = [];
      
      // Apply all batched reaction updates at once (using functional update to avoid stale closure)
      setMessages(prev => {
        let updatedMessages = [...prev];
        
        batch.forEach(({ type, reaction: r }) => {
          if (type === 'remove') {
            updatedMessages = updatedMessages.map(msg => {
              if (msg.id === r.message_id) {
                const existingReactions = msg.reactions || [];
                const newReactions = existingReactions.filter(existing => 
                  !(existing.user_id === r.user_id && existing.emoji === r.emoji)
                );
                return { ...msg, reactions: newReactions };
              }
              return msg;
            });
          }
        });
        
        // Update cache with latest state
        const cacheKey = `channel_messages_${channelId}`;
        dataCache.set(cacheKey, updatedMessages, 5 * 60 * 1000);
        
        return updatedMessages;
      });
    }, 100);
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
      // Scroll to the message
      flatListRef.current.scrollToIndex({ 
        index: parentIndex, 
        animated: true,
        viewPosition: 0.3 // Center it slightly above middle
      });
      
      // Small delay before highlighting (wait for scroll to complete)
      setTimeout(() => {
        setHighlightedMessageId(parentMessageId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Clear highlight after animation completes (~1100ms total: 200 delay + 300 fade-in + 800 fade-out)
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 1100);
      }, 150); // Wait for scroll to settle
    }
  };

  const handleDeleteMessage = async (messageId, deleteType = 'for_all') => {
    try {
      if (deleteType === 'for_me') {
        // Delete for me - just remove from local state and mark as hidden for user
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
        
        // TODO: In the future, save deleted message IDs in local storage or API
        // For now, just remove from view
        console.log('Message deleted for me:', messageId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({ message: 'Message deleted for you', type: 'success' });
      } else {
        // Delete for all - call API to delete message from server
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
          console.log('Message deleted for all:', messageId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({ message: 'Message deleted for everyone', type: 'success' });
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      if (deleteType === 'for_all') {
        loadMessages();
        Alert.alert('Error', 'Failed to delete message. Please try again.');
      }
    }
  };

  // Action Sheet Handlers
  const handleEditMessage = async (message) => {
    if (!message || !message.content) return;
    
    // Check if message can be edited (within 15 min window)
    const editWindow = new Date(message.created_at);
    editWindow.setMinutes(editWindow.getMinutes() + 15);
    
    if (new Date() >= editWindow) {
      Alert.alert('Cannot Edit', 'You can only edit messages within 15 minutes of posting');
      return;
    }

    // For now, show info that edit feature is coming soon
    // In the future, we can add a modal with TextInput for editing
    Alert.alert('Edit Coming Soon', 'Message editing will be available in the next update.');
  };

  const handleReactionPress = async (messageId, emoji) => {
    // Optimistic update first
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const existingReactions = message.reactions || [];
    const hasUserReaction = existingReactions.some(r => r.user_id === currentUserId && r.emoji === emoji);
    
    let updatedMessages;
    
    if (hasUserReaction) {
      // Optimistically remove reaction
      updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          const updatedReactions = msg.reactions.filter(r => 
            !(r.user_id === currentUserId && r.emoji === emoji)
          );
          return { ...msg, reactions: updatedReactions };
        }
        return msg;
      });
    } else {
      // Optimistically add reaction
      const optimisticReaction = {
        id: `temp-${Date.now()}`,
        message_id: messageId,
        user_id: currentUserId,
        emoji: emoji,
        created_at: new Date().toISOString()
      };
      
      updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          return { ...msg, reactions: [...existingReactions, optimisticReaction] };
        }
        return msg;
      });
    }

    // Update local state
    setMessages(updatedMessages);
    
    // Update cache immediately
    const cacheKey = `channel_messages_${channelId}`;
    dataCache.set(cacheKey, updatedMessages, 5 * 60 * 1000);
    
    Haptics.selectionAsync();

    // Now make the API call
    try {
      const { data, error } = await toggleReaction(messageId, emoji);
      if (error) {
        console.error('Error toggling reaction:', error);
        // Revert optimistic update on error
        setMessages(messages); // Restore original
        dataCache.set(cacheKey, messages, 5 * 60 * 1000);
      } else {
        console.log(`✅ Reaction ${data?.action || 'toggled'}`);
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
      // Revert optimistic update on error
      setMessages(messages); // Restore original
      dataCache.set(cacheKey, messages, 5 * 60 * 1000);
    }
  };

  const handleLongPressMessage = (message, event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Get touch position for reaction bar anchor
    const { pageX, pageY } = event.nativeEvent;
    
    // Show reaction bar at the top
    setReactionBarAnchor({
      x: pageX,
      y: pageY,
      messageId: message.id
    });
    setReactionBarVisible(true);
    setSelectedMessage(message);
    
    // Show action sheet at the bottom after a brief delay with simple fade animation
    setTimeout(() => {
      setActionSheetVisible(true);
      // Simple fade in animation
      actionSheetOpacity.value = withTiming(1, { duration: 200 });
    }, 300);
  };

  const handleReactionBarEmoji = (messageId, emoji) => {
    // Animate out action sheet
    actionSheetOpacity.value = withTiming(0, { duration: 150 });
    setReactionBarVisible(false);
    setActionSheetVisible(false);
    setSelectedMessage(null);
    handleReactionPress(messageId, emoji);
  };

  const handleReactionBarMore = () => {
    // + button opens emoji keyboard - for now just close
    // In the future, this could open a full emoji picker
    // Animate out action sheet
    actionSheetOpacity.value = withTiming(0, { duration: 150 });
    setReactionBarVisible(false);
    setActionSheetVisible(false);
    setSelectedMessage(null);
    // Show that emoji picker would open here
    // For MVP, just close everything
  };

  const handleActionSheetClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Animate out first, then close
    actionSheetOpacity.value = withTiming(0, { duration: 150 });
    setTimeout(() => {
      setActionSheetVisible(false);
      setReactionBarVisible(false);
      setSelectedMessage(null);
    }, 150);
  };

  const handleCopyMessage = async () => {
    if (selectedMessage?.content) {
      // Copy to clipboard
      await Clipboard.setStringAsync(selectedMessage.content);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ message: 'Message copied', type: 'success' });
      handleActionSheetClose();
    }
  };

  const handleForward = () => {
    showToast({ message: 'Forward coming soon', type: 'info' });
    handleActionSheetClose();
  };

  const handleSave = () => {
    showToast({ message: 'Save coming soon', type: 'info' });
    handleActionSheetClose();
  };

  const handleDeleteFromActionSheet = () => {
    if (selectedMessage) {
      const isCurrentUser = selectedMessage.sender_id === currentUserId;
      
      if (isCurrentUser) {
        // Your message - show modal with options
        setDeleteModalVisible(true);
      } else {
        // Someone else's message - directly delete for me
        handleDeleteMessage(selectedMessage.id, 'for_me');
        handleActionSheetClose();
      }
    }
  };

  const handleDeleteConfirm = (type) => {
    setDeleteType(type);
    setDeleteModalVisible(false);
    
    if (type === 'for_all') {
      // Show confirmation for delete for all
      setDeleteType('confirm_delete_all');
      setDeleteModalVisible(true);
    } else {
      // Delete for me
      handleDeleteMessage(selectedMessage.id, 'for_me');
      handleActionSheetClose();
    }
  };

  const handleDeleteFinalConfirm = () => {
    if (deleteType === 'confirm_delete_all') {
      handleDeleteMessage(selectedMessage.id, 'for_all');
      handleActionSheetClose();
      setDeleteType(null);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setDeleteType(null);
  };

  const dismissReactionBar = () => {
    // Animate out action sheet if visible
    if (actionSheetVisible) {
      actionSheetOpacity.value = withTiming(0, { duration: 150 });
    }
    setReactionBarVisible(false);
    setActionSheetVisible(false);
    setSelectedMessage(null);
  };

  const handleDownloadImage = (imageUri) => {
    Alert.alert(
      'Download Image',
      'Image download functionality will be implemented when we integrate with the main chat system.',
      [{ text: 'OK' }]
    );
  };

  const AnimatedMessage = React.memo(({ item, showProfilePicture = false }) => {
    const translateX = useSharedValue(0);
    const replyIconOpacity = useSharedValue(0);
    const highlightOpacity = useSharedValue(item.id === highlightedMessageId ? 1 : 0);
    const hasActivated = useSharedValue(false);

    const gestureHandler = (event) => {
      'worklet';
      const { translationX, translationY } = event.nativeEvent;
      
      // Only activate if horizontal movement is greater than vertical
      if (Math.abs(translationX) > Math.abs(translationY)) {
        const newTranslateX = Math.max(0, translationX);
        
        if (translationX > 0) {
          // Swiping right - move message
          translateX.value = newTranslateX;
          
          // Show reply icon at threshold
          if (newTranslateX > 28) {
            replyIconOpacity.value = withTiming(1, { duration: 200 });
            if (!hasActivated.value) {
              hasActivated.value = true;
              runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            }
          } else {
            replyIconOpacity.value = withTiming(0, { duration: 200 });
            if (hasActivated.value) {
              hasActivated.value = false;
            }
          }
        }
      }
    };

    const gestureEndHandler = (event) => {
      'worklet';
      if (event.nativeEvent.state === State.END) {
        const { translationX } = event.nativeEvent;
        
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
        hasActivated.value = false;
      }
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

    // Watch for highlight changes and animate with proper timing
    useEffect(() => {
      if (item.id === highlightedMessageId) {
        // Wait for message to be visible, then animate
        setTimeout(() => {
          highlightOpacity.value = withTiming(1, { duration: 300 }, () => {
            'worklet';
            highlightOpacity.value = withTiming(0, { duration: 800 });
          });
        }, 200); // Small delay to ensure message is in viewport
      }
    }, [highlightedMessageId]);

    const highlightStyle = useAnimatedStyle(() => {
      return {
        backgroundColor: COLORS.BACKGROUND_MUTED,
        borderRadius: 6,
        opacity: highlightOpacity.value,
      };
    });

    const parentMessage = item.reply_to_message_id ? 
      messages.find(msg => msg.id === item.reply_to_message_id) : null;

    // Helper function to render reactions
    const renderReactions = () => {
      if (!item.reactions || item.reactions.length === 0) return null;

      // Group reactions by emoji and count
      const reactionCounts = {};
      item.reactions.forEach(reaction => {
        if (!reactionCounts[reaction.emoji]) {
          reactionCounts[reaction.emoji] = 0;
        }
        reactionCounts[reaction.emoji]++;
      });

      // Find current user's reaction (should only be one per user)
      const userReaction = item.reactions.find(r => r.user_id === currentUserId);
      const userReactedEmoji = userReaction ? userReaction.emoji : null;

      // Show user's reaction first if exists, then others
      const reactionsToShow = userReactedEmoji 
        ? [
            { emoji: userReactedEmoji, count: reactionCounts[userReactedEmoji] },
            ...Object.entries(reactionCounts)
              .filter(([emoji]) => emoji !== userReactedEmoji)
              .map(([emoji, count]) => ({ emoji, count }))
          ]
        : Object.entries(reactionCounts).map(([emoji, count]) => ({ emoji, count }));

    return (
        <View style={styles.reactionsContainer}>
          {reactionsToShow.map(({ emoji, count }, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.reactionPill,
                emoji === userReactedEmoji && styles.userReactionPill
              ]}
              onPress={() => handleReactionPress(item.id, emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              <Text style={styles.reactionCount}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    };

    return (
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        onHandlerStateChange={gestureEndHandler}
        activeOffsetX={10}
        failOffsetY={[-10, 10]}
        simultaneousHandlers={flatListRef}
      >
        <Animated.View style={[
          styles.messageWrapper, 
          showProfilePicture && styles.messageWrapperWithAvatar,
          animatedStyle
        ]}>
          <TouchableOpacity
            onLongPress={(event) => handleLongPressMessage(item, event)}
            activeOpacity={1}
            delayLongPress={300}
          >
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
            
            {/* Slack-style message layout: Avatar always on left, name + timestamp inline */}
            <View style={styles.messageRow}>
              {/* Avatar column - always visible on left */}
              <View style={styles.avatarColumn}>
                {showProfilePicture ? (
                  item.sender_avatar ? (
                    <Image 
                      source={{ uri: item.sender_avatar }} 
                      style={styles.senderProfilePicture}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.senderProfilePicturePlaceholder}>
                      <Ionicons name="person" size={18} color={COLORS.TEXT_TERTIARY} />
                    </View>
                  )
                ) : (
                  <View style={styles.avatarSpacer} />
              )}
              </View>
              
              {/* Message content column */}
              <View style={styles.messageContentColumn}>
                {/* Sender name and timestamp inline - show when avatar is shown */}
                {showProfilePicture && (
                  <View style={styles.messageHeader}>
                    <Text style={styles.senderNameInline}>{item.sender_name || 'Unknown'}</Text>
                    <Text style={styles.messageTimestamp}>
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {item.is_edited && <Text style={styles.editedIndicator}> • edited</Text>}
                    </Text>
                  </View>
                )}

                {/* Message text - no bubble, just text */}
              {item.content && (
                  <View style={styles.messageTextContainer}>
                    {/* Highlight layer */}
                  <Animated.View style={[StyleSheet.absoluteFill, highlightStyle]} pointerEvents="none" />
                    <Text style={styles.messageText}>
                    {item.content}
                    </Text>
                  </View>
              )}

                {/* Reactions */}
                {renderReactions()}
              </View>
            </View>
            
            {/* Images - Slack-style, no bubble alignment */}
            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.messageRow}>
                <View style={styles.avatarColumn}>
                  <View style={styles.avatarSpacer} />
                </View>
                <View style={styles.messageContentColumn}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageScrollView}
                >
                  {item.attachments.map((attachment, index) => {
                    const imageUri = attachment.s3_url || attachment.thumbnail_url || attachment.uri;
                    if (!imageUri) return null;
                    
                    return (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.messageImageContainer}
                        onPress={() => {
                          setSelectedImageUri(imageUri);
                          setShowImageViewer(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                        <View style={styles.imageOverlay}>
                          <Ionicons name="expand-outline" size={16} color={colors.white} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                </View>
              </View>
            )}
            
          {/* Reply icon that appears during swipe */}
          <Animated.View style={[styles.replyIcon, replyIconStyle]}>
            <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
          </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    );
  });

  const renderMessage = ({ item, index }) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    
    // Show avatar when:
    // 1. It's the first message
    // 2. It's a different sender
    // 3. 10 minutes (600,000 ms) have passed since the previous message
    const showProfilePicture = !previousMessage || 
      previousMessage.sender_id !== item.sender_id ||
      (new Date(item.created_at).getTime() - new Date(previousMessage.created_at).getTime() > 10 * 60 * 1000);
    
    return <AnimatedMessage item={item} showProfilePicture={showProfilePicture} />;
  };

  // Memoize logo source to prevent flicker
  const logoSource = useMemo(() => {
    // Check cache first (WhatsApp-style - no flicker)
    const cachedDetails = dataCache.get(`channel_details_${channelId}`);
    if (cachedDetails?.image_url) {
      return { uri: cachedDetails.image_url, isIcon: false };
    }
    
    // PRIORITY: Show channel image if available
    if (channelDetails?.image_url) {
      return { uri: channelDetails.image_url, isIcon: false };
    }
    
    // No channel image - return icon info
    const iconName = getChannelIcon(channelDetails?.type, channelName);
    return { iconName, isIcon: true };
  }, [channelId, channelDetails?.image_url, channelDetails?.type, channelName]);
  
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={22} color={COLORS.TEXT_PRIMARY} />
      </TouchableOpacity>
      
      {logoSource.isIcon ? (
        <View style={[styles.teamLogo, styles.iconContainer]}>
          <Ionicons name={logoSource.iconName} size={20} color={COLORS.TEXT_SECONDARY} />
        </View>
      ) : (
        <Image 
          source={logoSource}
          style={styles.teamLogo} 
        />
      )}
      
      <TouchableOpacity 
        style={styles.headerCenter}
        onPress={() => navigation.navigate('ConversationInfo', { 
          conversationId: channelId,
          conversationType: 'channel',
          channelName: channelName,
          teamId: teamId
        })}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>#{channelName}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => {/* Future: Toggle channel settings */}}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="grid" 
          size={20} 
          color={COLORS.TEXT_PRIMARY} 
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
            <Ionicons name="close" size={16} color="#CCCCCC" />
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
        isChannel={true}
        channelName={channelName}
        placeholder="Message"
      />
    </View>
  );

  const actionSheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: actionSheetOpacity.value,
    };
  });

  const renderActionSheet = () => {
    if (!actionSheetVisible || !selectedMessage) return null;

    const isCurrentUser = selectedMessage.sender_id === currentUserId;

    return (
      <TouchableWithoutFeedback onPress={handleActionSheetClose}>
        <Animated.View style={[styles.actionSheetOverlay, { opacity: actionSheetOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.actionSheetContainer, actionSheetAnimatedStyle]}>
              <BlurView intensity={20} tint="dark" style={styles.actionSheetBlur}>
                {/* Handle Bar */}
                <View style={styles.actionSheetHandle} />
                
                {/* Reply */}
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={() => {
                    setReplyToMessage(selectedMessage);
                    setIsReplyActivated(true);
                    handleActionSheetClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-undo-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.actionSheetText}>Reply</Text>
                </TouchableOpacity>

                {/* Copy Message */}
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={handleCopyMessage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.actionSheetText}>Copy Message</Text>
                </TouchableOpacity>

                {/* Forward */}
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={handleForward}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.actionSheetText}>Forward</Text>
                </TouchableOpacity>

                {/* Save */}
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={handleSave}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.actionSheetText}>Save</Text>
                </TouchableOpacity>

                {/* Delete - always available */}
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={handleDeleteFromActionSheet}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  <Text style={[styles.actionSheetText, { color: '#FF3B30' }]}>Delete</Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.actionSheetCancel}
                  onPress={handleActionSheetClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionSheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  const renderDeleteModal = () => {
    if (!deleteModalVisible) return null;

    return (
      <TouchableWithoutFeedback onPress={closeDeleteModal}>
        <Animated.View style={styles.deleteModalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={styles.deleteModalContainer}>
              <BlurView intensity={20} tint="dark" style={styles.deleteModalBlur}>
                {/* Handle Bar */}
                <View style={styles.actionSheetHandle} />
                
                {deleteType === 'confirm_delete_all' ? (
                  <>
                    {/* Confirmation for Delete for All */}
                    <Text style={styles.deleteModalTitle}>Delete for All</Text>
                    <Text style={styles.deleteModalMessage}>
                      Are you sure you want to permanently delete this message for everyone?
                    </Text>
                    
                    <TouchableOpacity
                      style={[styles.deleteModalButton, styles.deleteModalDestructive]}
                      onPress={handleDeleteFinalConfirm}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteModalDestructiveText}>Delete</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteModalButton}
                      onPress={closeDeleteModal}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Initial Delete Options */}
                    <Text style={styles.deleteModalTitle}>Delete Message</Text>
                    <Text style={styles.deleteModalMessage}>Choose a delete option</Text>
                    
                    <TouchableOpacity
                      style={styles.deleteModalButton}
                      onPress={() => handleDeleteConfirm('for_me')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteModalText}>Delete for Me</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteModalButton}
                      onPress={() => handleDeleteConfirm('for_all')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteModalDestructiveText}>Delete for All</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteModalCancel}
                      onPress={closeDeleteModal}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteModalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  if (messagesLoading || !currentUserId) {
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

        {/* Reaction Bar - Layer 1 */}
        <ReactionBar
          visible={reactionBarVisible}
          messageId={reactionBarAnchor.messageId}
          onEmojiPress={handleReactionBarEmoji}
          onMorePress={handleReactionBarMore}
          onDismiss={dismissReactionBar}
          anchorX={reactionBarAnchor.x}
          anchorY={reactionBarAnchor.y}
        />

        {/* Action Sheet - Layer 2 */}
        {renderActionSheet()}

        {/* Delete Modal - Layer 3 */}
        {renderDeleteModal()}

      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  teamLogo: {
    width: 36,
    height: 36,
    borderRadius: 13, // Circular
    marginRight: 10,
  },
  iconContainer: {
    backgroundColor: COLORS.BACKGROUND_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13, // Match team logo roundness
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginRight: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'left',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F',
    marginTop: 2,
    textAlign: 'center',
  },
  toggleButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingVertical: 12,
    paddingBottom: 80, // Extra padding for composer height
  },
  messageWrapper: {
    marginVertical: 1,
  },
  messageWrapperWithAvatar: {
    marginTop: 9,
    marginBottom: 4,
  },
  // Slack-style message row layout
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  avatarColumn: {
    width: 40,
    alignItems: 'center',
    marginRight: 10,
  },
  avatarSpacer: {
    width: 40,
    height: 40,
  },
  senderProfilePicture: {
    width: 40,
    height: 40,
    borderRadius: 14, // Match team logo roundness ratio (13/36 * 40 = ~14)
  },
  senderProfilePicturePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 14, // Match team logo roundness ratio
    backgroundColor: COLORS.BACKGROUND_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageContentColumn: {
    flex: 1,
    minWidth: 0, // Allow text to wrap
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
    gap: 8,
  },
  senderNameInline: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  messageTimestamp: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: COLORS.TEXT_TERTIARY,
    letterSpacing: 0.1,
  },
  messageTextContainer: {
    marginTop: 1,
    marginBottom: 3,
    position: 'relative',
  },
  messageText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    lineHeight: 20,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.08,
  },
  // Media styles - Slack-style, no bubbles
  mediaBubble: {
    marginTop: 8,
    marginBottom: 4,
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
    color: COLORS.TEXT_TERTIARY,
    marginTop: 6,
  },
  messageTimeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  userReactionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  editedIndicator: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: COLORS.TEXT_TERTIARY,
    fontStyle: 'italic',
  },
  deleteButton: {
    marginLeft: 6,
    padding: 2,
  },
  mediaTime: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: COLORS.TEXT_TERTIARY,
    marginTop: 4, // Small gap from images
  },
  currentUserMediaTime: {
    alignSelf: 'flex-end',
  },
  otherUserMediaTime: {
    alignSelf: 'flex-start',
  },
  keyboardAvoidingView: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  inputArea: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    paddingHorizontal: 0,
    paddingVertical: 12,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: COLORS.TEXT_TERTIARY,
    marginTop: 16,
  },
  // Reply functionality styles
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginLeft: 50, // Align with message content (avatar width + margin)
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.BACKGROUND_MUTED,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.TEXT_TERTIARY,
  },
  replyIndicator: {
    width: 2,
    backgroundColor: COLORS.TEXT_TERTIARY,
    borderRadius: 1,
    marginRight: 10,
    marginTop: 2,
  },
  replyContent: {
    flex: 1,
  },
  replySenderName: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 3,
    fontWeight: '600',
  },
  replyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 16,
    opacity: 0.8,
  },
  replyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  replyPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  replyPillIndicator: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.TEXT_TERTIARY,
    borderRadius: 1,
    marginRight: 10,
  },
  replyPillText: {
    flex: 1,
  },
  replyPillSender: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
    fontWeight: '600',
  },
  replyPillMessage: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: COLORS.TEXT_TERTIARY,
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
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Action Sheet styles - LockerRoom Grade
  actionSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  actionSheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  actionSheetBlur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 2,
  },
  actionSheetText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  actionSheetCancel: {
    marginTop: 8,
    marginHorizontal: 12,
    marginBottom: 40,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.BACKGROUND_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  // Delete Modal styles
  deleteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  deleteModalContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  deleteModalBlur: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    paddingBottom: 40,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
  },
  deleteModalButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: '#FFFFFF',
  },
  deleteModalDestructive: {
    backgroundColor: '#2A2A2A',
  },
  deleteModalDestructiveText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: '#FF3B30',
  },
  deleteModalCancel: {
    marginTop: 12,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  deleteModalCancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: '#FFFFFF',
  },
});

export default ChannelChatScreen;
