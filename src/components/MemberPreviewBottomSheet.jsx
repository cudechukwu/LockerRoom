import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MemberPreviewBottomSheet = ({ visible, member, onClose, conversationType, isCurrentUserAdmin, onUpdateRole, teamId }) => {
  if (!member) return null;

  const getRoleDisplay = (teamRole, channelRole) => {
    const teamRoleMap = {
      'admin': 'Admin',
      'coach': 'Coach',
      'trainer': 'Trainer',
      'captain': 'Captain',
      'player': 'Player',
      'alumni': 'Alumni'
    };

    const channelRoleMap = {
      'admin': 'Owner',
      'moderator': 'Moderator',
      'member': 'Member'
    };

    if (channelRole && channelRole !== 'member') {
      return `${teamRoleMap[teamRole]} • ${channelRoleMap[channelRole]}`;
    }
    return teamRoleMap[teamRole];
  };

  const getRoleColor = (teamRole, channelRole) => {
    if (channelRole === 'admin') return '#FF3B30';
    if (channelRole === 'moderator') return '#FF9500';
    if (teamRole === 'admin') return '#FF3B30';
    if (teamRole === 'coach') return '#007AFF';
    if (teamRole === 'trainer') return '#34C759';
    if (teamRole === 'captain') return '#FF9500';
    return '#8E8E93';
  };

  const navigation = useNavigation();

  const handleViewProfile = () => {
    if (!member.user_id || !teamId) {
      console.error('Missing user_id or teamId for profile navigation');
      onClose();
      return;
    }
    
    onClose();
    navigation.navigate('ViewProfile', {
      userId: member.user_id,
      teamId: teamId,
      userName: member.name,
    });
  };

  const handleMuteUser = () => {
    // TODO: Implement mute user logic
    onClose();
  };

  const handleBlockUser = () => {
    // TODO: Implement block user logic
    onClose();
  };

  const handlePromoteToAdmin = () => {
    if (onUpdateRole && member.user_id) {
      onUpdateRole(member.user_id, 'admin');
    }
  };

  const handleDemoteFromAdmin = () => {
    if (onUpdateRole && member.user_id) {
      onUpdateRole(member.user_id, 'member');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Member Header */}
            <View style={styles.memberHeader}>
              <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.position && (
                  <Text style={styles.memberPosition}>{member.position}</Text>
                )}
                <View style={styles.roleContainer}>
                  <View style={[
                    styles.roleChip,
                    { backgroundColor: getRoleColor(member.teamRole, member.channelRole) }
                  ]}>
                    <Text style={styles.roleText}>
                      {getRoleDisplay(member.teamRole, member.channelRole)}
                    </Text>
                  </View>
                  {member.isOnline && <View style={styles.onlineIndicator} />}
                </View>
              </View>
            </View>

            {/* Status Info */}
            <View style={styles.statusSection}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={styles.statusValue}>
                {member.isOnline ? 'Online' : `Last seen ${member.lastSeen || 'unknown'}`}
              </Text>
            </View>

            {/* Bio (if available) */}
            {member.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.bioLabel}>Bio</Text>
                <Text style={styles.bioValue}>{member.bio}</Text>
              </View>
            )}

            {/* Role Management (only for admins) */}
            {isCurrentUserAdmin && conversationType !== 'dm' && (
              <View style={styles.roleManagementSection}>
                {member.channelRole !== 'admin' ? (
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handlePromoteToAdmin}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="shield" size={20} color="#007AFF" />
                    <Text style={styles.actionText}>Make Admin</Text>
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.dangerAction]}
                    onPress={handleDemoteFromAdmin}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="shield-outline" size={20} color="#FF9500" />
                    <Text style={[styles.actionText, styles.dangerText]}>Remove Admin</Text>
                    <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsSection}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleViewProfile}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={20} color="#007AFF" />
                <Text style={styles.actionText}>View Profile</Text>
                <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
              </TouchableOpacity>

              {conversationType === 'dm' && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleMuteUser}
                  activeOpacity={0.7}
                >
                  <Ionicons name="volume-mute" size={20} color="#FF9500" />
                  <Text style={styles.actionText}>Mute User</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>
              )}

              {conversationType === 'dm' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.dangerAction]}
                  onPress={handleBlockUser}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ban" size={20} color="#FF3B30" />
                  <Text style={[styles.actionText, styles.dangerText]}>Block User</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    minHeight: 300,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3A3E',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#1C1C1E',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3E',
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('BOLD'),
    color: '#FFFFFF',
    marginBottom: 4,
  },
  memberPosition: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#8E8E93',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
    color: 'white',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  statusSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3E',
  },
  statusLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#8E8E93',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#FFFFFF',
  },
  bioSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3E',
  },
  bioLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#8E8E93',
    marginBottom: 4,
  },
  bioValue: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#FFFFFF',
    lineHeight: 22,
  },
  roleManagementSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3E',
  },
  actionsSection: {
    paddingVertical: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3E',
  },
  actionText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  dangerAction: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF3B30',
  },
});

export default MemberPreviewBottomSheet;
