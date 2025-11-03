import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHomeData } from '../hooks/useHomeData';

/**
 * Test component to verify useHomeData hook works correctly
 * This will be removed after Phase 3
 */
export const TestHomeData = () => {
  const { data, isLoading, isFetching, error } = useHomeData();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Team ID: {data?.teamId}</Text>
      <Text style={styles.text}>Team Name: {data?.teamInfo?.name}</Text>
      <Text style={styles.text}>Notifications: {data?.notificationCount}</Text>
      <Text style={styles.text}>Next Event: {data?.nextEvent?.title || 'None'}</Text>
      <Text style={styles.text}>User: {data?.userName}</Text>
      <Text style={styles.text}>Fetching: {isFetching ? 'Yes' : 'No'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1A1A1A',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
});
