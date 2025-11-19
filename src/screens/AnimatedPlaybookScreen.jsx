import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { getFontFamily, getFontWeight, getFontSize } from '../constants/fonts';
import { COLORS } from '../constants/colors';
import ScreenBackground from '../components/ScreenBackground';
import FootballField from '../components/FootballField';
import PlayerChip from '../components/PlayerChip';
import ChipPalette from '../components/ChipPalette';
import AnimationControls from '../components/AnimationControls';
import TriggerSetupModal from '../components/TriggerSetupModal';
import FormationSelector from '../components/FormationSelector';
import { 
  normalizedToPixels, 
  pixelsToNormalized, 
  convertNormalizedRouteToPixels,
  getFieldBounds 
} from '../utils/coordinateUtils';
import { useFieldGeometry } from '../hooks/useFieldGeometry';
import { migratePlayers } from '../utils/migrateOldData';
import { 
  createPlayer, 
  createRouteSegment, 
  addRouteToPlayer,
  addPreSnapRouteToPlayer,
  clampNormalizedCoordinate 
} from '../utils/playerDataModel';
import { usePlaybookEngine } from '../hooks/usePlaybookEngine';
import { useAnimationControls } from '../hooks/useAnimationControls';
import { useFieldInteractions } from '../hooks/useFieldInteractions';
import { determineAction, getActionDescription } from '../utils/actionDetermination';
import { performanceMonitor, usePerformanceMonitoring } from '../utils/performanceMonitor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedPlaybookScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [players, setPlayers] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Consolidated interaction state
  const [interactionState, setInteractionState] = useState({
    selectedChip: null,
    isDrawingRoute: false,
    isDrawingPreSnapRoute: false,
    selectedPlayer: null,
    currentRoute: [],
    isDrawingCurrentRoute: false,
    isDeleteMode: false,
  });

  // Trigger setup modal state
  const [showTriggerSetup, setShowTriggerSetup] = useState(false);
  
  // Formation selection state
  const [showFormationSelector, setShowFormationSelector] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [isFormationMode, setIsFormationMode] = useState(false);
  
  // Undo/Redo history
  const undoHistoryRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const MAX_UNDO_HISTORY = 20; // Limit undo history size
  
  // Save current state to undo history
  const saveToUndoHistory = useCallback((actionType, data) => {
    const historyEntry = {
      type: actionType,
      timestamp: Date.now(),
      playersSnapshot: JSON.parse(JSON.stringify(players)), // Deep copy
      data: data // Additional data specific to action
    };
    
    undoHistoryRef.current.push(historyEntry);
    
    // Limit history size
    if (undoHistoryRef.current.length > MAX_UNDO_HISTORY) {
      undoHistoryRef.current.shift(); // Remove oldest entry
    }
    
    // Update canUndo state
    setCanUndo(undoHistoryRef.current.length > 0);
  }, [players]);
  
  // Undo last action
  const handleUndo = useCallback(() => {
    if (undoHistoryRef.current.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    const lastAction = undoHistoryRef.current.pop();
    
    // Restore players to previous state
    setPlayers(lastAction.playersSnapshot);
    
    // Update canUndo state
    setCanUndo(undoHistoryRef.current.length > 0);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Exit formation mode if we undid a formation placement
    if (lastAction.type === 'placeFormation') {
      setIsFormationMode(false);
      setSelectedFormation(null);
    }
  }, []);
  
  // Bottom controls visibility state
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTranslateY = useRef(new Animated.Value(0)).current;
  const controlsHeightRef = useRef(0); // Store actual measured height
  const handleHeight = 40; // Pull handle height in pixels
  
  const animationRef = useRef(null);
  const gestureRefs = useRef({});
  
  // Initialize field geometry hook with permanently larger field
  // All values are percentage-based for responsive design across different screen sizes
  // Field extends from header to bottom of screen (palette overlays on top)
  const fieldGeometry = useFieldGeometry({ 
    extendX: 0.26, // 26% of screen width for horizontal extension
    extendY: 0.07, // 7% of screen height for vertical extension
    fieldHeightRatio: null, // null = calculate based on available viewport space
    fieldAspectRatio: 0.85, // Wider field (85% aspect ratio)
    headerHeight: null, // null = calculate as percentage (~10% of screen height)
    controlsHeight: 0, // Don't subtract controls - field extends to bottom, palette overlays
    safeAreaTop: insets.top,
    safeAreaBottom: insets.bottom
  });
  
  // Initialize field interactions hook
  const fieldInteractions = useFieldInteractions(
    players, 
    setPlayers, 
    fieldGeometry, 
    interactionState, 
    setInteractionState
  );
  
  // Initialize animation engine
  const animationEngine = usePlaybookEngine(players, null, currentSpeed);
  
  // Initialize animation controls with clean contract
  const animationControls = useAnimationControls(animationEngine);
  
  // Initialize performance monitoring
  const { startTiming, endTiming } = usePerformanceMonitoring('AnimatedPlaybookScreen');
  
  // Start FPS monitoring on component mount
  useEffect(() => {
    performanceMonitor.startFPSMonitoring();
    return () => {
      // Log performance summary on unmount
      const summary = performanceMonitor.getPerformanceSummary();
      console.log('📊 Performance Summary:', summary);
    };
  }, []);
  
  // Migrate any old data format on component mount
  useEffect(() => {
    if (players.length > 0) {
      const migratedPlayers = migratePlayers(players);
      // Only update if migration actually changed anything
      const hasOldFormat = players.some(player => 
        player.hasOwnProperty('x') && player.hasOwnProperty('y')
      );
      
      if (hasOldFormat) {
        console.log('Migrating old player data format to normalized coordinates');
        setPlayers(migratedPlayers);
      }
    }
  }, []); // Only run on mount
  
  // Create curved path from route points using quadratic bezier curves
  const createCurvedPath = useCallback((points) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      
      // Calculate control point for smooth curve
      const controlX = (prevPoint.x + currentPoint.x) / 2;
      const controlY = prevPoint.y;
      
      path += ` Q ${controlX} ${controlY} ${currentPoint.x} ${currentPoint.y}`;
    }
    
    return path;
  }, []);
  
  // Handle chip selection from palette
  const handleChipSelect = useCallback((position) => {
    fieldInteractions.setSelectedChip(position);
  }, [fieldInteractions]);

  // Wrapper for route drawing toggle that ensures mutual exclusivity
  const handleRouteDrawingToggle = useCallback(() => {
    // Disable pre-snap mode if it's active
    if (interactionState.isDrawingPreSnapRoute) {
      setInteractionState(prev => ({
        ...prev,
        isDrawingPreSnapRoute: false,
        selectedPlayer: null,
        isDrawingCurrentRoute: false,
        currentRoute: [],
      }));
    }
    
    // Toggle route drawing mode
    fieldInteractions.toggleRouteDrawing();
  }, [fieldInteractions, interactionState.isDrawingPreSnapRoute]);

  // Toggle pre-snap route drawing mode
  const togglePreSnapRouteDrawing = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      isDrawingPreSnapRoute: !prev.isDrawingPreSnapRoute,
      isDrawingRoute: false,
      selectedPlayer: null,
      isDrawingCurrentRoute: false,
      currentRoute: [],
      isDeleteMode: false
    }));
    
    // Also disable route drawing mode in fieldInteractions
    if (fieldInteractions.isDrawingRoute) {
      fieldInteractions.toggleRouteDrawing();
    }
  }, [fieldInteractions]);

  // Complete pre-snap route drawing
  const completePreSnapRoute = useCallback(() => {
    if (!interactionState.selectedPlayer || !interactionState.currentRoute || interactionState.currentRoute.length === 0) return;

    const routeSegment = createRouteSegment({
      points: interactionState.currentRoute
    });

    setPlayers(prev => prev.map(player => {
      if (player.id === interactionState.selectedPlayer) {
        return addPreSnapRouteToPlayer(player, routeSegment);
      }
      return player;
    }));

    setInteractionState(prev => ({
      ...prev,
      isDrawingCurrentRoute: false,
      currentRoute: [],
      selectedPlayer: null
    }));
  }, [interactionState.selectedPlayer, interactionState.currentRoute]);
  
  // Handle formation selection
  const handleFormationSelect = useCallback((formation) => {
    setSelectedFormation(formation);
    setIsFormationMode(true);
    // Exit other modes when entering formation mode
    setInteractionState(prev => ({
      ...prev,
      isDrawingRoute: false,
      isDrawingPreSnapRoute: false,
      isDeleteMode: false,
      selectedChip: null,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [setInteractionState]);

  // Handle formation mode toggle
  const handleFormationModeToggle = useCallback(() => {
    if (isFormationMode) {
      // Exit formation mode
      setIsFormationMode(false);
      setSelectedFormation(null);
    } else {
      // Open formation selector
      setShowFormationSelector(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isFormationMode]);
  
  // Clean field press handler using action determination
  const handleFieldPress = useCallback((event) => {
    const { locationX, locationY } = event.nativeEvent;
    
    // Check if tap is within field boundaries
    if (!fieldGeometry.isWithinField(locationX, locationY)) return;
    
    // If in formation mode, place formation
    if (isFormationMode && selectedFormation) {
      // Save state before placing formation
      saveToUndoHistory('placeFormation', {
        formation: selectedFormation.name,
        location: { x: locationX, y: locationY }
      });
      
      const success = fieldInteractions.placeFormation(
        selectedFormation,
        { x: locationX, y: locationY }
      );
      
      if (success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Keep formation mode active for quick placement of same formation
        // User can tap formation button again to exit or select different formation
      } else {
        // Remove the history entry if placement failed
        undoHistoryRef.current.pop();
        setCanUndo(undoHistoryRef.current.length > 0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Could show alert here if desired
      }
      return;
    }
    
    // Update handleFieldPress dependencies to include saveToUndoHistory
    // Determine what action to take (including pre-snap route mode)
    const action = determineAction({
      x: locationX,
      y: locationY,
      players,
      fieldGeometry,
      interactionState: {
        ...interactionState,
        isDrawingRoute: interactionState.isDrawingRoute || interactionState.isDrawingPreSnapRoute
      }
    });
    
    // Debug logging
    console.log('Field pressed:', { 
      location: { x: locationX, y: locationY }, 
      action: getActionDescription(action) 
    });
    
    // Execute the determined action
    switch (action.type) {
      case 'placePlayer':
        // Save state before placing player
        saveToUndoHistory('placePlayer', {
          position: action.data.position,
          location: action.data.location
        });
        fieldInteractions.placePlayer(action.data.position, action.data.location);
        fieldInteractions.setSelectedChip(null);
        break;
        
      case 'deletePlayer':
        // Save deleted player data before deleting
        const playerToDelete = players.find(p => p.id === action.data.playerId);
        saveToUndoHistory('deletePlayer', {
          playerId: action.data.playerId,
          deletedPlayer: playerToDelete
        });
        fieldInteractions.deletePlayer(action.data.playerId);
        break;
        
      case 'startRoute':
        fieldInteractions.startRoute(action.data.playerId);
        break;
        
      case 'updateRoute':
        fieldInteractions.updateRoute(action.data.location);
        break;
        
      case 'none':
      default:
        // No action needed
        break;
    }
  }, [players, fieldGeometry, interactionState, fieldInteractions, completePreSnapRoute, isFormationMode, selectedFormation, saveToUndoHistory]);
  
  // Handle chip drag with field boundary constraints
  const handleChipDrag = useCallback((playerId) => (event) => {
    const { translationX, translationY } = event.nativeEvent;
    
    // Use field geometry from hook for consistent dimensions (all percentage-based)
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const FIELD_HEIGHT = SCREEN_HEIGHT * 0.72; // Match new permanent field height (72% of screen)
    const FIELD_WIDTH = Math.min(SCREEN_WIDTH * 0.96, FIELD_HEIGHT * 0.85); // 96% of screen width
    
    // Calculate extended safe area boundaries as percentage of screen size
    const extendX = SCREEN_WIDTH * 0.26; // ~26% of screen width for horizontal extension
    const extendY = SCREEN_HEIGHT * 0.07; // ~7% of screen height for vertical extension
    const fieldLeft = -extendX; // Start well beyond the left edge
    const fieldRight = SCREEN_WIDTH + extendX; // Extend well beyond the right edge
    const fieldTop = -extendY; // Start above the field
    const fieldBottom = FIELD_HEIGHT + extendY; // Extend below the field
    
    // Chip size from field geometry hook (responsive)
    const chipSize = fieldGeometry.chipSize;
    const halfChipSize = chipSize / 2;
    
    setPlayers(prev => prev.map(player => {
      if (player.id === playerId) {
        const newX = player.x + translationX;
        const newY = player.y + translationY;
        
        // Constrain to field boundaries
        const constrainedX = Math.max(fieldLeft + halfChipSize, 
                           Math.min(fieldRight - halfChipSize, newX));
        const constrainedY = Math.max(fieldTop + halfChipSize, 
                           Math.min(fieldBottom - halfChipSize, newY));
        
        return { 
          ...player, 
          x: constrainedX, 
          y: constrainedY 
        };
      }
      return player;
    }));
  }, []);
  
  // Handle chip press (start route drawing or show player options)
  const handleChipPress = useCallback((playerId) => {
    console.log('Chip pressed:', playerId, 'isDrawingRoute:', fieldInteractions.isDrawingRoute);
    
    if (fieldInteractions.isDrawingRoute) {
      console.log('Starting route drawing for player:', playerId);
      fieldInteractions.startRoute(playerId);
    } else if (fieldInteractions.isDeleteMode) {
      // Show confirmation for deletion
      Alert.alert(
        'Delete Player',
        'Are you sure you want to delete this player?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => {
            fieldInteractions.deletePlayer(playerId);
          }},
        ]
      );
    } else {
      // Show player options
      Alert.alert(
        'Player Options',
        'What would you like to do with this player?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete Player', style: 'destructive', onPress: () => {
            fieldInteractions.deletePlayer(playerId);
          }},
          { text: 'Draw Route', onPress: () => {
            fieldInteractions.toggleRouteDrawing();
            fieldInteractions.startRoute(playerId);
          }},
        ]
      );
    }
  }, [fieldInteractions]);
  
  // Handle chip long press (for settings)
  const handleChipLongPress = useCallback((playerId) => {
    Alert.alert(
      'Player Settings',
      'Configure player speed and delay',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => {
          // TODO: Open player settings modal
          Alert.alert('Player Settings', 'Player settings modal will be implemented');
        }},
        { text: 'Delete', style: 'destructive', onPress: () => {
          fieldInteractions.deletePlayer(playerId);
        }},
      ]
    );
  }, [fieldInteractions]);
  
  // Animation controls - now using clean contract
  const handlePlay = useCallback(() => {
    // Debug: Check route status
    const playersWithRoutes = players.filter(p => 
      (p.track && p.track.length > 0) || (p.preSnapRoutes && p.preSnapRoutes.length > 0)
    );
    console.log('Play button pressed:', {
      totalPlayers: players.length,
      playersWithRoutes: playersWithRoutes.length,
      hasRoutes: animationControls.hasRoutes,
      routeDetails: players.map(p => ({
        id: p.id,
        position: p.position,
        trackLength: p.track?.length || 0,
        preSnapLength: p.preSnapRoutes?.length || 0
      }))
    });
    
    const success = animationControls.play();
    if (!success) {
      Alert.alert(
        'No Routes', 
        `Please draw routes for players before playing animation.\n\nYou have ${players.length} player(s) on the field, but none have routes drawn yet.\n\nTo draw a route:\n1. Tap the route button (pencil icon)\n2. Tap on a player\n3. Tap on the field to create route points\n4. Tap the player again to complete the route`
      );
    }
  }, [animationControls, players]);
  
  const handlePause = useCallback(() => {
    animationControls.pause();
  }, [animationControls]);
  
  const handleRestart = useCallback(() => {
    animationControls.restart();
  }, [animationControls]);
  
  const handleSpeedChange = useCallback((speed) => {
    setCurrentSpeed(speed);
    animationControls.setSpeed(speed);
  }, [animationControls]);

  // Timeline scrubbing handler
  const handleSeek = useCallback((progress) => {
    animationControls.seek(progress);
  }, [animationControls]);
  
  // Clear all players
  const clearField = useCallback(() => {
    Alert.alert(
      'Clear Field',
      'Are you sure you want to remove all players?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          // Save state before clearing
          saveToUndoHistory('clearField', {
            playerCount: players.length
          });
          fieldInteractions.clearAll();
        }},
      ]
    );
  }, [fieldInteractions, players, saveToUndoHistory]);

  // Animate controls visibility
  const animateControlsVisibility = useCallback((visible) => {
    // Use actual measured height, fallback to estimate if not measured yet
    const actualHeight = controlsHeightRef.current || Dimensions.get('window').height * 0.4;
    
    // When hidden, translate up by (actualHeight - handleHeight) to leave only handle visible
    const hiddenOffset = actualHeight - handleHeight;
    
    Animated.spring(controlsTranslateY, {
      toValue: visible ? 0 : hiddenOffset,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [controlsTranslateY]);

  // Toggle bottom controls visibility
  const toggleControlsVisibility = useCallback(() => {
    const newVisibility = !controlsVisible;
    setControlsVisible(newVisibility);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateControlsVisibility(newVisibility);
  }, [controlsVisible, animateControlsVisibility]);

  // Check if only pre-snap routes exist (no main play routes)
  const hasOnlyPreSnapRoutes = useMemo(() => {
    const hasPreSnap = players.some(player => 
      player.preSnapRoutes && player.preSnapRoutes.length > 0
    );
    const hasMainPlay = players.some(player => 
      player.track && player.track.length > 0
    );
    return hasPreSnap && !hasMainPlay;
  }, [players]);

  // Auto-hide palette when animation starts, show when it stops
  useEffect(() => {
    if (animationControls.isPlaying) {
      // Hide palette when animation starts
      setControlsVisible(false);
      animateControlsVisibility(false);
    } else {
      // Show palette when animation stops
      setControlsVisible(true);
      animateControlsVisibility(true);
    }
  }, [animationControls.isPlaying, animateControlsVisibility]);

  // For pre-snap only routes: show palette when animation completes
  useEffect(() => {
    if (hasOnlyPreSnapRoutes && animationControls.isPlaying) {
      // Pre-snap duration is 2000ms (2 seconds)
      const preSnapDuration = 2000;
      const isComplete = animationControls.currentTime >= preSnapDuration;
      
      if (isComplete) {
        // Animation completed, show palette
        setControlsVisible(true);
        animateControlsVisibility(true);
      }
    }
  }, [hasOnlyPreSnapRoutes, animationControls.isPlaying, animationControls.currentTime, animateControlsVisibility]);
  
  const getHeaderSubtitle = () => {
    if (isFormationMode && selectedFormation) {
      return `Formation: ${selectedFormation.name}`;
    }
    if (fieldInteractions.isDrawingRoute) {
      return "Route Mode";
    }
    if (interactionState.isDrawingPreSnapRoute) {
      return "Pre-Snap Mode";
    }
    if (fieldInteractions.isDeleteMode) {
      return "Delete Mode";
    }
    return `${players.length} player${players.length !== 1 ? 's' : ''} on field`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Playbook</Text>
        <Text style={styles.headerSubtitle}>
          {getHeaderSubtitle()}
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        style={styles.headerRightScroll}
        contentContainerStyle={styles.headerRight}
        showsHorizontalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleRouteDrawingToggle}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={fieldInteractions.isDrawingRoute ? "create" : "create-outline"} 
            size={18} 
            color={fieldInteractions.isDrawingRoute ? "#FFFFFF" : "#CCCCCC"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={togglePreSnapRouteDrawing}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={interactionState.isDrawingPreSnapRoute ? "walk" : "walk-outline"} 
            size={18} 
            color={interactionState.isDrawingPreSnapRoute ? "#FFFFFF" : "#CCCCCC"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={fieldInteractions.toggleDeleteMode}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={fieldInteractions.isDeleteMode ? "trash" : "trash-outline"} 
            size={18} 
            color={fieldInteractions.isDeleteMode ? "#EF4444" : "#CCCCCC"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleFormationModeToggle}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isFormationMode ? "apps" : "apps-outline"} 
            size={18} 
            color={isFormationMode ? "#FFFFFF" : "#CCCCCC"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleUndo}
          activeOpacity={0.7}
          disabled={!canUndo}
        >
          <Ionicons 
            name="arrow-undo-outline" 
            size={18} 
            color={canUndo ? "#FFFFFF" : "#666666"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={clearField}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={18} color="#CCCCCC" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
  
  const renderPlayers = () => {
    startTiming('renderPlayers');
    
    const playerElements = players.map((player) => {
      // Use animated position if available, otherwise fall back to anchor
      const currentPosition = animationEngine.positions[player.id] || player.anchor;
      const playerPixels = fieldGeometry.normalizedToPixels(currentPosition);
      
      return (
      <PlayerChip
        key={player.id}
        position={player.position}
          size={fieldGeometry.chipSize}
          isSelected={fieldInteractions.selectedPlayer === player.id}
        onPress={() => handleChipPress(player.id)}
        onLongPress={() => handleChipLongPress(player.id)}
        isDraggable={false} // Disable dragging for positioning phase
          isAnimating={animationEngine.isPlaying} // Show animation state
        style={{
            left: playerPixels.x - (fieldGeometry.chipSize / 2),
            top: playerPixels.y - (fieldGeometry.chipSize / 2),
          }}
        />
      );
    });
    
    endTiming('renderPlayers');
    return playerElements;
  };
  
  const renderRoutes = () => {
    startTiming('renderRoutes');
    
    // Don't render route lines during animation for cleaner visualization
    if (animationControls.isPlaying) {
      endTiming('renderRoutes');
      return null;
    }
    
    const routeElements = (
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {/* Render all completed routes (main play routes) */}
        {players.map((player) => 
          player.track.map((routeSegment, routeIndex) => {
            // Convert normalized route points to pixels for rendering using geometry hook
            const pixelRoute = routeSegment.points.map(point => fieldGeometry.normalizedToPixels(point));
            
            return (
            <Path
              key={`${player.id}-route-${routeIndex}`}
                d={createCurvedPath(pixelRoute)}
              stroke="#3B82F6"
              strokeWidth="3"
              fill="none"
              strokeDasharray="5,5"
            />
            );
          })
        )}
        
        {/* Render all pre-snap routes */}
        {players.map((player) => 
          (player.preSnapRoutes || []).map((routeSegment, routeIndex) => {
            // Convert normalized route points to pixels for rendering using geometry hook
            const pixelRoute = routeSegment.points.map(point => fieldGeometry.normalizedToPixels(point));
            
            return (
            <Path
              key={`${player.id}-presnap-${routeIndex}`}
                d={createCurvedPath(pixelRoute)}
              stroke="#F59E0B"
              strokeWidth="2"
              fill="none"
              strokeDasharray="3,3"
            />
            );
          })
        )}
        
        {/* Render current route being drawn */}
        {(fieldInteractions.isDrawingCurrentRoute || interactionState.isDrawingCurrentRoute) && (fieldInteractions.currentRoute.length > 0 || interactionState.currentRoute.length > 0) && (
          <Path
            d={createCurvedPath((fieldInteractions.currentRoute.length > 0 ? fieldInteractions.currentRoute : interactionState.currentRoute).map(point => fieldGeometry.normalizedToPixels(point)))}
            stroke={interactionState.isDrawingPreSnapRoute ? "#F59E0B" : "#EF4444"}
            strokeWidth="3"
            fill="none"
            strokeDasharray="8,4"
          />
        )}
        
        {/* Render route points */}
        {fieldInteractions.isDrawingCurrentRoute && fieldInteractions.currentRoute.map((point, index) => {
          const pixelPoint = fieldGeometry.normalizedToPixels(point);
          
          return (
          <Circle
            key={`point-${index}`}
              cx={pixelPoint.x}
              cy={pixelPoint.y}
            r="4"
            fill="#EF4444"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          );
        })}
      </Svg>
    );
    
    endTiming('renderRoutes');
    return routeElements;
  };
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
        >
          <View style={styles.fieldContainer}>
            <FootballField 
              onFieldPress={handleFieldPress}
              touchOverlayDimensions={fieldGeometry.touchOverlayDimensions}
              fieldHeight={fieldGeometry.fieldDimensions.height}
              fieldWidth={fieldGeometry.fieldDimensions.width}
            >
              {renderPlayers()}
              {renderRoutes()}
            </FootballField>
            
          </View>
        </ScrollView>
        
        {/* Fixed bottom controls - toggleable */}
        <Animated.View 
          style={[
            styles.unifiedBottomControls,
            {
              transform: [{ translateY: controlsTranslateY }]
            }
          ]}
          onLayout={(e) => {
            // Measure actual height of controls container
            const measuredHeight = e.nativeEvent.layout.height;
            if (measuredHeight > 0) {
              controlsHeightRef.current = measuredHeight;
            }
          }}
        >
          <BlurView 
            intensity={80} 
            tint="dark" 
            style={StyleSheet.absoluteFill}
          />
          {/* Pull Handle */}
          <TouchableOpacity
            style={styles.pullHandle}
            onPress={toggleControlsVisibility}
            activeOpacity={0.7}
          >
            <View style={styles.pullHandleBar} />
            <Ionicons 
              name={controlsVisible ? "chevron-down" : "chevron-up"} 
              size={20} 
              color="#FFFFFF" 
              style={styles.pullHandleIcon}
            />
          </TouchableOpacity>
          <View style={styles.controlsContent}>
          <ChipPalette
            onChipSelect={handleChipSelect}
            selectedChip={fieldInteractions.selectedChip}
            isDrawingRoute={fieldInteractions.isDrawingRoute}
            isDrawingCurrentRoute={fieldInteractions.isDrawingCurrentRoute || interactionState.isDrawingCurrentRoute}
            onCompleteRoute={interactionState.isDrawingPreSnapRoute ? completePreSnapRoute : fieldInteractions.completeRoute}
            onCancelRoute={fieldInteractions.cancelRoute}
          />
          <AnimationControls
            isPlaying={animationControls.isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onRestart={handleRestart}
            onSpeedChange={handleSpeedChange}
            onSeek={handleSeek}
            currentSpeed={animationControls.currentSpeed}
            duration={animationControls.duration}
            currentTime={animationControls.currentTime}
            hasRoutes={animationControls.hasRoutes}
          />
        </View>
        </Animated.View>
        
        {/* Trigger Setup Modal */}
        <TriggerSetupModal
          visible={showTriggerSetup}
          onClose={() => setShowTriggerSetup(false)}
          players={players}
          reactiveTriggers={animationEngine.reactiveTriggers}
          onTriggerAdded={() => {
            console.log('Trigger added successfully');
          }}
        />
        
        {/* Formation Selector Modal */}
        <FormationSelector
          visible={showFormationSelector}
          onClose={() => setShowFormationSelector(false)}
          onFormationSelect={handleFormationSelect}
          selectedFormation={selectedFormation}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerLeft: {
    flexShrink: 1,
    flexGrow: 1,
    alignItems: 'flex-start',
    minWidth: 0,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: getFontSize('XS'),
    color: '#CCCCCC',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 4,
  },
  headerButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 34,
    minHeight: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0, // No padding - field extends to bottom, palette overlays
  },
  fieldContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
  },
  unifiedBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  pullHandle: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'rgba(14, 14, 14, 0.9)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  pullHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#666666',
    borderRadius: 2,
    marginBottom: 4,
  },
  pullHandleIcon: {
    opacity: 0.8,
  },
  controlsContent: {
    backgroundColor: 'rgba(14, 14, 14, 0.7)', // Semi-transparent dark background for better contrast
  },
  routeModeIndicator: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  routeModeText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
  },
  deleteModeIndicator: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  deleteModeText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  routeDrawingIndicator: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  routeDrawingText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  routeDrawingButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  routeButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  routeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#1A1A1A',
  },
  cancelButtonText: {
    color: '#6B7280',
  },
});

export default AnimatedPlaybookScreen;
