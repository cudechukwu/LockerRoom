import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  PanResponder,
  FlatList,
  TextInput,
  ActivityIndicator,
  ImageBackground,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { COLORS } from '../constants/colors';
import { fetchTeamMembers, createChannel, createGroup } from '../api/teamMembers';
import { supabase } from '../lib/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const CreateChannelModal = ({ visible, onClose, teamId, onChannelCreated }) => {
  const [translateY] = useState(new Animated.Value(SCREEN_HEIGHT));
  const [currentSnapPoint, setCurrentSnapPoint] = useState(0); // 0 = 45%, 1 = 90%
  
  // Member selection state
  const [selectedType, setSelectedType] = useState(null); // 'group' or 'channel'
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Screen navigation state
  const [currentScreen, setCurrentScreen] = useState('members'); // 'members' or 'details'
  const [slideAnimation] = useState(new Animated.Value(0));
  
  // Form state
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  
  const SNAP_POINTS = [
    SCREEN_HEIGHT * 0.55, // 60% visible (40% from top)
    SCREEN_HEIGHT * 0.03,  // 95% visible (5% from top)
  ];

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        const newValue = SNAP_POINTS[currentSnapPoint] + gestureState.dy;
        const minValue = SNAP_POINTS[1];
        const maxValue = SCREEN_HEIGHT;
        
        if (newValue >= minValue && newValue <= maxValue) {
          translateY.setValue(newValue);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const velocity = gestureState.vy;
        const currentValue = translateY._value;
        
        if (velocity > 0.5 || currentValue > SCREEN_HEIGHT * 0.7) {
          handleClose();
          return;
        }
        
        // Snap to nearest point
        const distances = SNAP_POINTS.map(point => Math.abs(currentValue - point));
        const closestIndex = distances.indexOf(Math.min(...distances));
        const targetSnapPoint = closestIndex;
        
        setCurrentSnapPoint(targetSnapPoint);
        
        Animated.spring(translateY, {
          toValue: SNAP_POINTS[targetSnapPoint],
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      },
    })
  ).current;

  // Load team members when modal opens
  useEffect(() => {
    console.log('🎯 Modal useEffect triggered - visible:', visible, 'teamId:', teamId);
    if (visible && teamId) {
      console.log('✅ Modal is visible and has teamId, calling loadTeamMembers');
      console.log('🔧 About to call loadTeamMembers function...');
      loadTeamMembers();
      console.log('🔧 loadTeamMembers function called');
    } else {
      console.log('❌ Modal not ready - visible:', visible, 'teamId:', teamId);
    }
  }, [visible, teamId]);

  // Filter members based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = teamMembers.filter(member => 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(teamMembers);
    }
  }, [searchQuery, teamMembers]);

  const loadTeamMembers = async () => {
    console.log('🚀 loadTeamMembers function started with teamId:', teamId);
    setLoading(true);
    try {
      const members = await fetchTeamMembers(teamId);
      console.log('📋 Modal received members:', members);
      console.log('📋 Members length:', members?.length);
      setTeamMembers(members);
      setFilteredMembers(members);
    } catch (error) {
      console.error('❌ Failed to load team members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setCurrentSnapPoint(0);
      // Use setTimeout to avoid useInsertionEffect warning
      const timer = setTimeout(() => {
        Animated.spring(translateY, {
          toValue: SNAP_POINTS[0],
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }, 0);
      
      return () => clearTimeout(timer);
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    // Reset state when closing
    setSelectedType(null);
    setSelectedMembers([]);
    setSearchQuery('');
    setChannelName('');
    setChannelDescription('');
    setSelectedImage(null);
    setCurrentSnapPoint(0);
    setCurrentScreen('members');
    slideAnimation.setValue(0);
    
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleTypeSelection = (type) => {
    setSelectedType(type);
    // Expand to 90% when selecting type
    setCurrentSnapPoint(1);
    requestAnimationFrame(() => {
      Animated.spring(translateY, {
        toValue: SNAP_POINTS[1],
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    });
  };

  const toggleMemberSelection = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  const removeSelectedMember = (memberId) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleContinue = () => {
    if (selectedMembers.length === 0) return;
    
    // Animate slide to details screen
    setCurrentScreen('details');
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleBack = () => {
    // Animate slide back to members screen
    setCurrentScreen('members');
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCameraPress = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera.');
    }
  };

  const handleLibraryPress = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is needed to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Library error:', error);
      Alert.alert('Error', 'Failed to open photo library.');
    }
  };

  const handleCreate = async () => {
    if (!channelName.trim()) return;
    
    setCreating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (selectedType === 'channel') {
        await createChannel(teamId, {
          name: channelName.trim(),
          description: channelDescription.trim(),
          type: 'channel',
          members: selectedMembers,
          image: selectedImage,
          created_by: user.id,
        });
      } else {
        await createGroup(teamId, {
          name: channelName.trim() || null,
          type: 'group',
          members: selectedMembers,
          image: selectedImage,
          created_by: user.id,
        });
      }
      
      // Success - notify parent and close modal
      if (onChannelCreated) {
        onChannelCreated();
      }
      handleClose();
    } catch (error) {
      console.error('Failed to create:', error);
    } finally {
      setCreating(false);
    }
  };

  const canContinue = () => {
    if (selectedType === 'channel') {
      return selectedMembers.length > 0;
    } else {
      return selectedMembers.length >= 2; // Groups need at least 2 members
    }
  };

  const canCreate = () => {
    const isValid = channelName.trim().length > 0;
    console.log('🔍 canCreate validation:', {
      channelName: channelName,
      trimmedLength: channelName.trim().length,
      isValid: isValid
    });
    return isValid;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY }],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <ImageBackground 
                source={require('../../assets/whitesection.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
                fadeDuration={0}
                imageStyle={styles.backgroundImageStyle}
              >
                <View style={styles.overlay} />
                <TouchableOpacity 
                  style={styles.handle} 
                  onPress={handleClose}
                  activeOpacity={0.7}
                />
              
              <View style={styles.header}>
                <Text style={styles.title}>
                  {selectedType === 'channel' ? 'Create Channel' : 'Create Group'}
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={COLORS.PRIMARY_BLACK} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {!selectedType ? (
                  <>
                    <Text style={styles.subtitle}>Choose what you'd like to create</Text>
                    
                    <View style={styles.optionsContainer}>
                      <TouchableOpacity 
                        style={styles.optionButton}
                        onPress={() => handleTypeSelection('group')}
                      >
                        <Ionicons name="people" size={24} color={COLORS.PRIMARY_BLACK} />
                        <Text style={styles.optionText}>New Group</Text>
                        <Text style={styles.optionDescription}>Private conversation</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.optionButton}
                        onPress={() => handleTypeSelection('channel')}
                      >
                        <Ionicons name="chatbubbles" size={24} color={COLORS.PRIMARY_BLACK} />
                        <Text style={styles.optionText}>New Channel</Text>
                        <Text style={styles.optionDescription}>Team-wide discussion</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.screenContainer}>
                    {/* Members Screen */}
                    <Animated.View 
                      style={[
                        styles.screen,
                        {
                          transform: [{
                            translateX: slideAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -SCREEN_WIDTH],
                            })
                          }]
                        }
                      ]}
                    >
                      <View style={styles.memberSelectionContainer}>
                        {/* Search bar */}
                        <View style={styles.searchContainer}>
                          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                          <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search team members..."
                            placeholderTextColor="#8E8E93"
                          />
                        </View>

                        {/* Members list */}
                        <View style={styles.membersListContainer}>
                          {loading ? (
                            <ActivityIndicator size="small" color={COLORS.PRIMARY_BLACK} />
                          ) : (
                            <>
                              {filteredMembers && filteredMembers.length > 0 ? (
                                <FlatList
                                  data={filteredMembers}
                                  keyExtractor={(item) => item.id}
                                  style={{ backgroundColor: '#F8F8F8' }}
                                  contentContainerStyle={styles.flatListContent}
                                  showsVerticalScrollIndicator={false}
                                  bounces={true}
                                  alwaysBounceVertical={false}
                                  scrollEventThrottle={16}
                                  removeClippedSubviews={false}
                                  renderItem={({ item }) => {
                                    const isSelected = selectedMembers.some(m => m.id === item.id);
                                    return (
                                      <TouchableOpacity
                                        style={styles.memberItem}
                                        onPress={() => toggleMemberSelection(item)}
                                        activeOpacity={0.7}
                                      >
                                        <View style={styles.memberAvatar}>
                                          <Text style={styles.memberAvatarText}>
                                            {item.name.charAt(0).toUpperCase()}
                                          </Text>
                                        </View>
                                        <View style={styles.memberInfo}>
                                          <Text style={styles.memberName}>{item.name}</Text>
                                          <Text style={styles.memberRole}>
                                            {item.position ? `${item.position} • ${item.role}` : item.role}
                                          </Text>
                                        </View>
                                        <View style={styles.memberActions}>
                                          {isSelected && (
                                            <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                                          )}
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  }}
                                  showsVerticalScrollIndicator={false}
                                  scrollEnabled={true}
                                  nestedScrollEnabled={true}
                                />
                              ) : (
                                <View style={styles.emptyState}>
                                  <Text style={styles.emptyStateText}>
                                    {filteredMembers?.length === 0 ? 'No team members found' : 'Loading team members...'}
                                  </Text>
                                </View>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    </Animated.View>

                    {/* Details Screen */}
                    <Animated.View 
                      style={[
                        styles.screen,
                        styles.detailsScreen,
                        {
                          transform: [{
                            translateX: slideAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [SCREEN_WIDTH, 0],
                            })
                          }]
                        }
                      ]}
                    >
                      <View style={styles.detailsContainer}>
                        {/* Back button */}
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                          <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY_BLACK} />
                          <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>

                        {/* Member count */}
                        <View style={styles.memberCountContainer}>
                          <Text style={styles.memberCountText}>
                            Selected: {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                          </Text>
                        </View>

                        {/* Name input */}
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>
                            {selectedType === 'channel' ? 'Channel Name' : 'Group Name'}
                          </Text>
                          <TextInput
                            style={styles.textInput}
                            value={channelName}
                            onChangeText={setChannelName}
                            placeholder={selectedType === 'channel' ? 'e.g., training-room' : 'e.g., Team Chat'}
                            placeholderTextColor="#8E8E93"
                          />
                        </View>

                        {/* Picture selection */}
                        <View style={styles.pictureContainer}>
                          <Text style={styles.inputLabel}>
                            {selectedType === 'channel' ? 'Channel Picture' : 'Group Picture'}
                          </Text>
                          <View style={styles.pictureSelectionContainer}>
                            <View style={styles.picturePreview}>
                              {selectedImage ? (
                                <Image 
                                  source={{ uri: selectedImage.uri }} 
                                  style={styles.previewImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Ionicons name="image-outline" size={48} color="#8E8E93" />
                              )}
                            </View>
                            <View style={styles.pictureButtons}>
                              <TouchableOpacity style={styles.pictureButton} onPress={handleCameraPress}>
                                <Ionicons name="camera" size={20} color="#007AFF" />
                                <Text style={styles.pictureButtonText}>Camera</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.pictureButton} onPress={handleLibraryPress}>
                                <Ionicons name="images" size={20} color="#007AFF" />
                                <Text style={styles.pictureButtonText}>Library</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  </View>
                )}
              </View>
              </ImageBackground>
            </Animated.View>
          </TouchableWithoutFeedback>
          
          {/* Create button - positioned at bottom */}
          {selectedType && (
            <View style={styles.createButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (currentScreen === 'members' ? !canContinue() : !canCreate()) && styles.createButtonDisabled
                ]}
                onPress={currentScreen === 'members' ? handleContinue : handleCreate}
                disabled={(currentScreen === 'members' ? !canContinue() : !canCreate()) || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.createButtonText,
                    (currentScreen === 'members' ? !canContinue() : !canCreate()) && styles.createButtonTextDisabled
                  ]}>
                    {currentScreen === 'members' ? 'Continue' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 0, // No padding since button is absolute
    height: SCREEN_HEIGHT * 0.97, // Increased height to reduce top gap
    overflow: 'hidden', // Ensure rounded corners work with background
  },
  backgroundImage: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  backgroundImageStyle: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 40,
    height: 6,
    backgroundColor: '#C0C0C0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    flex: 1,
  },
  subtitle: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginLeft: 12,
    flex: 1,
  },
  optionDescription: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F',
    marginLeft: 12,
  },
  // Member selection styles
  memberSelectionContainer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E', // Same as Channels screen
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: getFontSize('BASE'),
    color: '#3A3A3E', // Same as Channels screen
    backgroundColor: '#FFFFFF',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 2,
    marginBottom: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: getFontSize('SM'),
    color: '#3A3A3E', // Same as Channels screen
    paddingVertical: 0,
  },
  membersListContainer: {
    flex: 1,
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  flatListContent: {
    paddingBottom: SCREEN_HEIGHT * 0.18, // 18% of screen height for responsive bottom padding
    flexGrow: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
    backgroundColor: 'transparent',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#5A5A5F',
    textTransform: 'capitalize',
  },
  memberActions: {
    width: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: getFontSize('BASE'),
    color: '#5A5A5F', // Same as Channels screen descriptions
    textAlign: 'center',
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // Safe area
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  createButton: {
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  createButtonText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
  },
  createButtonTextDisabled: {
    color: '#8E8E93',
  },
  // Screen animation styles
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  screen: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  detailsScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Second screen styles
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    marginLeft: 8,
  },
  memberCountContainer: {
    marginBottom: 24,
  },
  memberCountText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#5A5A5F',
  },
  pictureContainer: {
    marginBottom: 20,
  },
  pictureSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  picturePreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  picturePreviewText: {
    fontSize: getFontSize('XS'),
    color: '#007AFF',
    textAlign: 'center',
  },
  previewImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  pictureButtons: {
    flex: 1,
    gap: 12,
  },
  pictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    gap: 8,
  },
  pictureButtonText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#007AFF',
  },
});

export default CreateChannelModal;







