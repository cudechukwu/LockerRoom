/**
 * AttachmentsCard Component
 * Pure UI component for displaying attachments
 * 
 * Displays:
 * - List of computed attachments (with all data pre-computed)
 * - Loading state
 * - Download progress
 * 
 * NO business logic - all logic comes from computed attachments
 * Attachment handling is done via onAttachmentPress callback
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';
import GradientCard from '../EventCreation/GradientCard';

const AttachmentsCard = ({
  computedAttachments = [],
  isLoading = false,
  onAttachmentPress,
}) => {
  if (isLoading) {
    return (
      <GradientCard>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.loadingText}>Loading attachments...</Text>
        </View>
      </GradientCard>
    );
  }

  if (!computedAttachments || computedAttachments.length === 0) {
    return null;
  }

  return (
    <GradientCard>
      <Text style={styles.cardTitle}>Attachments</Text>
      <View style={styles.attachmentsList}>
        {computedAttachments.map((attachment, index) => {
          const isPDF = attachment.filename.toLowerCase().endsWith('.pdf');
          const fileExt = attachment.filename.split('.').pop()?.toUpperCase() || 'FILE';
          
          return (
            <View key={attachment.id}>
              <TouchableOpacity
                style={styles.attachmentItem}
                onPress={() => onAttachmentPress(attachment)}
                activeOpacity={0.7}
                disabled={attachment.isDownloading}
              >
                <View style={styles.attachmentIcon}>
                  <Ionicons 
                    name={isPDF ? "document-text" : "document-outline"} 
                    size={18} 
                    color={COLORS.TEXT_SECONDARY} 
                  />
                </View>
                
                <View style={styles.attachmentInfo}>
                  <View style={styles.attachmentRow}>
                    <Text style={styles.attachmentFileName} numberOfLines={1}>
                      {attachment.filename}
                    </Text>
                    <View style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeText}>{fileExt}</Text>
                    </View>
                  </View>
                  {attachment.fileSize && (
                    <Text style={styles.attachmentFileSize}>
                      {(attachment.fileSize / 1024).toFixed(1)} KB
                      {attachment.isDownloading && ` • ${Math.round(attachment.downloadProgress * 100)}%`}
                    </Text>
                  )}
                </View>
                
                {attachment.isDownloading ? (
                  <ActivityIndicator size="small" color={COLORS.TEXT_SECONDARY} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_TERTIARY} />
                )}
              </TouchableOpacity>
              {index < computedAttachments.length - 1 && <View style={styles.attachmentDivider} />}
            </View>
          );
        })}
      </View>
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  cardTitle: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_SECONDARY,
  },
  attachmentsList: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  attachmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  attachmentFileName: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    fontWeight: FONT_WEIGHTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: 8,
  },
  fileTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileTypeText: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    fontWeight: FONT_WEIGHTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  attachmentFileSize: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_TERTIARY,
  },
  attachmentDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 64, // Align with content (icon + margin)
  },
});

export default AttachmentsCard;

