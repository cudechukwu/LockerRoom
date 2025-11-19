import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate responsive constants based on screen size (all percentage-based)
const CARD_MARGIN = SCREEN_WIDTH * 0.015; // 1.5% of screen width for minimal padding
const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2); // Card width with margins
const CARD_PADDING = SCREEN_WIDTH * 0.01; // 1% of screen width for minimal padding
const FIELD_LEFT_OFFSET = CARD_MARGIN; // Minimal offset for better balance

// Field dimensions constants
// Increase the yard representation to reduce spacing between lines (zoom out effect)
const fieldWidthYards = 100;
const fieldHeightYards = 80; // Increased from 53.3 to 80 to show more yards, reducing line spacing

const FootballField = ({ children, onFieldPress, touchOverlayDimensions, fieldHeight, fieldWidth }) => {
  // Use provided field dimensions or calculate to fill available space
  // Field should extend from header all the way to bottom of screen
  // Palette overlays on top, so we don't subtract controls height
  const safeFieldHeight = fieldHeight || (() => {
    // Calculate: screen height minus header and safe areas only
    const headerHeight = SCREEN_HEIGHT * 0.10; // ~10% for header
    const safeAreaBuffer = SCREEN_HEIGHT * 0.01; // ~1% for safe areas (minimal)
    const availableHeight = SCREEN_HEIGHT - headerHeight - safeAreaBuffer;
    return availableHeight; // Use 100% of available space - field extends to bottom of screen
  })();
  
  const safeFieldWidth = fieldWidth || Math.min(SCREEN_WIDTH * 0.96, safeFieldHeight * 0.85);
  
  // Calculate field dimensions in pixels
  // With more yards represented, yardsToPixels will be smaller, reducing spacing between lines
  const yardsToPixels = safeFieldHeight / fieldHeightYards;
  const fieldWidthPixels = fieldWidthYards * yardsToPixels;
  const fieldHeightPixels = safeFieldHeight;
  
  // Calculate responsive stroke widths and font sizes
  // Use fixed, proportional stroke widths that look good on larger fields
  // Lines should appear thin and clean, not thick and zoomed
  const hashMarkStrokeWidth = 0.8;
  const yardLineStrokeWidth = 1.5;
  const goalLineStrokeWidth = 1.5;
  const centerLineStrokeWidth = 1.5;
  
  // Font size scales slightly with field size but stays readable
  const fontSize = Math.max(10, Math.min(14, safeFieldHeight * 0.02));
  const dashArray = "2,2";
  
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
        strokeWidth={hashMarkStrokeWidth}
        strokeDasharray={dashArray}
      />
    );
  }
  
  // Yard lines every 5 yards (now vertical) - reduced spacing between lines
  const yardLines = [];
  for (let i = 0; i <= fieldHeightYards; i += 5) {
    const y = i * yardsToPixels;
    // Make every 10-yard line slightly thicker, 5-yard lines thinner
    const isTenYardLine = i % 10 === 0;
    yardLines.push(
      <Line
        key={`yard-${i}`}
        x1={0}
        y1={y}
        x2={fieldWidthPixels}
        y2={y}
        stroke="#FFFFFF"
        strokeWidth={isTenYardLine ? yardLineStrokeWidth : hashMarkStrokeWidth}
        strokeDasharray={isTenYardLine ? "0" : dashArray}
      />
    );
  }
  
  // Yard numbers (now vertical) - still show every 10 yards
  const yardNumbers = [];
  for (let i = 0; i <= fieldHeightYards; i += 10) {
    const y = i * yardsToPixels;
    const yardNumber = i === 50 ? '50' : i > 50 ? 100 - i : i;
    yardNumbers.push(
      <SvgText
        key={`number-${i}`}
        x={fieldWidthPixels * 0.15}
        y={y}
        fontSize={fontSize}
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
      strokeWidth={goalLineStrokeWidth}
    />,
    <Line
      key="goal-bottom"
      x1={0}
      y1={fieldHeightYards * yardsToPixels}
      x2={fieldWidthPixels}
      y2={fieldHeightYards * yardsToPixels}
      stroke="#CCCCCC"
      strokeWidth={goalLineStrokeWidth}
    />
  ];
  
  // End zones removed for minimal design

  return (
    <View style={styles.container}>
      <View style={[styles.card, { minHeight: fieldHeightPixels + (CARD_PADDING * 2) }]}>
        <View style={[styles.fieldContainer, { width: fieldWidthPixels, height: fieldHeightPixels }]}>
          <Svg
            width={fieldWidthPixels}
            height={fieldHeightPixels}
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
              strokeWidth={centerLineStrokeWidth}
            />
            
            {/* 50-yard line text */}
            <SvgText
              x={fieldWidthPixels * 0.5}
              y={50 * yardsToPixels}
              fontSize={fontSize * 1.2}
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
    overflow: 'hidden', // This clips content to card boundaries
    marginLeft: FIELD_LEFT_OFFSET, // Small offset for better balance
  },
  fieldContainer: {
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
