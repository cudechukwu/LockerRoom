/**
 * Attendance Group Modal
 * Create or edit custom attendance groups
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createAttendanceGroup,
  updateAttendanceGroup,
  getGroupMembers,
  bulkAddMembersToGroup,
  bulkRemoveMembersFromGroup,
} from '../api/attendanceGroups';
import { fetchTeamMembers } from '../api/teamMembers';
import { useSupabase } from '../providers/SupabaseProvider';

const AttendanceGroupModal = ({ visible, onClose, onSave, teamId, group = null }) => {
  const supabase = useSupabase();
  const insets = useSafeAreaInsets();
  const isEditing = !!group;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [teamMembers, setTeamMembers] = useState([]);
  const [existingMembers, setExistingMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible && teamId && supabase) {
      loadTeamMembers();
      if (isEditing) {
        loadGroupData();
      } else {
        // Reset form for new group
        setName('');
        setDescription('');
        setSelectedMembers(new Set());
        setExistingMembers([]);
      }
    }
  }, [visible, teamId, group, supabase]);

  const loadTeamMembers = async () => {
    if (!teamId) return;

    try {
      setIsLoadingMembers(true);
      const members = await fetchTeamMembers(supabase, teamId);
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      Alert.alert('Error', 'Failed to load team members.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadGroupData = async () => {
    if (!group) return;

    try {
      setIsLoadingMembers(true);
      setName(group.name || '');
      setDescription(group.description || '');

      // Load existing members
      const { data: members } = await getGroupMembers(supabase, group.id);
      const memberIds = new Set((members || []).map(m => m.user_id));
      setSelectedMembers(memberIds);
      setExistingMembers(members || []);
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const toggleMember = (userId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Group name is required.');
      return;
    }

    if (!teamId) {
      Alert.alert('Error', 'Team ID is missing.');
      return;
    }

    try {
      setIsLoading(true);

      if (isEditing) {
        // Update group
        const { error: updateError } = await updateAttendanceGroup(supabase, group.id, {
          name: name.trim(),
          description: description.trim() || null,
        });

        if (updateError) throw updateError;

        // Update members
        const currentMemberIds = new Set(existingMembers.map(m => m.user_id));
        const newMemberIds = Array.from(selectedMembers);
        const toAdd = newMemberIds.filter(id => !currentMemberIds.has(id));
        const toRemove = Array.from(currentMemberIds).filter(id => !selectedMembers.has(id));

        if (toAdd.length > 0) {
          const { error: addError } = await bulkAddMembersToGroup(supabase, group.id, toAdd);
          if (addError) throw addError;
        }

        if (toRemove.length > 0) {
          const { error: removeError } = await bulkRemoveMembersFromGroup(supabase, group.id, toRemove);
          if (removeError) throw removeError;
        }
      } else {
        // Create new group
        const { data: newGroup, error: createError } = await createAttendanceGroup(supabase, teamId, {
          name: name.trim(),
          description: description.trim() || null,
        });

        if (createError) throw createError;

        // Add members
        if (selectedMembers.size > 0) {
          const { error: addError } = await bulkAddMembersToGroup(
            supabase,
            newGroup.id,
            Array.from(selectedMembers)
          );
          if (addError) throw addError;
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert('Error', error.message || 'Failed to save group.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={80} tint="dark" style={styles.modalBlur} />
        <View style={styles.modalTint} />
        <View style={[styles.modalContent, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Group' : 'Create Group'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Group Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Group Name *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g., D-Line, Traveling Squad, Film Crew"
                placeholderTextColor={COLORS.TEXT_TERTIARY}
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add a description for this group..."
                placeholderTextColor={COLORS.TEXT_TERTIARY}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            {/* Members Section */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Members</Text>
              <Text style={styles.fieldHint}>
                Select team members to add to this group
              </Text>

              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.TEXT_TERTIARY} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search members..."
                  placeholderTextColor={COLORS.TEXT_TERTIARY}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={COLORS.TEXT_TERTIARY} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Members List */}
              {isLoadingMembers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                </View>
              ) : filteredMembers.length === 0 ? (
                <View style={styles.emptyMembers}>
                  <Text style={styles.emptyMembersText}>
                    {searchQuery ? 'No members found' : 'No team members available'}
                  </Text>
                </View>
              ) : (
                <View style={styles.membersList}>
                  {filteredMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.id);
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={styles.memberItem}
                        onPress={() => toggleMember(member.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.memberInfo}>
                          {member.avatarUrl ? (
                            <View style={styles.avatarContainer}>
                              <Text style={styles.avatarText}>
                                {member.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.avatarContainer}>
                              <Text style={styles.avatarText}>
                                {member.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.memberDetails}>
                            <Text style={styles.memberName}>{member.name}</Text>
                            <Text style={styles.memberHandle}>{member.handle}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                          ]}
                        >
                          {isSelected && (
                            <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {selectedMembers.size > 0 && (
                <Text style={styles.selectedCount}>
                  {selectedMembers.size} {selectedMembers.size === 1 ? 'member' : 'members'} selected
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    padding: 4,
  },
  cancelButtonText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  headerTitle: {
    fontSize: scaleFont(FONT_SIZES.XL),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.WHITE,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
    color: COLORS.WHITE,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.WHITE,
    borderWidth: 0,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.WHITE,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyMembers: {
    padding: 40,
    alignItems: 'center',
  },
  emptyMembersText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
  },
  membersList: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.WHITE,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: scaleFont(FONT_SIZES.BASE),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.WHITE,
    marginBottom: 2,
  },
  memberHandle: {
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_TERTIARY,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.TEXT_TERTIARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  selectedCount: {
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default AttendanceGroupModal;

