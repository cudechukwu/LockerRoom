import React from 'react';
import { View, StyleSheet } from 'react-native';

const ScreenBackground = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0E0E', // Match HomeScreen and other screens
  },
});

export default ScreenBackground;
