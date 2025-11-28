/**
 * EventAttachmentsSection Component
 * Collapsible section for managing event attachments
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';
import GradientCard from './GradientCard';

const EventAttachmentsSection = ({
  attachments = [],
  isExpanded,
  onToggleExpanded,
  onPickFiles,
  onRemoveAttachment,
  isUploading = false,
}) => {
  return (
    <GradientCard>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={onToggleExpanded}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsibleHeaderText}>Attachments</Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={COLORS.TEXT_SECONDARY}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.collapsibleContent}>
          <TouchableOpacity 
            style={styles.attachmentButton}
            onPress={onPickFiles}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <Ionicons name="attach-outline" size={20} color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.attachmentButtonText}>
              {isUploading ? 'Uploading...' : 'Add Files'}
            </Text>
            {isUploading && (
              <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} style={styles.loader} />
            )}
          </TouchableOpacity>
          
          {attachments.length > 0 && (
            <View style={styles.attachmentsList}>
              {attachments.map((file, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Ionicons name="document-outline" size={20} color={COLORS.TEXT_SECONDARY} />
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentFileName} numberOfLines={1}>
                      {file.name || 'Untitled'}
                    </Text>
                    {file.size && (
                      <Text style={styles.attachmentFileSize}>
                        {(file.size / 1024).toFixed(1)} KB
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => onRemoveAttachment(index)}
                    style={styles.removeButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.TEXT_SECONDARY} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  collapsibleHeaderText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
  },
  collapsibleContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: 8,
  },
  attachmentButtonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  loader: {
    marginLeft: 8,
  },
  attachmentsList: {
    marginTop: 12,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentFileName: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
  },
  attachmentFileSize: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
});

export default EventAttachmentsSection;

