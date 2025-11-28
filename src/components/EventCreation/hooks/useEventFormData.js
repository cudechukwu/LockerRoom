/**
 * useEventFormData Hook
 * Consolidates all data loading and prefill logic for edit mode and prefilled data
 * 
 * Handles:
 * - Edit mode: Prefills form from editingEvent
 * - Prefill mode: Prefills form from prefilledData
 * - Create mode: No prefill (default state)
 * 
 * Note: editingEvent takes precedence over prefilledData if both are provided
 * 
 * Features:
 * - Prevents React 18 Strict Mode double execution
 * - Tracks event ID changes to handle switching between events
 * - Re-anchors times when date changes
 * - Uses signature-based processing to prevent effect storms
 */

import { useEffect, useRef } from 'react';
import { parseTimeString } from '../../../utils/timeUtils';
import { parseDateFromInput } from '../../../utils/dateUtils';

/**
 * Creates a stable signature for tracking what was last processed
 * Only includes fields that actually affect prefill behavior
 * @param {object} editingEvent - Event being edited
 * @param {object} prefilledData - Prefilled data
 * @param {boolean} visible - Modal visibility
 * @returns {string} Signature string
 */
function createSignature(editingEvent, prefilledData, visible) {
  const eventId = editingEvent?.id || null;
  
  // Only hash the specific prefilled fields we actually use (prevents false positives)
  const prefillKey = prefilledData
    ? JSON.stringify({
        eventType: prefilledData.eventType || null,
        date: prefilledData.date || null,
        time: prefilledData.time || null,
        endTime: prefilledData.endTime || null,
      })
    : null;
  
  return JSON.stringify({ eventId, prefillKey, visible });
}

/**
 * Parses and anchors time to a base date
 * @param {string} timeStr - Time string to parse
 * @param {Date|string} baseDate - Base date for anchoring
 * @returns {Date|null} Parsed date or null
 */
function parseAndAnchorTime(timeStr, baseDate) {
  if (!timeStr) return null;
  const normalizedBase = baseDate instanceof Date ? baseDate : (baseDate ? parseDateFromInput(baseDate) : new Date());
  return parseTimeString(timeStr, normalizedBase);
}

/**
 * Hook for handling form data loading and prefilling
 * @param {object} options - Hook options
 * @param {boolean} options.visible - Whether modal is visible
 * @param {object} options.editingEvent - Event being edited (optional, takes precedence over prefilledData)
 * @param {object} options.prefilledData - Prefilled data (optional, used only if editingEvent is null)
 * @param {object} options.formState - Current form state
 * @param {Function} options.onFormUpdate - Callback to update form state (should accept { type, fields } for reducer or plain object)
 * @param {Date|string} options.eventDate - Event date for time anchoring (optional, falls back to formState.date)
 * @returns {void}
 */
