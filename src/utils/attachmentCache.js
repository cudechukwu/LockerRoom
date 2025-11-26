/**
 * Attachment Cache Utility
 * Downloads and caches event attachments to device storage
 * Provides cached file paths for in-app viewing
 */

import * as FileSystem from 'expo-file-system/legacy';

// Cache directory for event attachments
const CACHE_DIR = `${FileSystem.cacheDirectory}event-attachments/`;

/**
 * Decode filename (remove URL encoding like %20)
 * @param {string} filename - Possibly URL-encoded filename
 * @returns {string} Decoded filename
 */
function decodeFilename(filename) {
  try {
    // Decode URL-encoded characters (e.g., %20 -> space)
    return decodeURIComponent(filename);
  } catch (error) {
    // If decoding fails, return original
    return filename;
  }
}

/**
 * Get cached file path for an attachment
 * @param {string} attachmentId - Attachment ID
 * @param {string} filename - Original filename (may be URL-encoded)
 * @returns {string} Local file path
 */
export function getCachedFilePath(attachmentId, filename) {
  const decodedFilename = decodeFilename(filename);
  return `${CACHE_DIR}${attachmentId}_${decodedFilename}`;
}

/**
 * Check if attachment is cached locally
 * @param {string} attachmentId - Attachment ID
 * @param {string} filename - Original filename (may be URL-encoded)
 * @returns {Promise<boolean>} True if file exists in cache
 */
export async function isAttachmentCached(attachmentId, filename) {
  try {
    // Try decoded filename first (preferred)
    const decodedFilename = decodeFilename(filename);
    const filePath = getCachedFilePath(attachmentId, decodedFilename);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    if (fileInfo.exists) {
      return true;
    }
    
    // If decoded doesn't exist, try with original (in case file was saved with encoded name)
    // This handles migration from old cached files
    if (filename !== decodedFilename) {
      const encodedPath = `${CACHE_DIR}${attachmentId}_${filename}`;
      const encodedInfo = await FileSystem.getInfoAsync(encodedPath);
      return encodedInfo.exists;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking cache:', error);
    return false;
  }
}

/**
 * Download and cache an attachment
 * @param {string} downloadUrl - Signed URL to download from
 * @param {string} attachmentId - Attachment ID
 * @param {string} filename - Original filename
 * @param {Function} onProgress - Optional progress callback (0-1)
 * @returns {Promise<string>} Local file path
 */
export async function downloadAndCacheAttachment(
  downloadUrl,
  attachmentId,
  filename,
  onProgress = null
) {
  try {
    // Decode filename to ensure proper file system path
    const decodedFilename = decodeFilename(filename);
    
    // Ensure cache directory exists
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }

    const filePath = getCachedFilePath(attachmentId, decodedFilename);

    // Check if already cached
    const cached = await isAttachmentCached(attachmentId, filename);
    if (cached) {
      console.log(`✅ Using cached file: ${filename}`);
      return filePath;
    }

    console.log(`📥 Downloading attachment: ${decodedFilename}`);

    // Download file with progress tracking
    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      filePath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) {
          onProgress(progress);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    
    if (!result) {
      throw new Error('Download failed - no result');
    }

    console.log(`✅ Downloaded and cached: ${decodedFilename}`);
    return result.uri;
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
}

/**
 * Open attachment in-app (view or share)
 * NOTE: This function is deprecated. Use DocumentViewer component instead.
 * This function is kept for backward compatibility but should not be used.
 * 
 * @deprecated Use DocumentViewer component for in-app viewing
 * @param {string} filePath - Local file path
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 */
export async function openAttachment(filePath, filename, mimeType) {
  // This function is deprecated - we use DocumentViewer component instead
  // which handles file viewing in-app without needing Linking.openURL()
  console.warn('openAttachment() is deprecated. Use DocumentViewer component instead.');
  
  // For sharing only (not opening), we can use expo-sharing
  try {
    const Sharing = require('expo-sharing');
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      // Use expo-sharing for sharing (not opening)
      await Sharing.shareAsync(filePath, {
        mimeType: mimeType || 'application/octet-stream',
        dialogTitle: `Share ${filename}`,
      });
      return;
    }
  } catch (sharingError) {
    console.log('expo-sharing not available (needs rebuild)');
  }

  // If sharing is not available, show message
  const { Alert } = require('react-native');
  Alert.alert(
    'File Ready',
    `${filename} has been downloaded and cached. Use DocumentViewer to view it in-app.`,
    [{ text: 'OK' }]
  );
}

/**
 * Get attachment with caching
 * Downloads if not cached, returns cached path if available
 * @param {Object} attachment - Attachment object with id, filename, s3_url, file_type
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<string>} Local file path
 */
export async function getAttachmentWithCache(attachment, onProgress = null) {
  const { id, filename, s3_url, file_type } = attachment;

  // Check cache first
  const cached = await isAttachmentCached(id, filename);
  if (cached) {
    return getCachedFilePath(id, filename);
  }

  // Download if not cached
  if (!s3_url) {
    throw new Error('No download URL available for attachment');
  }

  return await downloadAndCacheAttachment(s3_url, id, filename, onProgress);
}

/**
 * Clear all cached attachments (for cleanup)
 */
export async function clearAttachmentCache() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      console.log('✅ Cleared attachment cache');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache size (for debugging)
 */
export async function getCacheSize() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      return 0;
    }
    
    // Note: FileSystem doesn't have a direct way to get directory size
    // This would require iterating through files
    return 0; // Placeholder
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
}

