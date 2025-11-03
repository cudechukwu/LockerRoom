import { supabase } from '../lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Upload channel/group image with thumbnail generation
 * @param {Object} image - Image object from ImagePicker
 * @param {string} channelId - Channel ID for file naming
 * @param {string} type - 'channel' or 'group' for default image fallback
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export const uploadChannelImage = async (image, channelId, type = 'channel') => {
  try {
    if (!image || !image.uri) {
      // Return default image URL if no image provided
      return getDefaultImageUrl(type);
    }

    // Generate thumbnail (256x256 WEBP) with base64
    const thumbnail = await ImageManipulator.manipulateAsync(
      image.uri,
      [{ resize: { width: 256, height: 256 } }],
      { 
        compress: 0.8, 
        format: ImageManipulator.SaveFormat.WEBP,
        base64: true
      }
    );

    if (!thumbnail.base64) {
      throw new Error('Failed to get base64 from image manipulation');
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `channel-${channelId}-${timestamp}.webp`;

    // Convert base64 to ArrayBuffer
    const base64Data = thumbnail.base64;
    const arrayBuffer = decode(base64Data);

    // Upload thumbnail to Supabase Storage
    const { data, error } = await supabase.storage
      .from('channel-images')
      .upload(filename, arrayBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return getDefaultImageUrl(type);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('channel-images')
      .getPublicUrl(filename);

    console.log('✅ Image uploaded successfully:', {
      filename,
      publicUrl: urlData.publicUrl,
      channelId,
      type
    });

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadChannelImage:', error);
    return getDefaultImageUrl(type);
  }
};

/**
 * Get default image URL based on type
 * @param {string} type - 'channel' or 'group'
 * @returns {string} - Default image URL
 */
export const getDefaultImageUrl = (type = 'channel') => {
  const defaultImage = type === 'group' ? 'defaults/group.png' : 'defaults/channel.png';
  
  // Return public URL for default image
  const { data } = supabase.storage
    .from('channel-images')
    .getPublicUrl(defaultImage);
    
  console.log('🖼️ Using default image:', {
    type,
    defaultImage,
    publicUrl: data.publicUrl
  });
    
  return data.publicUrl;
};

/**
 * Delete channel image from storage
 * @param {string} imageUrl - Full URL of image to delete
 */
export const deleteChannelImage = async (imageUrl) => {
  try {
    if (!imageUrl || imageUrl.includes('defaults/')) {
      // Don't delete default images
      return;
    }

    // Extract filename from URL
    const filename = imageUrl.split('/').pop();
    
    const { error } = await supabase.storage
      .from('channel-images')
      .remove([filename]);

    if (error) {
      console.error('Error deleting image:', error);
    }
  } catch (error) {
    console.error('Error in deleteChannelImage:', error);
  }
};
