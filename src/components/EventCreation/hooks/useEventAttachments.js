/**
 * useEventAttachments Hook
 * Manages file attachment state and file picking
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Hook for managing event attachments
 * @param {Array} initialAttachments - Initial attachments array (optional)
 * @returns {object} Attachment state and handlers
 */
export function useEventAttachments(initialAttachments = []) {
  const [attachments, setAttachments] = useState(initialAttachments);

  /**
   * Pick files using document picker
   * @param {object} options - Document picker options
   * @param {string} options.type - File type filter (default: all file types)
   * @param {boolean} options.multiple - Allow multiple files (default: true)
   * @returns {Promise<void>}
   */
  const pickFiles = async (options = {}) => {
    const {
      type = '*/*',
      multiple = true,
      copyToCacheDirectory = true,
    } = options;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type,
        multiple,
        copyToCacheDirectory,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || 'Untitled',
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        }));
        
        setAttachments(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files. Please try again.');
    }
  };

  /**
   * Remove attachment by index
   * @param {number} index - Index of attachment to remove
   */
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Remove all attachments
   */
  const clearAttachments = () => {
    setAttachments([]);
  };

  /**
   * Add attachments (useful for prefilling from edit mode)
   * @param {Array} files - Array of file objects to add
   */
  const addAttachments = (files) => {
    if (Array.isArray(files) && files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
    }
  };

  /**
   * Replace all attachments
   * @param {Array} files - Array of file objects
   */
  const setAttachmentsList = (files) => {
    setAttachments(Array.isArray(files) ? files : []);
  };

  return {
    attachments,
    pickFiles,
    removeAttachment,
    clearAttachments,
    addAttachments,
    setAttachments: setAttachmentsList,
  };
}

