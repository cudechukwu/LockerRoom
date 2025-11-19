/**
 * Formation Selector Component
 * Allows users to select and place preset football formations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { COLORS } from '../constants/colors';
import {
  OFFENSIVE_FORMATIONS,
  DEFENSIVE_FORMATIONS,
  POSITION_GROUPS,
  DRILL_PACKAGES,
  MICRO_PRESETS,
  getMirroredFormation,
} from '../utils/footballFormations';

const FormationSelector = ({
  visible,
  onClose,
  onFormationSelect,
  selectedFormation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('full-formations'); // 'full-formations', 'position-groups', 'drill-packages'
  const [selectedType, setSelectedType] = useState('offense'); // 'offense' or 'defense' (only for full formations)
  const [flipMode, setFlipMode] = useState(false);

  // Get formations based on selected category
  const getFormationsForCategory = () => {
    switch (selectedCategory) {
      case 'full-formations':
        const offensiveFormations = OFFENSIVE_FORMATIONS || [];
        const defensiveFormations = DEFENSIVE_FORMATIONS || [];
        return selectedType === 'offense' ? offensiveFormations : defensiveFormations;
      case 'position-groups':
        return POSITION_GROUPS || [];
      case 'drill-packages':
        return [...(DRILL_PACKAGES || []), ...(MICRO_PRESETS || [])];
      default:
        return [];
    }
  };

  const formations = getFormationsForCategory();
  
  // Debug logging
  console.log('FormationSelector - formations:', {
    selectedCategory,
    selectedType,
    currentFormations: formations.length,
    formations: formations.map(f => f?.name || 'unnamed'),
    firstFormation: formations[0]
  });

  const handleFormationSelect = (formation) => {
    const formationToUse = flipMode && formation.supportsMirror
      ? getMirroredFormation(formation)
      : formation;
    
    onFormationSelect(formationToUse);
    onClose();
  };

  const handleFlipToggle = () => {
    setFlipMode(!flipMode);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView
          intensity={80}
          tint="dark"
          style={styles.modalBlur}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Formation</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Category Selector (Three Tabs) */}
          <View style={styles.categorySelector}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'full-formations' && styles.categoryButtonActive,
              ]}
              onPress={() => {
                setSelectedCategory('full-formations');
                setSelectedType('offense'); // Reset to offense when switching
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === 'full-formations' && styles.categoryButtonTextActive,
                ]}
              >
                Full Formations
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'position-groups' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('position-groups')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === 'position-groups' && styles.categoryButtonTextActive,
                ]}
              >
                Position Groups
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'drill-packages' && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory('drill-packages')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === 'drill-packages' && styles.categoryButtonTextActive,
                ]}
              >
                Drill Packages
              </Text>
            </TouchableOpacity>
          </View>

          {/* Type Selector (Only for Full Formations) */}
          {selectedCategory === 'full-formations' && (
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedType === 'offense' && styles.typeButtonActive,
                ]}
                onPress={() => setSelectedType('offense')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedType === 'offense' && styles.typeButtonTextActive,
                  ]}
                >
                  Offense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedType === 'defense' && styles.typeButtonActive,
                ]}
                onPress={() => setSelectedType('defense')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedType === 'defense' && styles.typeButtonTextActive,
                  ]}
                >
                  Defense
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Flip Toggle */}
          <View style={styles.flipContainer}>
            <TouchableOpacity
              style={[styles.flipButton, flipMode && styles.flipButtonActive]}
              onPress={handleFlipToggle}
              activeOpacity={0.7}
            >
              <Ionicons
                name="swap-horizontal"
                size={18}
                color={flipMode ? '#FFFFFF' : '#CCCCCC'}
              />
              <Text
                style={[
                  styles.flipButtonText,
                  flipMode && styles.flipButtonTextActive,
                ]}
              >
                Flip Formation
              </Text>
            </TouchableOpacity>
          </View>

          {/* Formations List */}
          <ScrollView
            style={styles.formationsList}
            contentContainerStyle={styles.formationsListContent}
            showsVerticalScrollIndicator={false}
          >
            {!formations || formations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No formations available
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {selectedCategory === 'full-formations'
                    ? selectedType === 'offense' 
                      ? `Offensive formations: ${OFFENSIVE_FORMATIONS?.length || 0}`
                      : `Defensive formations: ${DEFENSIVE_FORMATIONS?.length || 0}`
                    : selectedCategory === 'position-groups'
                    ? `Position groups: ${POSITION_GROUPS?.length || 0}`
                    : `Drill packages: ${(DRILL_PACKAGES?.length || 0) + (MICRO_PRESETS?.length || 0)}`}
                </Text>
              </View>
            ) : (
              formations.map((formation) => {
              const isSelected = selectedFormation?.id === formation.id ||
                selectedFormation?.originalId === formation.id;
              
              return (
                <TouchableOpacity
                  key={formation.id}
                  style={[
                    styles.formationCard,
                    isSelected && styles.formationCardSelected,
                  ]}
                  onPress={() => handleFormationSelect(formation)}
                  activeOpacity={0.7}
                >
                  <View style={styles.formationCardContent}>
                    <Text
                      style={[
                        styles.formationName,
                        isSelected && styles.formationNameSelected,
                      ]}
                    >
                      {flipMode && formation.supportsMirror
                        ? `${formation.name} (Flipped)`
                        : formation.name}
                    </Text>
                    <Text style={styles.formationInfo}>
                      {formation.players.length} players
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            }))}
          </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    paddingTop: 60, // Add padding from top for safe area
  },
  modalBlur: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '85%',
    height: '85%',
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(10, 10, 15, 0.85)', // Darker semi-transparent black overlay on blur
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitle: {
    fontSize: getFontSize('LG'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('BOLD'),
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryButtonActive: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryButtonText: {
    fontSize: getFontSize('SM'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#FFFFFF',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeButtonActive: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeButtonText: {
    fontSize: getFontSize('BASE'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#FFFFFF',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  flipContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  flipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  flipButtonActive: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  flipButtonText: {
    fontSize: getFontSize('SM'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#FFFFFF',
  },
  flipButtonTextActive: {
    color: '#FFFFFF',
  },
  formationsList: {
    flex: 1,
    minHeight: 200,
  },
  formationsListContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 20,
    gap: 8,
  },
  formationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  formationCardSelected: {
    backgroundColor: COLORS.PRIMARY_BLACK,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  formationCardContent: {
    flex: 1,
  },
  formationName: {
    fontSize: getFontSize('BASE'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
    marginBottom: 4,
  },
  formationNameSelected: {
    color: '#FFFFFF',
  },
  formationInfo: {
    fontSize: getFontSize('SM'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('REGULAR'),
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: getFontSize('BASE'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: getFontSize('SM'),
    fontFamily: getFontFamily('UI', 'PRIMARY'),
    fontWeight: getFontWeight('REGULAR'),
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default FormationSelector;

