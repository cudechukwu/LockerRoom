/**
 * useAttachments Hook
 * Generic attachment controller - reusable across events, chat, files, etc.
 * 
 * Handles:
 * - Attachment caching
 * - File downloads with progress
 * - Thumbnail management
 * - MIME type detection
 * - File URI preparation
 * 
 * Returns computed attachment objects with all necessary data and methods.
 * 
 * This hook is the SINGLE SOURCE OF TRUTH for all attachment operations.
 * UI components should NEVER directly call attachmentCache functions.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  getAttachmentWithCache, 
  isAttachmentCached, 
  getCachedFilePath 
} from '../utils/attachmentCache';

/**
 * Check if file is an image
 */
function isImageFile(filename, mimeType) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];
  const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/heic', 'image/heif'];
  
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(ext) || imageMimeTypes.includes(mimeType?.toLowerCase());
}

/**
 * Prepare file URI for DocumentViewer
 * Ensures proper protocol and decoding
 */
function prepareFileUri(filePath) {
  if (!filePath) return null;
  
  let viewerUri = filePath;
  
  // Decode any URL-encoded characters (e.g., %20 -> space)
  try {
    if (viewerUri && viewerUri.includes('%')) {
      viewerUri = decodeURIComponent(viewerUri);
    }
  } catch (e) {
    // Silently fail - return original path
  }
  
  // Ensure file:// protocol is present
  if (viewerUri && !viewerUri.startsWith('file://') && !viewerUri.startsWith('http') && !viewerUri.startsWith('content://')) {
    viewerUri = `file://${viewerUri}`;
  }
  
  return viewerUri;
}

/**
 * Generic attachment controller hook
 * @param {Array} attachments - Array of attachment objects
 * @returns {Object} { attachments: Array<ComputedAttachment>, error: Error | null }
 */
export function useAttachments(attachments = []) {
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [cachedThumbnails, setCachedThumbnails] = useState({});
  const [error, setError] = useState(null);
  
  // Track mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Use ref to track previous attachment IDs to prevent infinite loops
  const previousAttachmentIdsRef = useRef('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check for cached thumbnails when attachments change
  useEffect(() => {
    // Create a stable string representation of attachment IDs
    const attachmentIds = attachments
      .map(att => att?.id)
      .filter(Boolean)
      .sort()
      .join(',');
    
    // Only run if attachment IDs have actually changed
    if (attachmentIds === previousAttachmentIdsRef.current) {
      return;
    }
    
    previousAttachmentIdsRef.current = attachmentIds;
    
    const checkCachedThumbnails = async () => {
      if (!attachments || attachments.length === 0) {
        if (isMountedRef.current) {
          setCachedThumbnails({});
        }
        return;
      }
      
      const thumbnailMap = {};
      await Promise.all(
        attachments.map(async (attachment) => {
          // Only check cache for images
          if (isImageFile(attachment.filename, attachment.file_type)) {
            try {
              const cached = await isAttachmentCached(attachment.id, attachment.filename);
              if (cached) {
                thumbnailMap[attachment.id] = getCachedFilePath(attachment.id, attachment.filename);
              }
            } catch (err) {
              // Silently fail - will use fallback URL
            }
          }
        })
      );
      
      if (isMountedRef.current) {
        setCachedThumbnails(thumbnailMap);
      }
    };
    
    checkCachedThumbnails();
  }, [attachments]);

  /**
   * Get stable thumbnail source for an attachment
   * Memoized to ensure stable return values
   */
  const getThumbnailSource = useCallback((attachment) => {
    if (!attachment) return null;
    
    // Check if we have cached thumbnail path (preferred for images)
    if (cachedThumbnails[attachment.id]) {
      return cachedThumbnails[attachment.id];
    }

    // If it's an image, use signed URL as fallback
    if (isImageFile(attachment.filename, attachment.file_type)) {
      return attachment.s3_url || attachment.thumbnail_url || null;
    }
    
    // For PDFs, use thumbnail_url if available
    if (attachment.filename.toLowerCase().endsWith('.pdf') && attachment.thumbnail_url) {
      return attachment.thumbnail_url;
    }
    
    return null;
  }, [cachedThumbnails]);

  /**
   * Open attachment - downloads if needed, returns file URI
   * Returns null on error (error is set in state)
   */
  const openAttachment = useCallback(async (attachment) => {
    if (!attachment) {
      const err = new Error('No attachment provided');
      if (isMountedRef.current) {
        setError(err);
      }
      return null;
    }

    if (!isMountedRef.current) {
      return null;
    }

    try {
      setError(null);
      setDownloadingAttachmentId(attachment.id);

      // Check if already cached
      const cached = await isAttachmentCached(attachment.id, attachment.filename);
      
      if (!isMountedRef.current) {
        return null;
      }
      
      let filePath;
      if (cached) {
        // Use cached file
        filePath = getCachedFilePath(attachment.id, attachment.filename);
      } else {
        // Download and cache
        filePath = await getAttachmentWithCache(
          attachment,
          (progress) => {
            // Only update if still mounted
            if (isMountedRef.current) {
              setDownloadProgress(prev => ({
                ...prev,
                [attachment.id]: progress
              }));
            }
          }
        );
      }

      if (!isMountedRef.current) {
        return null;
      }

      // Update thumbnail if it's an image and was just downloaded
      if (isImageFile(attachment.filename, attachment.file_type) && !cached) {
        const cachedPath = getCachedFilePath(attachment.id, attachment.filename);
        setCachedThumbnails(prev => ({ ...prev, [attachment.id]: cachedPath }));
      }

      // Prepare URI for DocumentViewer
      const viewerUri = prepareFileUri(filePath);

      // Clear download state
      setDownloadingAttachmentId(null);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[attachment.id];
        return newProgress;
      });

      return viewerUri;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
        setDownloadingAttachmentId(null);
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[attachment.id];
          return newProgress;
        });
      }
      return null;
    }
  }, []);

  /**
   * Computed attachment objects - memoized for stable references
   * Each attachment gets a computed object with all necessary data and methods
   * Includes original attachment data to avoid reverse mapping in UI
   */
  const computedAttachments = useMemo(() => {
    return attachments.map(attachment => {
      const attachmentId = attachment.id;
      return {
        // Original attachment data (to avoid reverse mapping)
        ...attachment,
        
        // Computed properties
        thumbnail: getThumbnailSource(attachment),
        isImage: isImageFile(attachment.filename, attachment.file_type),
        isDownloading: downloadingAttachmentId === attachmentId,
        downloadProgress: downloadProgress[attachmentId] || 0,
        
        // Methods - create stable function references
        open: () => openAttachment(attachment),
      };
    });
  }, [attachments, cachedThumbnails, downloadingAttachmentId, downloadProgress, getThumbnailSource, openAttachment]);

  return {
    attachments: computedAttachments,
    error,
  };
}

