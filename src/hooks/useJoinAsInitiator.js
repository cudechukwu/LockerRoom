/**
 * useJoinAsInitiator Hook
 * Handles automatic join logic for call initiators
 * 
 * @param {boolean} isInitiator - Whether the current user initiated the call
 * @param {boolean} hasJoined - Whether the user has already joined
 * @param {Object} activeCallSession - The call session object
 * @param {Object} agoraEngine - The Agora engine instance from useAgoraEngine
 * @param {string} agoraToken - The Agora token for joining
 * @param {Function} onJoinSuccess - Callback when join succeeds
 * @returns {Object} { joinError, status } - Join error and current status
 */

import { useEffect, useState, useRef } from 'react';

const STATUS = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  JOINING: 'joining',
  JOINED: 'joined',
  FAILED: 'failed',
};

export function useJoinAsInitiator({
  isInitiator,
  hasJoined,
  activeCallSession,
  agoraEngine,
  agoraToken,
  onJoinSuccess,
}) {
  const [joinError, setJoinError] = useState(null);
  const [status, setStatus] = useState(STATUS.IDLE);
  const retryTimeoutRef = useRef(null);
  const isJoiningRef = useRef(false);
  const unmountedRef = useRef(false);
  const lastJoinSessionRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Prevent overlapping join attempts
    if (
      !isInitiator ||
      !agoraToken ||
      !activeCallSession ||
      hasJoined ||
      isJoiningRef.current ||
      lastJoinSessionRef.current === activeCallSession.id ||
      status === STATUS.FAILED // Don't retry if already failed
    ) {
      // Update status if already joined (but don't trigger effect again)
      if (hasJoined && status !== STATUS.JOINED) {
        setStatus(STATUS.JOINED);
      }
      return;
    }

    cancelledRef.current = false;
    lastJoinSessionRef.current = activeCallSession.id;

    const joinAsInitiator = async () => {
      if (unmountedRef.current || cancelledRef.current) return;
      
      isJoiningRef.current = true;
      setJoinError(null);

      try {
        // Initialize engine if needed
        if (!agoraEngine.engine && !agoraEngine.isInitializing) {
          if (unmountedRef.current || cancelledRef.current) return;
          setStatus(STATUS.INITIALIZING);
          await agoraEngine.initialize();
        }
        
        if (unmountedRef.current || cancelledRef.current) return;
        setStatus(STATUS.JOINING);
        
        // Wait for engine to be ready, then join with exponential backoff + jitter
        const checkAndJoin = async (attempt = 0) => {
          if (unmountedRef.current || cancelledRef.current) return;
          
          // Extend retry window
          if (attempt > 50) {
            throw new Error('Timeout waiting for Agora engine');
          }

          // Wait for Agora engine readiness before joining
          if (agoraEngine.engine) {
            // Check if engine has waitUntilReady method
            if (agoraEngine.waitUntilReady) {
              await agoraEngine.waitUntilReady();
            }
            
            await agoraEngine.join(agoraToken);
            
            if (unmountedRef.current || cancelledRef.current) return;
            
            isJoiningRef.current = false;
            setStatus(STATUS.JOINED);
            onJoinSuccess?.();
          } else if (agoraEngine.isInitializing === false) {
            // Engine initialization failed
            throw new Error('Agora engine initialization failed');
          } else {
            // Exponential backoff with jitter: extended retry window
            const baseDelay = Math.min(150 * Math.pow(1.25, attempt), 800);
            const jitter = Math.random() * 100;
            const delay = baseDelay + jitter;
            
            retryTimeoutRef.current = setTimeout(() => {
              if (!unmountedRef.current && !cancelledRef.current) {
                checkAndJoin(attempt + 1);
              }
            }, delay);
          }
        };
        
        await checkAndJoin();
      } catch (error) {
        if (unmountedRef.current || cancelledRef.current) return;
        
        console.error('Error joining as initiator:', error);
        setJoinError(error);
        setStatus(STATUS.FAILED);
        isJoiningRef.current = false;
        // Reset lastJoinSessionRef on error to allow retry
        lastJoinSessionRef.current = null;
      }
    };

    joinAsInitiator();

    return () => {
      cancelledRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isJoiningRef.current = false;
    };
    // Remove 'status' from dependencies to prevent infinite loop
    // Also remove 'activeCallSession.id' to prevent re-triggering on session updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitiator, agoraToken, activeCallSession?.id, hasJoined, agoraEngine?.engine, onJoinSuccess]);

  return { joinError, status };
}

