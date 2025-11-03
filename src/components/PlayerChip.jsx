import React, { useState, memo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { usePerformanceMonitoring } from '../utils/performanceMonitor';

const PlayerChip = memo(({
  position,
  color,
  size = 32, // Reduced from 40 to 32
  onDrag,
  onPress,
  onLongPress,
  isSelected = false,
  isAnimating = false,
  isDraggable = true,
  style = {}
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const { startTiming, endTiming } = usePerformanceMonitoring('PlayerChip');
  
  const getPositionColor = (pos) => {
    const positionGroup = pos.toUpperCase();
    
    // Defense positions
    if (['DT', 'DE', 'LB', 'CB', 'S', 'NT', 'OLB', 'ILB', 'FS', 'SS'].includes(positionGroup)) {
      return '#000000'; // Black
    }
    
    // Offense positions (except QB)
    if (['WR', 'RB', 'TE', 'OL', 'C', 'G', 'T', 'FB', 'HB'].includes(positionGroup)) {
      return '#DC2626'; // Red
    }
    
    // Quarterback
    if (positionGroup === 'QB') {
      return '#2563EB'; // Blue
    }
    
    // Special teams
    if (['K', 'P', 'LS', 'KR', 'PR'].includes(positionGroup)) {
      return '#059669'; // Green
    }
    
    // Default
    return '#6B7280'; // Gray
  };
  
  const chipColor = color || getPositionColor(position);
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };
  
  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    }
  };
  
  startTiming('render');
  
  const chipContent = (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          backgroundColor: chipColor,
          borderColor: isSelected ? '#FFFFFF' : 'transparent',
          borderWidth: isSelected ? 2 : 0,
          transform: [
            { scale: isPressed ? 1.1 : 1.0 },
            { scale: isAnimating ? 1.0 : 1.0 }
          ],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        },
        style
      ]}
    >
      <Text style={[styles.positionText, { fontSize: size * 0.4 }]}>
        {position}
      </Text>
      
      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectionIndicator}>
          <Ionicons name="checkmark" size={size * 0.45} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
  
  endTiming('render');
  
  // Only wrap with PanGestureHandler if draggable
  if (isDraggable && onDrag) {
    return (
      <PanGestureHandler
        onGestureEvent={onDrag}
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === 1) { // BEGAN
            setIsPressed(true);
          } else if (event.nativeEvent.state === 5) { // END
            setIsPressed(false);
          }
        }}
      >
        {chipContent}
      </PanGestureHandler>
    );
  }
  
  return chipContent;
});

PlayerChip.displayName = 'PlayerChip';

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  positionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlayerChip;
