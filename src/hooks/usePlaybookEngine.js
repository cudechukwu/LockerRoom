/**
 * Core animation engine for the playbook system
 * Manages a master timeline shared across all players
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { 
  getPlayerPositionAtProgress, 
  getMaxDuration 
} from '../utils/routeInterpolation';
import { 
  createPlayerTimeline,
  getPlayerPositionAtTime,
  getMaxTimelineDuration
} from '../utils/playOrchestrator';
import { useReactiveTriggers } from './useReactiveTriggers';

/**
 * Main animation engine hook
 * @param {Array} players - Array of player objects
 * @param {number} duration - Total animation duration in milliseconds (optional)
 * @param {number} speed - Playback speed multiplier (optional)
 * @returns {Object} - Animation engine controls and state
 */
export function usePlaybookEngine(players, duration = null, speed = 1.0) {
  // Master timeline - single source of truth for playback progress
  const progress = useRef(new Animated.Value(0)).current;
  
  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  
  // Reactive triggers system
  const reactiveTriggers = useReactiveTriggers(players);
  
  // Player timelines - create independent timelines for each player
  const [playerTimelines, setPlayerTimelines] = useState([]);
  
  // Calculate total duration (use provided or max player duration)
  const totalDuration = duration || getMaxTimelineDuration(playerTimelines);
  
  // Player positions derived from timeline progress
  const [positions, setPositions] = useState({});
  
  // Animation reference for control
  const animationRef = useRef(null);
  
  // Create player timelines when players change
  useEffect(() => {
    const timelines = players.map(player => {
      // Create timeline with pre-snap and main play phases
      // Even players without routes get a timeline to ensure they remain visible
      const timeline = createPlayerTimeline(
        player,
        player.preSnapRoutes || [],
        player.track || [],
        {
          preSnapDuration: 2000,  // 2 seconds for pre-snap motion
          mainPlayDuration: 3000, // 3 seconds for main play
          preSnapStartTime: 0,    // Start immediately
          snapTime: 2000          // Snap at 2 seconds
        }
      );
      
      // Ensure the timeline has the player's anchor position
      timeline.anchor = player.anchor || { x: 0, y: 0 };
      
      return timeline;
    });
    
    setPlayerTimelines(timelines);
  }, [players]);
  
  // Update player positions based on timeline progress
  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      const newPositions = {};
      const globalTime = value * totalDuration;
      
      // Ensure we have positions for ALL players, not just those with timelines
      players.forEach((player) => {
        const timeline = playerTimelines.find(t => t.playerId === player.id);
        if (timeline) {
          // Get position using the new timeline system
          newPositions[player.id] = getPlayerPositionAtTime(timeline, globalTime);
        } else {
          // Fallback to anchor position if no timeline found
          newPositions[player.id] = player.anchor || { x: 0, y: 0 };
        }
      });
      
      // Update reactive triggers based on current positions
      reactiveTriggers.updateTriggers(newPositions, globalTime);
      
      setPositions(newPositions);
      
      // Update current time for progress tracking
      setCurrentTime(globalTime);
    });
    
    return () => progress.removeListener(listener);
  }, [playerTimelines, totalDuration, players, reactiveTriggers]);
  
  // Play animation
  const play = useCallback(() => {
    if (isPlaying) return; // Already playing
    
    setIsPlaying(true);
    
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    // Start new animation
    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: totalDuration / currentSpeed,
      easing: Easing.linear,
      useNativeDriver: false, // We need to listen to value changes
    });
    
    animationRef.current.start(({ finished }) => {
      setIsPlaying(false);
      if (finished) {
        // Animation completed successfully
        console.log('Animation completed');
      }
    });
  }, [isPlaying, progress, totalDuration, currentSpeed]);
  
  // Pause animation
  const pause = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    setIsPlaying(false);
  }, []);
  
  // Restart animation
  const restart = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    progress.setValue(0);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [progress]);
  
  // Set playback speed
  const setSpeed = useCallback((newSpeed) => {
    setCurrentSpeed(newSpeed);
    
    // If currently playing, restart with new speed
    if (isPlaying) {
      pause();
      // Small delay to ensure pause completes
      setTimeout(() => {
        play();
      }, 50);
    }
  }, [isPlaying, pause, play]);
  
  // Seek to specific progress (0-1)
  const seek = useCallback((progressValue) => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    const clampedProgress = Math.max(0, Math.min(1, progressValue));
    progress.setValue(clampedProgress);
    setCurrentTime(clampedProgress * totalDuration);
    setIsPlaying(false);
  }, [progress, totalDuration]);
  
  // Get current progress as a value (0-1)
  const getProgress = useCallback(() => {
    return progress._value || 0;
  }, [progress]);
  
  // Get current progress as a percentage (0-100)
  const getProgressPercentage = useCallback(() => {
    return currentTime / totalDuration * 100;
  }, [currentTime, totalDuration]);
  
  // Check if any players have routes (main play or pre-snap)
  const hasRoutes = players.some(player => 
    (player.track && player.track.length > 0) || 
    (player.preSnapRoutes && player.preSnapRoutes.length > 0)
  );
  
  return {
    // Animation state
    isPlaying,
    currentTime,
    currentSpeed,
    duration: totalDuration,
    progress: progress._value, // Current progress value (0-1)
    progressPercentage: getProgressPercentage(),
    hasRoutes,
    
    // Player positions
    positions,
    
    // Animation controls
    play,
    pause,
    restart,
    seek,
    setSpeed,
    
    // Utility functions
    getProgress,
    getProgressPercentage,
    
    // Reactive triggers
    reactiveTriggers,
  };
}
