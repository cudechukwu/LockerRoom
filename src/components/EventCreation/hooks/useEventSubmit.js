/**
 * useEventSubmit Hook
 * Handles event form submission, validation, and attachment uploads
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { validateForm, showValidationErrors } from '../formValidation';
import { buildEventPayload } from '../eventPayloadBuilder';
import { uploadEventAttachment } from '../../../api/events';

/**
 * Hook for handling event form submission
 * @param {Function} onCreateEvent - Function to create the event
 * @param {object} options - Additional options
 * @param {object} options.supabase - Supabase client instance
 * @param {string} options.teamId - Team ID for attachment uploads
 * @param {Function} options.onSuccess - Callback on successful submission
 * @param {Function} options.onError - Callback on error
 * @returns {object} Submit handlers and loading state
 */
export function useEventSubmit(onCreateEvent, options = {}) {
  const { supabase, teamId, onSuccess, onError } = options;
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Upload attachments for an event
   * @param {string} eventId - Event ID
   * @param {Array} attachments - Array of file objects
   * @returns {Promise<object>} Upload results
   */
  const uploadAttachments = async (eventId, attachments) => {
    if (!eventId || !attachments || attachments.length === 0 || !teamId || !supabase) {
      return { success: true, uploaded: 0, failed: 0 };
    }

    setIsUploadingAttachments(true);
    try {
      // Upload attachments one by one (non-blocking pattern)
      const uploadResults = await Promise.allSettled(
        attachments.map(file => 
          uploadEventAttachment(supabase, eventId, teamId, file)
        )
      );

      // Check for failures
      const failures = uploadResults.filter(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
      );
      
      const uploaded = attachments.length - failures.length;
      const failed = failures.length;

      if (failures.length > 0) {
        console.warn(`⚠️ ${failures.length} attachment(s) failed to upload`);
        Alert.alert(
          'Upload Warning',
          `${uploaded} of ${attachments.length} file(s) uploaded successfully. Some files failed to upload.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log(`✅ All ${attachments.length} attachment(s) uploaded successfully`);
      }

      return { success: true, uploaded, failed };
    } catch (error) {
      console.error('❌ Error uploading attachments:', error);
      Alert.alert(
        'Upload Error',
        'Event was created but some files failed to upload. You can add them later.',
        [{ text: 'OK' }]
      );
      return { success: false, uploaded: 0, failed: attachments.length, error };
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  /**
   * Submit event form
   * @param {object} formData - Form data object
   * @param {object} submitOptions - Submission options
   * @param {Array} submitOptions.eventTypes - Event type configurations
   * @param {object} submitOptions.teamColors - Team color configuration
   * @returns {Promise<object>} Submission result
   */
  const submitEvent = async (formData, submitOptions = {}) => {
    // Guard against double submission
    if (isSubmitting) {
      console.warn('⚠️ Event submission already in progress, ignoring duplicate request');
      return { success: false, errors: ['Submission already in progress'] };
    }

    // Validate form (pure validation, no side effects)
    const validation = validateForm(formData);
    if (!validation.isValid) {
      // Show validation errors as alerts
      showValidationErrors(validation.errors);
      if (onError) onError(validation.errors);
      return { 
        success: false, 
        errors: validation.errors,
        fieldErrors: validation.fieldErrors || {}, // Include field-level errors for UI feedback
      };
    }

    setIsSubmitting(true);

    // Build payload
    const eventPayload = buildEventPayload(formData, submitOptions);

    // Check if onCreateEvent is a function
    if (typeof onCreateEvent !== 'function') {
      const error = 'onCreateEvent is not a function';
      console.error('❌', error, onCreateEvent);
      if (onError) onError([error]);
      return { success: false, errors: [error], fieldErrors: {} };
    }

    try {
      // Create the event
      console.log('🔵 Calling onCreateEvent with:', eventPayload);
      const result = await onCreateEvent(eventPayload);
      console.log('🔵 onCreateEvent completed successfully');

      // Validate event creation response
      if (!result?.data?.id) {
        throw new Error('Invalid event creation response: missing event ID');
      }

      const eventId = result.data.id;

      // Upload attachments if event was created successfully and we have attachments
      if (eventId && formData.attachments && formData.attachments.length > 0) {
        await uploadAttachments(eventId, formData.attachments);
      }

      if (onSuccess) onSuccess(result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error in onCreateEvent:', error);
      const errorMessage = error.message || 'Failed to create event. Please check your connection and try again.';
      Alert.alert(
        'Unable to Create Event',
        errorMessage,
        [{ text: 'OK' }]
      );
      if (onError) onError([errorMessage]);
      return { success: false, errors: [errorMessage], fieldErrors: {} };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitEvent,
    uploadAttachments,
    isUploadingAttachments,
    isSubmitting,
  };
}

