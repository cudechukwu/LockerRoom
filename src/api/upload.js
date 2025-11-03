// File Upload API
// Handles file uploads to S3 with Supabase integration

import { supabase } from '../lib/supabase.js';

// =============================================
// FILE UPLOAD CONFIGURATION
// =============================================

const ALLOWED_FILE_TYPES = {
  images: ['png', 'jpg', 'jpeg', 'heic', 'gif', 'webp'],
  videos: ['mp4', 'mov', 'avi', 'mkv'],
  audio: ['mp3', 'm4a', 'wav', 'aac'],
  documents: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt']
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB for chunked uploads

// =============================================
// FILE VALIDATION
// =============================================

/**
 * Validate file type and size
 * @param {File} file - File object
 * @returns {Object} Validation result
 */
function validateFile(file) {
  const errors = [];
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }
  
  // Check file type
  const extension = file.name.split('.').pop().toLowerCase();
  const allAllowedTypes = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.videos,
    ...ALLOWED_FILE_TYPES.audio,
    ...ALLOWED_FILE_TYPES.documents
  ];
  
  if (!allAllowedTypes.includes(extension)) {
    errors.push(`File type .${extension} is not allowed`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fileType: getFileCategory(extension),
    extension
  };
}

/**
 * Get file category based on extension
 * @param {string} extension - File extension
 * @returns {string} File category
 */
function getFileCategory(extension) {
  if (ALLOWED_FILE_TYPES.images.includes(extension)) return 'image';
  if (ALLOWED_FILE_TYPES.videos.includes(extension)) return 'video';
  if (ALLOWED_FILE_TYPES.audio.includes(extension)) return 'audio';
  if (ALLOWED_FILE_TYPES.documents.includes(extension)) return 'document';
  return 'unknown';
}

// =============================================
// S3 UPLOAD FUNCTIONS
// =============================================

/**
 * Generate S3 signed URL for file upload
 * @param {string} teamId - Team ID
 * @param {string} channelId - Channel ID
 * @param {string} messageId - Message ID
 * @param {string} filename - Original filename
 * @param {string} fileType - MIME type
 * @param {number} fileSize - File size in bytes
 * @returns {Promise<Object>} Upload URL and metadata
 */
export async function getSignedUploadUrl(teamId, channelId, messageId, filename, fileType, fileSize) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Validate file
    const mockFile = { name: filename, size: fileSize };
    const validation = validateFile(mockFile);
    
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `teams/${teamId}/channels/${channelId}/${messageId}/${timestamp}_${sanitizedFilename}`;

    // Call Supabase function to get signed URL
    const { data, error } = await supabase.functions.invoke('get-signed-upload-url', {
      body: {
        s3Key,
        fileType,
        fileSize,
        teamId,
        channelId,
        messageId
      }
    });

    if (error) throw error;

    return {
      data: {
        uploadUrl: data.uploadUrl,
        s3Key,
        fileType: validation.fileType,
        extension: validation.extension
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting signed upload URL:', error);
    return { data: null, error };
  }
}

/**
 * Upload file to S3 using signed URL
 * @param {string} uploadUrl - Signed upload URL
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFileToS3(uploadUrl, file, onProgress = null) {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    return { data: null, error };
  }
}

/**
 * Complete file upload and create attachment record
 * @param {string} messageId - Message ID
 * @param {Object} fileData - File metadata
 * @returns {Promise<Object>} Attachment record
 */
export async function completeFileUpload(messageId, fileData) {
  try {
    const { data, error } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        team_id: fileData.teamId,
        filename: fileData.filename,
        file_type: fileData.fileType,
        file_size: fileData.fileSize,
        s3_key: fileData.s3Key,
        s3_url: fileData.s3Url
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error completing file upload:', error);
    return { data: null, error };
  }
}

// =============================================
// CHUNKED UPLOAD (for large files)
// =============================================

/**
 * Upload large file in chunks
 * @param {string} teamId - Team ID
 * @param {string} channelId - Channel ID
 * @param {string} messageId - Message ID
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFileInChunks(teamId, channelId, messageId, file, onProgress = null) {
  try {
    if (file.size <= CHUNK_SIZE) {
      // Use regular upload for small files
      return await uploadFile(teamId, channelId, messageId, file, onProgress);
    }

    // For large files, we'd implement multipart upload
    // This is a simplified version - in production you'd use S3 multipart upload
    throw new Error('Chunked upload not yet implemented');
  } catch (error) {
    console.error('Error in chunked upload:', error);
    return { data: null, error };
  }
}

// =============================================
// MAIN UPLOAD FUNCTION
// =============================================

/**
 * Upload a file to a message
 * @param {string} teamId - Team ID
 * @param {string} channelId - Channel ID
 * @param {string} messageId - Message ID
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Upload result
 */
export async function uploadFile(teamId, channelId, messageId, file, onProgress = null) {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Get signed upload URL
    const { data: uploadData, error: urlError } = await getSignedUploadUrl(
      teamId,
      channelId,
      messageId,
      file.name,
      file.type,
      file.size
    );

    if (urlError) throw urlError;

    // Upload file to S3
    const { error: uploadError } = await uploadFileToS3(
      uploadData.uploadUrl,
      file,
      onProgress
    );

    if (uploadError) throw uploadError;

    // Complete upload and create attachment record
    const { data: attachment, error: completeError } = await completeFileUpload(messageId, {
      teamId,
      filename: file.name,
      fileType: validation.fileType,
      fileSize: file.size,
      s3Key: uploadData.s3Key,
      s3Url: uploadData.uploadUrl // This would be the final S3 URL
    });

    if (completeError) throw completeError;

    return { data: attachment, error: null };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { data: null, error };
  }
}

// =============================================
// FILE RETRIEVAL
// =============================================

/**
 * Get signed download URL for a file
 * @param {string} s3Key - S3 key of the file
 * @returns {Promise<Object>} Download URL
 */
export async function getSignedDownloadUrl(s3Key) {
  try {
    const { data, error } = await supabase.functions.invoke('get-signed-download-url', {
      body: { s3Key }
    });

    if (error) throw error;
    return { data: { downloadUrl: data.downloadUrl }, error: null };
  } catch (error) {
    console.error('Error getting signed download URL:', error);
    return { data: null, error };
  }
}

/**
 * Delete a file from S3 and mark attachment as deleted
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteFile(attachmentId) {
  try {
    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('message_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from S3
    const { error: s3Error } = await supabase.functions.invoke('delete-s3-file', {
      body: { s3Key: attachment.s3_key }
    });

    if (s3Error) throw s3Error;

    // Mark attachment as deleted (soft delete)
    const { error: deleteError } = await supabase
      .from('message_attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', attachmentId);

    if (deleteError) throw deleteError;

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { data: null, error };
  }
}

// =============================================
// MEDIA GALLERY
// =============================================

/**
 * Get media files for a channel
 * @param {string} channelId - Channel ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Media files
 */
export async function getChannelMedia(channelId, options = {}) {
  try {
    const { fileType, limit = 50, offset = 0 } = options;

    let query = supabase
      .from('message_attachments')
      .select(`
        id,
        filename,
        file_type,
        file_size,
        s3_key,
        created_at,
        messages!inner(
          id,
          content,
          sender_id,
          created_at
        )
      `)
      .eq('messages.channel_id', channelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching channel media:', error);
    return { data: null, error };
  }
}
