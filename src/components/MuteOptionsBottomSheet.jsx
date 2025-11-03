import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MuteOptionsBottomSheet = ({ visible, onClose, onSelectDuration }) => {
  const muteOptions = [
    { id: '8h', label: '8 hours', icon: 'time' },
    { id: '24h', label: '24 hours', icon: 'time' },
    { id: 'until', label: 'Until unmuted', icon: 'infinite' },
    { id: 'unmute', label: 'Unmute', icon: 'volume-high' },
  ];

  const handleSelectDuration = (duration) => {
    onSelectDuration(duration.label);
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
          
          <View style={styles.content}>
            <View style={styles.titleContainer}>
              <Ionicons name="megaphone" size={20} color="#FFFFFF" />
              <Text style={styles.title}>Mute Notifications</Text>
            </View>
            <Text style={styles.subtitle}>Choose how long to mute notifications</Text>
            
            <View style={styles.optionsContainer}>
              {muteOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    index === muteOptions.length - 1 && styles.lastOption
                  ]}
                  onPress={() => handleSelectDuration(option)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={option.icon} size={20} color="#FFFFFF" />
                  <Text style={styles.optionText}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
    maxHeight: SCREEN_HEIGHT * 0.4,
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1C1C1E',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3A3E',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3E',
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('REGULAR'),
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3E',
  },
  cancelText: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#FFFFFF',
  },
});

export default MuteOptionsBottomSheet;