export function useEventFormData(options = {}) {
  const {
    visible,
    editingEvent = null,
    prefilledData = null,
    formState,
    onFormUpdate,
    eventDate = null,
  } = options;

  // Signature-based processing to prevent effect storms (Stripe pattern)
  const lastProcessedSignatureRef = useRef(null);
  
  // Track last event ID to detect event switching
  const lastEventIdRef = useRef(null);
  
  // Track previous date for time re-anchoring
  const prevDateRef = useRef(formState?.date);

  // Reset tracking when modal closes
  useEffect(() => {
    if (!visible) {
      lastProcessedSignatureRef.current = null;
      lastEventIdRef.current = null;
      prevDateRef.current = formState?.date;
    }
  }, [visible, formState?.date]);

  // Extract stable prefilled data fields for dependency tracking
  const stablePrefilledData = prefilledData
    ? {
        eventType: prefilledData.eventType,
        date: prefilledData.date,
        time: prefilledData.time,
        endTime: prefilledData.endTime,
      }
    : null;

  // Main prefill effect: Handles edit mode and prefilled data
  useEffect(() => {
    if (!visible || !onFormUpdate) return;

    // Create signature for current state
    const signature = createSignature(editingEvent, stablePrefilledData, visible);
    
    // Skip if we've already processed this exact signature
    if (signature === lastProcessedSignatureRef.current) return;
    
    // Determine mode explicitly (editingEvent takes precedence)
    const mode = editingEvent ? 'edit' : stablePrefilledData ? 'prefill' : 'create';
    
    // If create mode, mark as processed and return
    if (mode === 'create') {
      lastProcessedSignatureRef.current = signature;
      return;
    }

    // Check if event ID changed (for edit mode)
    const currentEventId = editingEvent?.id || null;
    if (mode === 'edit' && currentEventId !== lastEventIdRef.current) {
      // Event changed - reset and process
      lastEventIdRef.current = currentEventId;
    }

    // Compute baseDate from the source data (not formState, to avoid stale closures)
    // Single source of truth: prefer eventDate > source date > current date
    const getBaseDate = (dateString) => {
      if (eventDate) return eventDate instanceof Date ? eventDate : parseDateFromInput(eventDate);
      if (dateString) return parseDateFromInput(dateString);
      return new Date();
    };

    const sourceDate = mode === 'edit' 
      ? (editingEvent?.date || formState?.date)
      : (stablePrefilledData?.date || formState?.date);
    
    const baseDate = getBaseDate(sourceDate);

    const updates = {};

    // Shared logic: Parse times with proper anchoring
    const parseTimes = (startTimeStr, endTimeStr, anchorDate) => {
      if (startTimeStr) {
        updates.startTime = parseAndAnchorTime(startTimeStr, anchorDate);
      }
      if (endTimeStr) {
        updates.endTime = parseAndAnchorTime(endTimeStr, anchorDate);
      }
    };

    if (mode === 'edit') {
      // Edit mode: Prefill from editingEvent
      if (editingEvent.title) updates.title = editingEvent.title;
      if (editingEvent.location) updates.location = editingEvent.location;
      if (editingEvent.notes) updates.notes = editingEvent.notes;
      if (editingEvent.event_type) updates.eventType = editingEvent.event_type;
      if (editingEvent.date) updates.date = editingEvent.date;
      
      // Parse times anchored to event date (use baseDate which already handles eventDate preference)
      parseTimes(editingEvent.start_time, editingEvent.end_time, baseDate);
      
      // Handle recurring: 
      // Backend currently only has recurring_pattern (string) and is_recurring (boolean)
      // recurring_days array doesn't exist in DB yet, so we can't restore specific days
      // For now, set to [] - user will need to reselect days when editing
      // TODO: Once backend adds recurring_days column, check for editingEvent.recurring_days array
      if (editingEvent.is_recurring && editingEvent.recurring_pattern) {
        // Backend has recurring_pattern but not specific days
        // We can't restore the exact days selected, so set to []
        // User will need to reselect when editing (this is acceptable since we're transitioning)
        // Note: EventRecurringSection will show legacy pattern in UI for user awareness
        updates.recurring = [];
      } else {
        updates.recurring = [];
      }
      
      // Handle attendance settings
      if (editingEvent.attendance_requirement) {
        updates.attendanceRequirement = editingEvent.attendance_requirement;
      }
      
      if (editingEvent.check_in_methods && Array.isArray(editingEvent.check_in_methods)) {
        updates.checkInMethods = editingEvent.check_in_methods;
      }
    } else if (mode === 'prefill') {
      // Prefill mode: Prefill from prefilledData
      if (stablePrefilledData.eventType) updates.eventType = stablePrefilledData.eventType;
      if (stablePrefilledData.date) {
        updates.date = stablePrefilledData.date;
      }
      
      // Parse times - baseDate already computed from prefilledData.date if available
      parseTimes(stablePrefilledData.time, stablePrefilledData.endTime, baseDate);
    }

    // Mark as processed BEFORE calling onFormUpdate (prevents race conditions)
    lastProcessedSignatureRef.current = signature;

    // Apply updates atomically
    // Note: onFormUpdate should handle atomic batching internally (e.g., via useReducer)
    // This hook just provides the updates object - the caller decides how to apply it
    if (Object.keys(updates).length > 0) {
      onFormUpdate(updates);
    }
  }, [visible, editingEvent?.id, stablePrefilledData, onFormUpdate, eventDate, formState?.date]);

  // Separate effect: Re-anchor times when date changes
  // This handles the case where date changes after initial prefill
  // CRITICAL: Only depends on date, NOT on startTime/endTime to avoid overwriting user input
  useEffect(() => {
    if (!visible || !onFormUpdate) return;
    
    const currentDate = formState?.date;
    const previousDate = prevDateRef.current;
    
    // Only re-anchor if date actually changed (prevDateRef comparison prevents unnecessary runs)
    if (currentDate && currentDate !== previousDate) {
      const newBaseDate = parseDateFromInput(currentDate);
      
      // Re-anchor startTime if it exists
      if (formState?.startTime instanceof Date) {
        const hours = formState.startTime.getHours();
        const minutes = formState.startTime.getMinutes();
        const reAnchoredStart = new Date(newBaseDate);
        reAnchoredStart.setHours(hours, minutes, 0, 0);
        
        // Only update if different (prevents infinite loops)
        if (reAnchoredStart.getTime() !== formState.startTime.getTime()) {
          onFormUpdate({ startTime: reAnchoredStart });
        }
      }
      
      // Re-anchor endTime if it exists
      if (formState?.endTime instanceof Date) {
        const hours = formState.endTime.getHours();
        const minutes = formState.endTime.getMinutes();
        const reAnchoredEnd = new Date(newBaseDate);
        reAnchoredEnd.setHours(hours, minutes, 0, 0);
        
        // Only update if different (prevents infinite loops)
        if (reAnchoredEnd.getTime() !== formState.endTime.getTime()) {
          onFormUpdate({ endTime: reAnchoredEnd });
        }
      }
      
      prevDateRef.current = currentDate;
    }
  }, [visible, formState?.date, onFormUpdate]);
}

