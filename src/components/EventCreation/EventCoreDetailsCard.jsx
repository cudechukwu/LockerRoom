import React, { memo } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../../constants/typography';
import CollapsibleTimePicker from '../CollapsibleTimePicker';
import GradientCard from './GradientCard';

/**
 * EventCoreDetailsCard Component
 * Core event details: Title, Description, Location, Date, Start Time, End Time
 */
const EventCoreDetailsCard = memo(({
  title,
  setTitle,
  notes,
  setNotes,
  location,
  setLocation,
  date,
  setDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  durationText,
  titleError,
  titleInputRef,
}) => {
  return (
    <GradientCard>
      <View style={styles.contentContainer}>
        {/* Title */}
        <View style={styles.inputField}>
        <TextInput
          ref={titleInputRef}
          style={[styles.modernInput, titleError && styles.inputError]}
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          placeholderTextColor={COLORS.TEXT_TERTIARY}
        />
        {titleError && (
          <Text style={styles.errorText}>{titleError}</Text>
        )}
      </View>
      <View style={styles.fieldDivider} />

      {/* Description */}
      <View style={styles.inputField}>
        <TextInput
          style={styles.modernInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add description..."
          placeholderTextColor={COLORS.TEXT_TERTIARY}
        />
      </View>
      <View style={styles.fieldDivider} />

      {/* Location */}
      <View style={styles.inputField}>
        <TextInput
          style={styles.modernInput}
          value={location}
          onChangeText={setLocation}
          placeholder="Location"
          placeholderTextColor={COLORS.TEXT_TERTIARY}
        />
      </View>
      <View style={styles.fieldDivider} />

      {/* Date */}
      <View style={styles.inputField}>
        <TextInput
          style={[styles.modernInput, styles.dateInput]}
          value={date}
          editable={false}
          placeholder="Date"
          placeholderTextColor={COLORS.TEXT_TERTIARY}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.fieldDivider} />

      {/* Start Time */}
      <View style={styles.inputField}>
        <CollapsibleTimePicker
          value={startTime}
          onChange={setStartTime}
          label="Start Time"
          is24Hour={false}
        />
      </View>
      <View style={styles.fieldDivider} />

      {/* End Time */}
      <View style={styles.inputField}>
        <CollapsibleTimePicker
          value={endTime}
          onChange={setEndTime}
          label="End Time"
          showDuration={true}
          durationText={durationText}
          is24Hour={false}
        />
      </View>
      </View>
    </GradientCard>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    gap: 16,
  },
  inputField: {
    marginBottom: 0,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  modernInput: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.SM),
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 2,
    borderWidth: 0,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  dateInput: {
    opacity: 0.7,
  },
  inputError: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.TEXT_SECONDARY,
    paddingBottom: 4,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    fontSize: scaleFont(FONT_SIZES.XS),
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    marginLeft: 0,
  },
});

EventCoreDetailsCard.displayName = 'EventCoreDetailsCard';

export default EventCoreDetailsCard;

