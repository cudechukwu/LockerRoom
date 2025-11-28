/**
 * useEventTimes Hook
 * Manages event time state and duration calculations
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { getDefaultStartTime, getDefaultEndTime } from '../../../utils/timeUtils';

/**
 * Hook for managing event times and duration
 * @param {Date} initialStartTime - Initial start time (optional)
 * @param {Date} initialEndTime - Initial end time (optional)
 * @param {Date} eventDate - Event date to anchor times to (important for edit mode)
 * @returns {object} Time state and utilities
 */
export function useEventTimes(initialStartTime = null, initialEndTime = null, eventDate = null) {
  // Anchor times to event date if provided, otherwise use today
  const baseDate = eventDate || new Date();
  
  const [startTime, setStartTime] = useState(() => {
    if (initialStartTime) {
      // If initial time is provided, ensure it's anchored to the event date
      const anchored = new Date(baseDate);
      anchored.setHours(initialStartTime.getHours(), initialStartTime.getMinutes(), 0, 0);
      return anchored;
    }
    return getDefaultStartTime(baseDate);
  });
  
  const [endTime, setEndTime] = useState(() => {
    if (initialEndTime) {
      // If initial time is provided, ensure it's anchored to the event date
      const anchored = new Date(baseDate);
      anchored.setHours(initialEndTime.getHours(), initialEndTime.getMinutes(), 0, 0);
      return anchored;
    }
    return getDefaultEndTime(baseDate);
  });

  // Update times when initial props change (e.g., from formState updates)
  // Use refs to track previous values and avoid dependency on state
  const prevStartTimeRef = useRef(initialStartTime);
  const prevEndTimeRef = useRef(initialEndTime);
  
  useEffect(() => {
    if (initialStartTime && initialStartTime !== prevStartTimeRef.current) {
      prevStartTimeRef.current = initialStartTime;
      const anchored = new Date(baseDate);
      anchored.setHours(initialStartTime.getHours(), initialStartTime.getMinutes(), 0, 0);
      setStartTime(prev => {
        // Only update if different (prevent unnecessary updates)
        if (anchored.getTime() !== prev?.getTime()) {
          return anchored;
        }
        return prev;
      });
    }
  }, [initialStartTime, baseDate]);

  useEffect(() => {
    if (initialEndTime && initialEndTime !== prevEndTimeRef.current) {
      prevEndTimeRef.current = initialEndTime;
      const anchored = new Date(baseDate);
      anchored.setHours(initialEndTime.getHours(), initialEndTime.getMinutes(), 0, 0);
      setEndTime(prev => {
        // Only update if different (prevent unnecessary updates)
        if (anchored.getTime() !== prev?.getTime()) {
          return anchored;
        }
        return prev;
      });
    }
  }, [initialEndTime, baseDate]);

  // Helper function to convert Date to minutes for comparison
  const dateToMinutes = (date) => {
    if (!date) return 0;
    return date.getHours() * 60 + date.getMinutes();
  };

  // Calculate event duration and check if it spans midnight
  const getEventDuration = () => {
    const startMinutes = dateToMinutes(startTime);
    const endMinutes = dateToMinutes(endTime);
    
    let durationMinutes;
    let spansNextDay = false;
    
    if (endMinutes <= startMinutes) {
      // Event spans midnight
      durationMinutes = (24 * 60) - startMinutes + endMinutes;
      spansNextDay = true;
    } else {
      // Same day event
      durationMinutes = endMinutes - startMinutes;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    let durationText = '';
    if (hours > 0) durationText += `${hours}h`;
    if (minutes > 0) durationText += `${minutes > 0 && hours > 0 ? ' ' : ''}${minutes}m`;
    
    return { duration: durationText, spansNextDay };
  };

  // Memoized duration text for end time picker
  const durationText = useMemo(() => {
    const d = getEventDuration();
    if (!d.duration) return null;
    return d.spansNextDay ? `Ends next day · ${d.duration}` : d.duration;
  }, [startTime, endTime]);

  // Memoized duration object
  const duration = useMemo(() => getEventDuration(), [startTime, endTime]);

  return {
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    durationText,
    duration,
    getEventDuration,
  };
}

