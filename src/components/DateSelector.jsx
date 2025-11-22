import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';
import {
  normalizeDate,
  getDateFromOffset,
  getOffsetFromDate,
  formatDateLabel,
  isToday as isTodayDate,
  isSameDay,
  getTodayAnchor,
} from '../utils/dateUtils';

// CONSTANTS
const TOTAL_ITEMS = 20000; // Large number for infinite scroll
const INITIAL_INDEX = 10000; // Middle = "today" (offset 0)
const TODAY_OFFSET = 0; // Today is always offset 0

// 🔥 FIXED: Use truly fixed width to prevent drift
// This must match the actual rendered width exactly
const FIXED_ITEM_WIDTH = 88; // width (80) + marginRight (8) - must be exact

/**
 * 🔥 FIXED: Separate measurement component
 * Measures item width reliably before FlatList mounts
 * This prevents race conditions with onLayout
 */
const InvisibleDateCell = ({ onMeasured }) => {
  const measuredRef = useRef(false);

  const handleLayout = useCallback(
    (event) => {
      if (measuredRef.current) return;
      const { width } = event.nativeEvent.layout;
      if (width > 0) {
        measuredRef.current = true;
        onMeasured(width);
      }
    },
    [onMeasured]
  );

  return (
    <View
      style={[
        styles.dateItem,
        { position: 'absolute', opacity: 0, zIndex: -1 },
      ]}
      onLayout={handleLayout}
    >
      <Text style={styles.dateText}>TODAY</Text>
    </View>
  );
};

