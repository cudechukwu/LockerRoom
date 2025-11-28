# iOS-Style Wheel Time Picker Implementation

## Overview
Replace the current text input time fields with a native iOS-style wheel picker that allows users to drag/scroll through hours, minutes, and AM/PM.

## Implementation Options

### Option 1: Native DateTimePicker (Recommended)
**Package:** `@react-native-community/datetimepicker`

**Pros:**
- Native iOS wheel picker (exactly like the image)
- Native Android picker
- Well-maintained, official community package
- Minimal custom code needed

**Cons:**
- Modal presentation on iOS (can be made inline with custom wrapper)
- Requires native module

### Option 2: Custom Wheel Picker
**Package:** Custom implementation with ScrollView + snap-to-item

**Pros:**
- Full control over styling
- Can be fully inline
- No native dependencies

**Cons:**
- More complex to implement
- Need to handle snap-to-item, momentum scrolling
- More code to maintain

## Recommended: Native DateTimePicker with Inline Wrapper

### Step 1: Install Package
```bash
npm install @react-native-community/datetimepicker
# or
yarn add @react-native-community/datetimepicker
```

### Step 2: Create InlineTimePicker Component

```jsx
// src/components/InlineTimePicker.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, scaleFont } from '../constants/typography';

const InlineTimePicker = ({ 
  value, // Date object
  onChange, 
  mode = 'time',
  display = Platform.OS === 'ios' ? 'spinner' : 'default',
  is24Hour = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const formatTime = (date) => {
    if (!date) return '3:00 PM';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate && onChange) {
      onChange(selectedDate);
    }
  };

  // iOS: Inline picker
  if (Platform.OS === 'ios' && display === 'spinner') {
    return (
      <View style={styles.container}>
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display="spinner"
          onChange={handleChange}
          is24Hour={is24Hour}
          textColor={COLORS.TEXT_PRIMARY}
          themeVariant="dark"
          style={styles.picker}
        />
      </View>
    );
  }

  // Android: Modal picker triggered by button
  return (
    <View>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.buttonText}>{formatTime(value)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display="default"
          onChange={handleChange}
          is24Hour={is24Hour}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
  },
  button: {
    backgroundColor: COLORS.BACKGROUND_PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    fontSize: scaleFont(FONT_SIZES.BASE),
    color: COLORS.TEXT_PRIMARY,
  },
});

export default InlineTimePicker;
```

### Step 3: Update EventCreationModal

**Changes needed:**

1. **Convert time strings to Date objects:**
```jsx
// Convert "3:00 PM" string to Date object
const parseTimeString = (timeStr) => {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return new Date();
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Convert Date object to "3:00 PM" string
const formatTimeString = (date) => {
  if (!date) return '3:00 PM';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
};
```

2. **Update state to use Date objects:**
```jsx
const [startTime, setStartTime] = useState(() => {
  const date = new Date();
  date.setHours(15, 0, 0, 0); // 3:00 PM
  return date;
});

const [endTime, setEndTime] = useState(() => {
  const date = new Date();
  date.setHours(17, 0, 0, 0); // 5:00 PM
  return date;
});
```

3. **Replace TextInput with InlineTimePicker:**
```jsx
{/* Start Time and End Time */}
<View style={styles.timeRow}>
  <View style={[styles.inputField, styles.timeInputField]}>
    <Text style={styles.timeLabel}>Start</Text>
    <InlineTimePicker
      value={startTime}
      onChange={setStartTime}
      mode="time"
      display="spinner"
    />
  </View>
  <View style={[styles.inputField, styles.timeInputField]}>
    <Text style={styles.timeLabel}>End</Text>
    <InlineTimePicker
      value={endTime}
      onChange={setEndTime}
      mode="time"
      display="spinner"
    />
  </View>
</View>
```

4. **Update form submission to convert back to string:**
```jsx
const eventData = {
  // ... other fields
  startTime: formatTimeString(startTime),
  endTime: formatTimeString(endTime),
};
```

## Styling to Match Your Design

The native picker on iOS will automatically use dark mode if your app is in dark mode. However, you can customize:

```jsx
<DateTimePicker
  themeVariant="dark" // Forces dark theme
  textColor={COLORS.TEXT_PRIMARY} // iOS only
  style={styles.picker}
/>
```

## Alternative: Custom Wheel Picker (More Control)

If you want a fully custom inline picker with exact styling control, you'd need to build it with ScrollView + snap-to-item logic. This is more complex but gives you:

- Exact styling control
- Fully inline (no modal)
- Custom animations
- Perfect dark theme matching

**Estimated effort:** 2-3 days for a polished custom implementation

**Recommended:** Start with the native DateTimePicker, then customize if needed.

## Next Steps

1. Install `@react-native-community/datetimepicker`
2. Create `InlineTimePicker` component
3. Update `EventCreationModal` to use Date objects for time
4. Replace TextInput fields with InlineTimePicker
5. Test on both iOS and Android
6. Adjust styling to match your design system


