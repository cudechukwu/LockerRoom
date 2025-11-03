// Typography System Test
// This file demonstrates the usage of the new typography system

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, FONT_SIZES, FONT_WEIGHTS, getTypography } from '../constants/typography';

const TypographyTest = () => {
  return (
    <View style={styles.container}>
      {/* Headers */}
      <Text style={TYPOGRAPHY.h1}>H1 Header</Text>
      <Text style={TYPOGRAPHY.h2}>H2 Header</Text>
      
      {/* Titles and Subtitles */}
      <Text style={TYPOGRAPHY.title}>Title Text</Text>
      <Text style={TYPOGRAPHY.subtitle}>Subtitle Text</Text>
      
      {/* Body Text */}
      <Text style={TYPOGRAPHY.body}>Body text for regular content</Text>
      <Text style={TYPOGRAPHY.bodyLarge}>Large body text for emphasis</Text>
      <Text style={TYPOGRAPHY.bodyMedium}>Medium body text</Text>
      
      {/* Captions and Labels */}
      <Text style={TYPOGRAPHY.caption}>Caption text</Text>
      <Text style={TYPOGRAPHY.captionSmall}>Small caption</Text>
      <Text style={TYPOGRAPHY.overline}>OVERLINE TEXT</Text>
      
      {/* Specialized Components */}
      <Text style={TYPOGRAPHY.greeting}>Good Afternoon, Dean</Text>
      <Text style={TYPOGRAPHY.teamName}>Wesleyan Cardinals</Text>
      <Text style={TYPOGRAPHY.teamSubtitle}>Football Team</Text>
      
      {/* Buttons and Badges */}
      <Text style={TYPOGRAPHY.button}>Button Text</Text>
      <Text style={TYPOGRAPHY.buttonSmall}>Small Button</Text>
      <Text style={TYPOGRAPHY.badge}>BADGE</Text>
      
      {/* Event and Feed Styles */}
      <Text style={TYPOGRAPHY.eventTitle}>Team Meeting</Text>
      <Text style={TYPOGRAPHY.eventTime}>2:00 PM</Text>
      <Text style={TYPOGRAPHY.feedName}>John Doe</Text>
      <Text style={TYPOGRAPHY.feedContent}>This is a feed post content</Text>
      
      {/* Theme Testing */}
      <Text style={getTypography('dark').body}>Dark theme body text</Text>
      <Text style={getTypography('light').body}>Light theme body text</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0A0A0F',
  },
});

export default TypographyTest;
