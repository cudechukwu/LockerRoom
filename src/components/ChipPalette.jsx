import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import PlayerChip from './PlayerChip';

const ChipPalette = ({ onChipSelect, selectedChip, onChipPress, isDrawingRoute, isDrawingCurrentRoute, onCompleteRoute, onCancelRoute }) => {
  const [selectedPosition, setSelectedPosition] = useState(null);
  
  const positionGroups = [
    {
      title: 'Offense',
      color: '#DC2626',
      positions: [
        { pos: 'QB', name: 'Quarterback' },
        { pos: 'RB', name: 'Running Back' },
        { pos: 'WR', name: 'Wide Receiver' },
        { pos: 'TE', name: 'Tight End' },
        { pos: 'C', name: 'Center' },
        { pos: 'G', name: 'Guard' },
        { pos: 'T', name: 'Tackle' },
        { pos: 'FB', name: 'Fullback' },
      ]
    },
    {
      title: 'Defense',
      color: '#000000',
      positions: [
        { pos: 'DT', name: 'Defensive Tackle' },
        { pos: 'DE', name: 'Defensive End' },
        { pos: 'LB', name: 'Linebacker' },
        { pos: 'CB', name: 'Cornerback' },
        { pos: 'S', name: 'Safety' },
        { pos: 'NT', name: 'Nose Tackle' },
        { pos: 'OLB', name: 'Outside LB' },
        { pos: 'ILB', name: 'Inside LB' },
      ]
    },
    {
      title: 'Special Teams',
      color: '#059669',
      positions: [
        { pos: 'K', name: 'Kicker' },
        { pos: 'P', name: 'Punter' },
        { pos: 'LS', name: 'Long Snapper' },
        { pos: 'KR', name: 'Kick Returner' },
        { pos: 'PR', name: 'Punt Returner' },
      ]
    }
  ];
  
  const handleChipPress = (position) => {
    // Toggle selection - if already selected, deselect it
    if (selectedPosition === position) {
      setSelectedPosition(null);
      if (onChipPress) {
        onChipPress(null);
      }
    } else {
      setSelectedPosition(position);
      if (onChipPress) {
        onChipPress(position);
      }
    }
  };
  
  const handleChipSelect = (position) => {
    if (onChipSelect) {
      onChipSelect(position);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Player Positions</Text>
          <Text style={styles.headerSubtitle}>Tap to select, drag to field</Text>
        </View>
        {isDrawingCurrentRoute && (
          <View style={styles.routeButtons}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={onCompleteRoute}
              activeOpacity={0.7}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancelRoute}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {positionGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.groupContainer}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupColorIndicator, { backgroundColor: group.color }]} />
              <Text style={styles.groupTitle}>{group.title}</Text>
            </View>
            
            <View style={styles.positionsRow}>
              {group.positions.map((position, posIndex) => (
                <TouchableOpacity
                  key={posIndex}
                  style={styles.chipContainer}
                  onPress={() => handleChipPress(position.pos)}
                  activeOpacity={0.7}
                >
                  <PlayerChip
                    position={position.pos}
                    color={group.color}
                    size={26}
                    isSelected={selectedPosition === position.pos}
                    onPress={() => handleChipSelect(position.pos)}
                    isDraggable={false}
                    style={styles.paletteChip}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      
      {selectedPosition && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedText}>
            Selected: {selectedPosition}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingTop: 12,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#CCCCCC',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  groupContainer: {
    marginRight: 16,
    minWidth: 160,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupColorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  positionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 28,
  },
  chipContainer: {
    alignItems: 'center',
    width: 40,
  },
  paletteChip: {
    marginBottom: 6,
  },
  selectedInfo: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 2,
    padding: 6,
    borderRadius: 4,
  },
  selectedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  instructionText: {
    fontSize: 9,
    color: '#FFFFFF',
  },
  routeButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  completeButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ChipPalette;
