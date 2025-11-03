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
                    size={32}
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
      
      {selectedPosition ? (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedText}>
            Selected: {selectedPosition}
          </Text>
          <Text style={styles.instructionText}>
            Drag to field to place player
          </Text>
        </View>
      ) : (
        <View style={styles.selectedInfo}>
          <Text style={styles.instructionText}>
            Tap a position to select, then drag to field
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#CCCCCC',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  groupContainer: {
    marginRight: 24,
    minWidth: 200,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CCCCCC',
  },
  positionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 35,
  },
  chipContainer: {
    alignItems: 'center',
    width: 50,
  },
  paletteChip: {
    marginBottom: 12,
  },
  selectedInfo: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 2,
    padding: 10,
    borderRadius: 6,
  },
  selectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  instructionText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  routeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  completeButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  cancelButtonText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ChipPalette;
