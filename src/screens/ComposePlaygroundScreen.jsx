import React, { useState, useRef } from 'react';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock data for testing
const mockMessages = [
  {
    id: '1',
    content: 'Hey team! How\'s everyone doing?',
    sender_id: 'user1',
    sender_name: 'John Doe',
    message_type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    is_edited: false,
    reactions: []
  },
  {
    id: '2',
    content: 'Great! Just finished reviewing the playbook updates.',
    sender_id: 'user2',
    sender_name: 'Jane Smith',
    message_type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    is_edited: false,
    reactions: []
  },
  {
    id: '3',
    content: 'Perfect timing! I was just about to ask about that.',
    sender_id: 'user1',
    sender_name: 'John Doe',
    message_type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    is_edited: false,
    reactions: []
  }
];

const ComposePlaygroundScreen = ({ navigation }) => {
  const [messages, setMessages] = useState(mockMessages);
  const [isChannel, setIsChannel] = useState(true); // Toggle between channel and DM mode
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isReplyActivated, setIsReplyActivated] = useState(false);
  const flatListRef = useRef(null);

  const handleSendMessage = (content, messageType = 'text', attachments = []) => {
    if (!content.trim() && attachments.length === 0) return;

    const newMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender_id: 'current_user',
      sender_name: 'You',
      message_type: messageType,
      created_at: new Date().toISOString(),
      is_edited: false,
      reactions: [],
      attachments: attachments,
      reply_to_message_id: replyToMessage?.id || null,
      parent_message_id: replyToMessage?.id || null,
    };

    setMessages(prev => [...prev, newMessage]);
    
    // Clear reply state after sending
    setReplyToMessage(null);
    setIsReplyActivated(false);
    
    // Show success alert
    Alert.alert(
      'Message Sent!',
      `Type: ${messageType}\nContent: ${content || 'No text'}\nAttachments: ${attachments.length}${replyToMessage ? `\nReplying to: ${replyToMessage.sender_name}` : ''}`,
      [{ text: 'OK' }]
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

    const parentId = item.parent_message_id ?? item.reply_to_message_id;
    const parentMessage = parentId ? 
      messages.find(msg => msg.id === parentId) : null;

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
          
          {/* Message content with optional profile picture */}
          <View style={[
            styles.messageContainer,
            item.sender_id === 'current_user' ? styles.currentUserContainer : styles.otherUserContainer
          ]}>
            {/* Profile picture for received messages */}
            {showProfilePicture && item.sender_id !== 'current_user' && (
              <Image 
                source={require('../../assets/cardinal.png')} 
                style={styles.senderProfilePicture} 
              />
            )}
            
            {/* Text content in bubble */}
            {item.content && (
              <View style={[
                styles.messageBubble,
                item.sender_id === 'current_user' ? styles.currentUserMessage : styles.otherUserMessage
              ]}>
                <Text style={[
                  styles.messageText,
                  item.sender_id === 'current_user' ? styles.currentUserText : styles.otherUserText
                ]}>
                  {item.content}
                </Text>
                <Text style={styles.messageTime}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </View>
          
          {/* Images in dedicated media bubble */}
          {item.attachments && item.attachments.length > 0 && (
            <View style={[
              styles.mediaBubble,
              item.sender_id === 'current_user' ? styles.currentUserMedia : styles.otherUserMedia
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
                      setSelectedImageUri(attachment.uri);
                      setShowImageViewer(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: attachment.uri }}
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
                item.sender_id === 'current_user' ? styles.currentUserMediaTime : styles.otherUserMediaTime
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
    const showProfilePicture = item.sender_id !== 'current_user' && 
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
      
      <TouchableOpacity 
        style={styles.headerInfo}
        onPress={() => navigation.navigate('ConversationInfo', { conversationId: 'conv_1' })}
        activeOpacity={0.7}
      >
        <View style={styles.titleContainer}>
          <Image 
            source={require('../../assets/cardinal.png')} 
            style={styles.groupAvatar} 
          />
          <View style={styles.titleTextContainer}>
            <Text style={styles.headerTitle}>Compose Playground</Text>
            <Text style={styles.headerSubtitle}>Testing Rich Message Input</Text>
          </View>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsChannel(!isChannel)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isChannel ? "grid" : "at"} 
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
        disabled={false}
        isChannel={isChannel}
        channelName={isChannel ? 'general' : 'username'}
      />
    </View>
  );

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
  groupAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  titleTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: getFontSize('LG'),
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
    alignSelf: 'flex-end',
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
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginBottom: 12,
  },
  // Reply functionality styles
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  replyIndicator: {
    width: 3,
    backgroundColor: colors.primary,
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
    color: colors.primary,
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.gray,
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

export default ComposePlaygroundScreen;