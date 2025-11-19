import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanGestureHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const AnimationControls = ({ 
  isPlaying, 
  onPlay, 
  onPause, 
  onRestart, 
  onSpeedChange,
  onSeek, // New prop for timeline scrubbing
  currentSpeed = 1.0,
  duration = 0,
  currentTime = 0,
  hasRoutes = false // New prop to check if routes exist
}) => {
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  
  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1.0, label: '1x' },
    { value: 1.5, label: '1.5x' },
    { value: 2.0, label: '2x' },
  ];
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleSpeedSelect = (speed) => {
    if (onSpeedChange) {
      onSpeedChange(speed);
    }
    setShowSpeedOptions(false);
  };

  // Timeline scrubbing functionality
  const handleTimelinePress = useCallback((event) => {
    if (!hasRoutes || !onSeek || duration <= 0) return;
    
    const { locationX } = event.nativeEvent;
    const progressBarWidth = 200; // Approximate width of progress bar
    const progress = Math.max(0, Math.min(1, locationX / progressBarWidth));
    
    onSeek(progress);
  }, [hasRoutes, onSeek, duration]);

  // Handle play/pause with route validation
  const handlePlayPause = useCallback(() => {
    if (!hasRoutes) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [hasRoutes, isPlaying, onPlay, onPause]);

  // Handle restart with haptic feedback
  const handleRestart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRestart();
  }, [onRestart]);

  // Handle timeline scrubbing with haptic feedback
  const handleTimelinePressWithHaptic = useCallback((event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleTimelinePress(event);
  }, [handleTimelinePress]);
  
  return (
    <View style={styles.container}>
      {/* Main Controls */}
      <View style={styles.mainControls}>
        {/* Restart Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRestart}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color="#6B7280" />
        </TouchableOpacity>
        
        {/* Play/Pause Button */}
        <TouchableOpacity
          style={[
            styles.controlButton, 
            styles.playButton,
            !hasRoutes && styles.disabledButton
          ]}
          onPress={handlePlayPause}
          activeOpacity={hasRoutes ? 0.7 : 1}
          disabled={!hasRoutes}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={20} 
            color={hasRoutes ? "#FFFFFF" : "#9CA3AF"} 
          />
        </TouchableOpacity>
        
        {/* Speed Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowSpeedOptions(!showSpeedOptions)}
          activeOpacity={0.7}
        >
          <Ionicons name="speedometer" size={18} color="#6B7280" />
          <Text style={styles.speedText}>{currentSpeed}x</Text>
        </TouchableOpacity>
      </View>
      
      {/* Progress Bar */}
      {duration > 0 && hasRoutes && (
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <TouchableOpacity
            style={styles.progressBar}
            onPress={handleTimelinePressWithHaptic}
            activeOpacity={0.8}
          >
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentTime / duration) * 100}%` }
              ]} 
            />
          </TouchableOpacity>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      )}
      

      
      {/* Speed Options */}
      {showSpeedOptions && (
        <View style={styles.speedOptions}>
          <Text style={styles.speedOptionsTitle}>Playback Speed</Text>
          <View style={styles.speedButtons}>
            {speedOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.speedButton,
                  currentSpeed === option.value && styles.speedButtonActive
                ]}
                onPress={() => handleSpeedSelect(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.speedButtonText,
                  currentSpeed === option.value && styles.speedButtonTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
    marginTop: 4,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#2A2A2A',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  speedText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  timeText: {
    fontSize: 10,
    color: '#6B7280',
    minWidth: 32,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  speedOptions: {
    backgroundColor: '#F8F9FA',
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  speedOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  speedButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  speedButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  speedButtonTextActive: {
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  noRoutesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
        noRoutesText: {
          fontSize: 12,
          color: '#92400E',
          textAlign: 'center',
          fontWeight: '500',
        },
        animationModeContainer: {
          marginTop: 16,
          padding: 12,
          backgroundColor: '#F0F9FF',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#0EA5E9',
        },
        animationModeText: {
          fontSize: 12,
          color: '#0369A1',
          textAlign: 'center',
          fontWeight: '500',
        },
});

export default AnimationControls;