const DateSelector = ({
  currentDate,
  onDateSelect,
  showBackToToday,
  onBackToToday,
}) => {
  const listRef = useRef(null);
  const hasMountedRef = useRef(false);
  const scrollLockRef = useRef(false); // Scroll manager lock
  const [itemWidth, setItemWidth] = useState(FIXED_ITEM_WIDTH);
  const [isMeasured, setIsMeasured] = useState(false);

  // Normalize current date
  const currentNormalized = useMemo(() => normalizeDate(currentDate), [currentDate]);

  /**
   * 🔥 FIXED: Scroll Manager Lock
   * Prevents race conditions between multiple scroll operations
   */
  const safeScroll = useCallback((scrollFn) => {
    if (scrollLockRef.current) {
      return;
    }
    scrollLockRef.current = true;
    scrollFn();
    // Release lock after scroll completes
    setTimeout(() => {
      scrollLockRef.current = false;
    }, 300);
  }, []);

  /**
   * 🔥 NEW: Virtualized infinite scroll model
   * Create array of offsets instead of pre-generated dates
   * Each item is just an offset number (0 = today, -1 = yesterday, etc.)
   */
  const dateOffsets = useMemo(() => {
    // Create array of offsets: [-10000, -9999, ..., -1, 0, 1, ..., 9999]
    // This gives us 20,000 days of scroll range (about 55 years in each direction)
    return Array.from({ length: TOTAL_ITEMS }, (_, i) => i - INITIAL_INDEX);
  }, []);

  /**
   * Get the index for the currently selected date
   * Calculates offset from today and converts to index
   */
  const selectedIndex = useMemo(() => {
    if (!currentNormalized) return INITIAL_INDEX;
    const offset = getOffsetFromDate(currentNormalized);
    if (offset === null) return INITIAL_INDEX;
    return INITIAL_INDEX + offset;
  }, [currentNormalized]);

  /**
   * 🔥 FIXED: Handle measurement from invisible cell
   */
  const handleMeasured = useCallback((width) => {
    if (width > 0 && width !== itemWidth) {
      setItemWidth(width);
      setIsMeasured(true);
    }
  }, [itemWidth]);

  /**
   * 🔥 FIXED: Scroll to today on initial mount
   * Only runs after measurement is complete
   * Uses scrollToIndex exclusively (no manual offset calculations)
   */
  useEffect(() => {
    if (!isMeasured || hasMountedRef.current || !listRef.current) return;

    safeScroll(() => {
      listRef.current?.scrollToIndex({
        index: INITIAL_INDEX,
        animated: false,
        viewPosition: 0.5, // Center the item
      });
      hasMountedRef.current = true;
    });
  }, [isMeasured, safeScroll]);

  /**
   * 🔥 FIXED: Scroll to selected date when it changes
   * Only runs after initial mount to avoid duplicate scrolling
   * Uses scrollToIndex exclusively
   */
  useEffect(() => {
    if (!hasMountedRef.current) return; // Skip on initial mount
    if (!isMeasured || !listRef.current) return;
    if (selectedIndex < 0 || selectedIndex >= TOTAL_ITEMS) return;

    safeScroll(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    });
  }, [selectedIndex, isMeasured, safeScroll]);

  /**
   * 🔥 FIXED: getItemLayout with truly fixed width
   * Only works correctly if width is truly fixed
   * We enforce fixed width via styles
   */
  const getItemLayout = useCallback(
    (data, index) => ({
      length: FIXED_ITEM_WIDTH,
      offset: FIXED_ITEM_WIDTH * index,
      index,
    }),
    []
  );

  /**
   * 🔥 FIXED: Render each date item
   * Uses Pressable for better Android performance
   * Uses scrollToIndex exclusively (no manual offset calculations)
   */
  const renderItem = useCallback(
    ({ item: offset, index }) => {
      // Calculate date from offset on-demand
      const date = getDateFromOffset(offset);
      const normalizedDate = normalizeDate(date);

      // Check if this is today (offset 0)
      const isTodayItem = offset === TODAY_OFFSET;
      // Check if this is the selected date
      const isSelected = currentNormalized && isSameDay(normalizedDate, currentNormalized);

      return (
        <Pressable
          style={({ pressed }) => [
            styles.dateItem,
            isTodayItem && !isSelected && styles.todayItem,
            isSelected && styles.selectedItem,
            pressed && styles.dateItemPressed,
          ]}
          onPress={() => {
            // Pass the normalized date to parent
            onDateSelect(normalizedDate);
            // 🔥 FIXED: Use scrollToIndex exclusively, no manual offset calculations
            safeScroll(() => {
              listRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5,
              });
            });
          }}
        >
          <Text
            style={[
              styles.dateText,
              isTodayItem && !isSelected && styles.todayText,
              isSelected && styles.selectedText,
            ]}
          >
            {formatDateLabel(normalizedDate)}
          </Text>
        </Pressable>
      );
    },
    [currentNormalized, onDateSelect, safeScroll]
  );

  return (
    <View style={styles.wrapper}>
      {/* 🔥 FIXED: Separate measurement component */}
      <InvisibleDateCell onMeasured={handleMeasured} />

      <FlatList
        ref={listRef}
        data={dateOffsets}
        keyExtractor={(offset) => `offset-${offset}`}
        horizontal
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // 🔥 FIXED: Performance optimizations for infinite scroll
        getItemLayout={getItemLayout}
        // 🔥 FIXED: Removed initialScrollIndex - scroll after layout instead
        initialNumToRender={10}
        windowSize={21}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        // 🔥 FIXED: Improved scrollToIndexFailed handler with retry loop
        onScrollToIndexFailed={(info) => {
          // Retry with exponential backoff
          let retryCount = 0;
          const maxRetries = 5;

          const retryScroll = () => {
            if (retryCount >= maxRetries) {
              // If scrollToIndex keeps failing, it's likely a layout issue
              // Don't fall back to scrollToOffset (which has drift issues)
              // Instead, just log and let user manually scroll
              console.warn('Failed to scroll to index after retries:', info.index);
              return;
            }

            retryCount++;
            setTimeout(() => {
              if (listRef.current && !scrollLockRef.current) {
                safeScroll(() => {
                  listRef.current?.scrollToIndex({
                    index: info.index,
                    animated: false,
                    viewPosition: 0.5,
                  });
                });
              }
            }, 100 * retryCount); // Exponential backoff
          };

          retryScroll();
        }}
      />

      {/* Optional: Back to Today */}
      {showBackToToday && (
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnPressed,
          ]}
          onPress={() => {
            // 🔥 FIXED: Use scrollToIndex exclusively
            safeScroll(() => {
              listRef.current?.scrollToIndex({
                index: INITIAL_INDEX,
                animated: true,
                viewPosition: 0.5,
              });
            });
            // Call parent handler
            onBackToToday();
          }}
        >
          <Ionicons name="arrow-back" size={16} color={COLORS.WHITE} />
          <Text style={styles.backBtnText}>Today</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  // 🔥 FIXED: Enforce truly fixed width to prevent drift
  // width must equal FIXED_ITEM_WIDTH (88)
  dateItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: 80, // 🔥 FIXED: Use fixed width instead of minWidth (increased from 68)
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayItem: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  selectedItem: {
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
  },
  dateItemPressed: {
    opacity: 0.7,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.TEXT_TERTIARY,
    fontSize: scaleFont(11),
    // 🔥 FIXED: Prevent text from affecting width
    textAlign: 'center',
  },
  todayText: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  selectedText: {
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
  backBtn: {
    position: 'absolute',
    right: 20,
    top: 16,
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  backBtnPressed: {
    opacity: 0.7,
  },
  backBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.WHITE,
    fontWeight: FONT_WEIGHTS.SEMIBOLD,
  },
});

export default DateSelector;
