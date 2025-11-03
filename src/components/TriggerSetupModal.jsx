/**
 * Trigger Setup Modal for configuring defensive response triggers
 * Allows users to set up realistic defensive reactions to offensive pre-snap motion
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { COLORS } from '../constants/colors';

const TriggerSetupModal = ({
  visible,
  onClose,
  players,
  reactiveTriggers,
  onTriggerAdded,
}) => {
  const [selectedTrigger, setSelectedTrigger] = useState(null);
  const [selectedResponder, setSelectedResponder] = useState(null);
  const [responseType, setResponseType] = useState('follow');
  const [distanceThreshold, setDistanceThreshold] = useState(0.12);

  const offensivePlayers = players.filter(player => 
    ['QB', 'WR', 'RB', 'TE', 'OL', 'C', 'G', 'T', 'FB', 'HB'].includes(player.position?.toUpperCase())
  );

  const defensivePlayers = players.filter(player => 
    ['DT', 'DE', 'LB', 'CB', 'S', 'NT', 'OLB', 'ILB', 'FS', 'SS'].includes(player.position?.toUpperCase())
  );

  const responseTypes = [
    { id: 'follow', name: 'Follow', description: 'Cornerback shadows receiver' },
    { id: 'shift', name: 'Shift', description: 'Lateral movement' },
    { id: 'rotate', name: 'Rotate', description: 'Safety rotation' },
  ];

  const handleCreateTrigger = useCallback(() => {
    if (!selectedTrigger || !selectedResponder) {
      Alert.alert('Error', 'Please select both a trigger player and a responder player');
      return;
    }

    const success = reactiveTriggers.addTrigger({
      triggerPlayerId: selectedTrigger.id,
      responderPlayerId: selectedResponder.id,
      responseType,
      distanceThreshold,
      responseDelay: 300
    });

    if (success) {
      Alert.alert('Success', `Created trigger: ${selectedResponder.position} responds to ${selectedTrigger.position}`);
      onTriggerAdded && onTriggerAdded();
      setSelectedTrigger(null);
      setSelectedResponder(null);
    }
  }, [selectedTrigger, selectedResponder, responseType, distanceThreshold, reactiveTriggers, onTriggerAdded]);

  const handleQuickSetup = useCallback(() => {
    if (offensivePlayers.length === 0 || defensivePlayers.length === 0) {
      Alert.alert('Error', 'Need both offensive and defensive players to set up triggers');
      return;
    }

    // Quick setup: pair up players by position
    let triggersCreated = 0;
    
    offensivePlayers.forEach(offensivePlayer => {
      defensivePlayers.forEach(defensivePlayer => {
        // Simple pairing logic - can be enhanced
        if (offensivePlayer.position === 'WR' && defensivePlayer.position === 'CB') {
          reactiveTriggers.createQuickResponse(offensivePlayer.id, defensivePlayer.id, 'follow');
          triggersCreated++;
        } else if (offensivePlayer.position === 'RB' && defensivePlayer.position === 'LB') {
          reactiveTriggers.createQuickResponse(offensivePlayer.id, defensivePlayer.id, 'shift');
          triggersCreated++;
        }
      });
    });

    Alert.alert('Quick Setup Complete', `Created ${triggersCreated} defensive response triggers`);
  }, [offensivePlayers, defensivePlayers, reactiveTriggers]);

  const getTriggerStats = reactiveTriggers.getTriggerStats();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Defensive Response Setup</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Current Triggers</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getTriggerStats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getTriggerStats.active}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getTriggerStats.triggered}</Text>
                <Text style={styles.statLabel}>Triggered</Text>
              </View>
            </View>
          </View>

          {/* Quick Setup */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Setup</Text>
            <TouchableOpacity style={styles.quickSetupButton} onPress={handleQuickSetup}>
              <Ionicons name="flash" size={20} color="#FFFFFF" />
              <Text style={styles.quickSetupText}>Auto-Pair Players</Text>
            </TouchableOpacity>
            <Text style={styles.quickSetupDescription}>
              Automatically pair offensive and defensive players for realistic responses
            </Text>
          </View>

          {/* Manual Setup */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manual Setup</Text>
            
            {/* Trigger Player Selection */}
            <View style={styles.selectionContainer}>
              <Text style={styles.selectionLabel}>When this player moves:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
                {offensivePlayers.map(player => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerChip,
                      selectedTrigger?.id === player.id && styles.playerChipSelected
                    ]}
                    onPress={() => setSelectedTrigger(player)}
                  >
                    <Text style={[
                      styles.playerChipText,
                      selectedTrigger?.id === player.id && styles.playerChipTextSelected
                    ]}>
                      {player.position}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Responder Player Selection */}
            <View style={styles.selectionContainer}>
              <Text style={styles.selectionLabel}>This player responds:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
                {defensivePlayers.map(player => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerChip,
                      selectedResponder?.id === player.id && styles.playerChipSelected
                    ]}
                    onPress={() => setSelectedResponder(player)}
                  >
                    <Text style={[
                      styles.playerChipText,
                      selectedResponder?.id === player.id && styles.playerChipTextSelected
                    ]}>
                      {player.position}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Response Type Selection */}
            <View style={styles.selectionContainer}>
              <Text style={styles.selectionLabel}>Response Type:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerScroll}>
                {responseTypes.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.playerChip,
                      responseType === type.id && styles.playerChipSelected
                    ]}
                    onPress={() => setResponseType(type.id)}
                  >
                    <Text style={[
                      styles.playerChipText,
                      responseType === type.id && styles.playerChipTextSelected
                    ]}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Create Trigger Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                (!selectedTrigger || !selectedResponder) && styles.createButtonDisabled
              ]}
              onPress={handleCreateTrigger}
              disabled={!selectedTrigger || !selectedResponder}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Trigger</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.textPrimary,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: COLORS.textPrimary,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    marginBottom: 12,
  },
  statsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: getFontSize('XL'),
    fontWeight: getFontWeight('BOLD'),
    color: COLORS.primary,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
  statLabel: {
    fontSize: getFontSize('SM'),
    color: COLORS.textSecondary,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    marginTop: 4,
  },
  quickSetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  quickSetupText: {
    color: '#FFFFFF',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    marginLeft: 8,
  },
  quickSetupDescription: {
    fontSize: getFontSize('SM'),
    color: COLORS.textSecondary,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    textAlign: 'center',
  },
  selectionContainer: {
    marginBottom: 16,
  },
  selectionLabel: {
    fontSize: getFontSize('SM'),
    color: COLORS.textSecondary,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    marginBottom: 8,
  },
  playerScroll: {
    flexDirection: 'row',
  },
  playerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  playerChipText: {
    fontSize: getFontSize('SM'),
    color: COLORS.textPrimary,
    fontFamily: getFontFamily('UI', 'PRIMARY'),
  },
  playerChipTextSelected: {
    color: '#FFFFFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('MEDIUM'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    marginLeft: 8,
  },
});

export default TriggerSetupModal;
