import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const EventDetailsModal = ({ 
  visible, 
  onClose, 
  onEdit,
  onDelete,
  event = null
}) => {
  if (!event) return null;

  const formatEventDate = (date) => {
    if (!date) return '';
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatEventTime = (startTime, endTime) => {
    if (!startTime) return '';
    return endTime ? `${startTime} - ${endTime}` : startTime;
  };

  const getEventTypeInfo = () => {
    const eventTypes = {
      practice: { title: 'Practice', icon: 'P' },
      game: { title: 'Game', icon: 'G' },
      meeting: { title: 'Meeting', icon: 'M' },
      film: { title: 'Film', icon: 'F' },
      training: { title: 'Training', icon: 'T' },
      other: { title: 'Other', icon: 'O' },
    };
    
    return eventTypes[event.eventType] || eventTypes.other;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDelete(event);
            onClose();
          }
        }
      ]
    );
  };

  const handleEdit = () => {
    onEdit(event);
    onClose();
  };

  const eventTypeInfo = getEventTypeInfo();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={COLORS.PRIMARY_BLACK} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Type Badge */}
          <View style={styles.eventTypeSection}>
            <View style={[styles.eventTypeBadge, { backgroundColor: event.color || '#6B7280' }]}>
              <Text style={styles.eventTypeIcon}>{eventTypeInfo.icon}</Text>
            </View>
            <Text style={styles.eventTypeText}>{eventTypeInfo.title}</Text>
            {event.postTo && (
              <View style={styles.postToTag}>
                <Text style={styles.postToText}>
                  {event.postTo === 'Team' ? '👥 Team Event' : 
                   event.postTo === 'Personal' ? '👤 Personal' : 
                   `👥 ${event.postTo}`}
                </Text>
              </View>
            )}
          </View>

          {/* Event Title */}
          <View style={styles.section}>
            <Text style={styles.eventTitle}>{event.title}</Text>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{formatEventDate(event.date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>{formatEventTime(event.startTime, event.endTime)}</Text>
            </View>
          </View>

          {/* Location */}
          {event.location && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text style={styles.infoText}>{event.location}</Text>
              </View>
            </View>
          )}

          {/* Recurring */}
          {event.recurring && event.recurring !== 'None' && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Ionicons name="repeat-outline" size={20} color="#6B7280" />
                <Text style={styles.infoText}>Repeats {event.recurring.toLowerCase()}</Text>
              </View>
            </View>
          )}

          {/* Attendance (for team events) */}
          {event.postTo === 'Team' && event.attending && event.total && (
            <View style={styles.section}>
              <View style={styles.attendanceCard}>
                <View style={styles.attendanceHeader}>
                  <Ionicons name="people-outline" size={20} color="#6B7280" />
                  <Text style={styles.attendanceTitle}>Attendance</Text>
                </View>
                <View style={styles.attendanceStats}>
                  <Text style={styles.attendanceNumber}>{event.attending}/{event.total}</Text>
                  <Text style={styles.attendanceLabel}>attending</Text>
                </View>
              </View>
            </View>
          )}

          {/* Notes */}
          {event.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{event.notes}</Text>
              </View>
            </View>
          )}

          {/* Created By */}
          {event.createdBy && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#6B7280" />
                <Text style={styles.infoText}>Created by {event.createdBy}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  eventTypeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  eventTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventTypeIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: getFontWeight('BOLD'),
  },
  eventTypeText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    flex: 1,
  },
  postToTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postToText: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  eventTitle: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    lineHeight: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.PRIMARY_BLACK,
    marginLeft: 12,
    flex: 1,
  },
  attendanceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    marginLeft: 8,
  },
  attendanceStats: {
    alignItems: 'center',
  },
  attendanceNumber: {
    fontSize: getFontSize('2XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 4,
  },
  attendanceLabel: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    color: COLORS.PRIMARY_BLACK,
    marginBottom: 8,
  },
  notesCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('REGULAR'),
    color: COLORS.PRIMARY_BLACK,
    lineHeight: 24,
  },
});

export default EventDetailsModal;

