import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MARGIN = 40; // Distance from left and right edges
const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2); // Card width with margins
const CARD_PADDING = 16; // Card internal padding
const FIELD_HEIGHT = SCREEN_HEIGHT * 0.50; // Use 50% of screen height
const FIELD_WIDTH = Math.min(SCREEN_WIDTH * 0.8, FIELD_HEIGHT * 0.7); // Wider field, max 80% of screen width
const FIELD_LEFT_OFFSET = CARD_MARGIN * 0.3; // Smaller offset for better balance

// Calculate field dimensions in pixels
const fieldWidthYards = 100;
const fieldHeightYards = 53.3;
const yardsToPixels = FIELD_HEIGHT / fieldHeightYards;
const fieldWidthPixels = fieldWidthYards * yardsToPixels;
const fieldHeightPixels = FIELD_HEIGHT;

const FootballField = ({ children, onFieldPress, touchOverlayDimensions }) => {
  // Field dimensions are now calculated outside the component
  
  // Hash marks every 5 yards (now vertical)
  const hashMarks = [];
  for (let i = 5; i < fieldHeightYards; i += 5) {
    const y = i * yardsToPixels;
    hashMarks.push(
      <Line
        key={`hash-${i}`}
        x1={fieldWidthPixels * 0.2}
        y1={y}
        x2={fieldWidthPixels * 0.8}
        y2={y}
        stroke="#FFFFFF"
        strokeWidth={1}
        strokeDasharray="2,2"
      />
    );
  }
  
  // Yard lines every 10 yards (now vertical)
  const yardLines = [];
  for (let i = 0; i <= fieldHeightYards; i += 10) {
    const y = i * yardsToPixels;
    yardLines.push(
      <Line
        key={`yard-${i}`}
        x1={0}
        y1={y}
        x2={fieldWidthPixels}
        y2={y}
        stroke="#FFFFFF"
        strokeWidth={2}
      />
    );
  }
  
  // Yard numbers (now vertical)
  const yardNumbers = [];
  for (let i = 0; i <= fieldHeightYards; i += 10) {
    const y = i * yardsToPixels;
    const yardNumber = i === 50 ? '50' : i > 50 ? 100 - i : i;
    yardNumbers.push(
      <SvgText
        key={`number-${i}`}
        x={fieldWidthPixels * 0.15}
        y={y}
        fontSize="12"
        fill="#FFFFFF"
        textAnchor="middle"
        transform={`rotate(-90 ${fieldWidthPixels * 0.15} ${y})`}
      >
        {yardNumber}
      </SvgText>
    );
  }
  
  // Goal lines (now vertical) - more subtle
  const goalLines = [
    <Line
      key="goal-top"
      x1={0}
      y1={0}
      x2={fieldWidthPixels}
      y2={0}
      stroke="#CCCCCC"
      strokeWidth={2}
    />,
    <Line
      key="goal-bottom"
      x1={0}
      y1={fieldHeightYards * yardsToPixels}
      x2={fieldWidthPixels}
      y2={fieldHeightYards * yardsToPixels}
      stroke="#CCCCCC"
      strokeWidth={2}
    />
  ];
  
  // End zones removed for minimal design

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.fieldContainer}>
          <Svg
            width={fieldWidthPixels}
            height={FIELD_HEIGHT}
            style={styles.field}
          >
            {/* Yard lines */}
            {yardLines}
            
            {/* Hash marks */}
            {hashMarks}
            
            {/* Goal lines */}
            {goalLines}
            
            {/* Yard numbers */}
            {yardNumbers}
            
            {/* Center line */}
            <Line
              x1={0}
              y1={50 * yardsToPixels}
              x2={fieldWidthPixels}
              y2={50 * yardsToPixels}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            
            {/* 50-yard line text */}
            <SvgText
              x={fieldWidthPixels * 0.5}
              y={50 * yardsToPixels}
              fontSize="14"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              50
            </SvgText>
          </Svg>
          
          {/* Overlay for touch interactions - covers full field with safe space */}
          <TouchableOpacity 
            style={[styles.touchOverlay, touchOverlayDimensions || { 
              width: SCREEN_WIDTH + 200, 
              height: FIELD_HEIGHT + 100,
              left: -CARD_MARGIN + 150,
              top: -50
            }]}
            onPress={onFieldPress}
            activeOpacity={1}
          >
            {children}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 5,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#2D5016',
    borderRadius: 16,
    padding: CARD_PADDING,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center', // Center alignment for better balance
    justifyContent: 'center',
    minHeight: FIELD_HEIGHT + (CARD_PADDING * 2),
    overflow: 'hidden', // This clips content to card boundaries
    marginLeft: FIELD_LEFT_OFFSET, // Small offset for better balance
  },
  fieldContainer: {
    width: fieldWidthPixels,
    height: fieldHeightPixels,
    borderRadius: 12, // Slightly smaller radius than card
    overflow: 'hidden', // This clips the SVG content
  },
  field: {
    backgroundColor: 'transparent',
  },
  touchOverlay: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});

export default FootballField;
