import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/chatColors';
import { fonts } from '../constants/chatFonts';

const AttachmentModal = ({ 
  visible, 
  onClose, 
  onSelectPhotos, 
  onSelectCamera, 
  onSelectFiles, 
  onSelectGIFs 
}) => {
  if (!visible) return null;

  const handlePhotos = () => {
    onClose();
    onSelectPhotos();
  };

  const handleCamera = () => {
    onClose();
    onSelectCamera();
  };

  const handleFiles = () => {
    onClose();
    onSelectFiles();
  };

  const handleGIFs = () => {
    onClose();
    onSelectGIFs();
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      />
      
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Attach File</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          {/* Photos */}
          <TouchableOpacity style={styles.option} onPress={handlePhotos}>
            <View style={styles.optionIcon}>
              <Ionicons name="images-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.optionText}>Photos</Text>
            <Text style={styles.optionSubtext}>Choose from library</Text>
          </TouchableOpacity>

          {/* Camera */}
          <TouchableOpacity style={styles.option} onPress={handleCamera}>
            <View style={styles.optionIcon}>
              <Ionicons name="camera-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.optionText}>Camera</Text>
            <Text style={styles.optionSubtext}>Take a photo</Text>
          </TouchableOpacity>

          {/* Files */}
          <TouchableOpacity style={styles.option} onPress={handleFiles}>
            <View style={styles.optionIcon}>
              <Ionicons name="document-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.optionText}>Files</Text>
            <Text style={styles.optionSubtext}>Documents, PDFs, etc.</Text>
          </TouchableOpacity>

          {/* GIFs */}
          <TouchableOpacity style={styles.option} onPress={handleGIFs}>
            <View style={styles.optionIcon}>
              <Ionicons name="happy-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.optionText}>GIFs</Text>
            <Text style={styles.optionSubtext}>Animated GIFs</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area for iPhone
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  optionSubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray,
    marginTop: 2,
  },
});

export default AttachmentModal;
