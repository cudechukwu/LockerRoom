/**
 * Animation Controls Contract
 * Defines the clean API between AnimationControls UI and usePlaybookEngine
 */

import { useCallback } from 'react';

/**
 * Animation Controls Hook
 * Provides a clean interface for animation control operations
 * @param {Object} engine - The animation engine instance
 * @returns {Object} - Control API methods
 */
export function useAnimationControls(engine) {
  // Control API methods
  const play = useCallback(() => {
    if (!engine || !engine.play) {
      console.warn('Animation engine not available or play method missing');
      return false;
    }
    
    if (!engine.hasRoutes) {
      console.warn('No routes available for animation');
      return false;
    }
    
    engine.play();
    return true;
  }, [engine]);

  const pause = useCallback(() => {
    if (!engine || !engine.pause) {
      console.warn('Animation engine not available or pause method missing');
      return false;
    }
    
    engine.pause();
    return true;
  }, [engine]);

  const restart = useCallback(() => {
    if (!engine || !engine.restart) {
      console.warn('Animation engine not available or restart method missing');
      return false;
    }
    
    engine.restart();
    return true;
  }, [engine]);

  const seek = useCallback((progress) => {
    if (!engine || !engine.seek) {
      console.warn('Animation engine not available or seek method missing');
      return false;
    }
    
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    engine.seek(clampedProgress);
    return true;
  }, [engine]);

  const setSpeed = useCallback((speed) => {
    if (!engine || !engine.setSpeed) {
      console.warn('Animation engine not available or setSpeed method missing');
      return false;
    }
    
    // Clamp speed between 0.1 and 5.0
    const clampedSpeed = Math.max(0.1, Math.min(5.0, speed));
    engine.setSpeed(clampedSpeed);
    return true;
  }, [engine]);

  const getProgress = useCallback(() => {
    if (!engine || !engine.getProgress) {
      console.warn('Animation engine not available or getProgress method missing');
      return 0;
    }
    
    return engine.getProgress();
  }, [engine]);

  // State getters
  const isPlaying = engine?.isPlaying || false;
  const currentSpeed = engine?.currentSpeed || 1.0;
  const currentTime = engine?.currentTime || 0;
  const duration = engine?.duration || 0;
  const hasRoutes = engine?.hasRoutes || false;

  return {
    // Control methods
    play,
    pause,
    restart,
    seek,
    setSpeed,
    getProgress,
    
    // State getters
    isPlaying,
    currentSpeed,
    currentTime,
    duration,
    hasRoutes,
    
    // Engine reference (for advanced usage)
    engine
  };
}
