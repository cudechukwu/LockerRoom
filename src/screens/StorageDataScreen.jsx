import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getFontWeight, getFontSize } from '../constants/fonts';

const StorageDataScreen = ({ navigation }) => {
  const [storageData, setStorageData] = useState({
    totalStorage: '2.4 GB',
    photos: '1.2 GB',
    videos: '800 MB',
    documents: '200 MB',
    cache: '200 MB',
  });

  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and temporary files. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setIsClearing(true);
            // Simulate cache clearing
            setTimeout(() => {
              setStorageData(prev => ({
                ...prev,
                cache: '0 MB'
              }));
              setIsClearing(false);
              Alert.alert('Success', 'Cache cleared successfully!');
            }, 2000);
          }
        }
      ]
    );
  };

  const handleClearPhotos = () => {
    Alert.alert(
      'Clear Photos',
      'This will remove all downloaded photos from your device. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setIsClearing(true);
            setTimeout(() => {
              setStorageData(prev => ({
                ...prev,
                photos: '0 MB'
              }));
              setIsClearing(false);
              Alert.alert('Success', 'Photos cleared successfully!');
            }, 2000);
          }
        }
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all downloaded content from your device. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            setIsClearing(true);
            setTimeout(() => {
              setStorageData({
                totalStorage: '200 MB',
                photos: '0 MB',
                videos: '0 MB',
                documents: '0 MB',
                cache: '0 MB',
              });
              setIsClearing(false);
              Alert.alert('Success', 'All data cleared successfully!');
            }, 3000);
          }
        }
      ]
    );
  };

  const StorageItem = ({ icon, title, size, onClear, canClear = true }) => (
    <View style={styles.storageItem}>
      <View style={styles.storageInfo}>
        <Ionicons name={icon} size={20} color="#6B7280" />
        <Text style={styles.storageTitle}>{title}</Text>
      </View>
      <View style={styles.storageRight}>
        <Text style={styles.storageSize}>{size}</Text>
        {canClear && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={onClear}
            disabled={isClearing}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const DataUsageItem = ({ title, description, value, color = '#6B7280' }) => (
    <View style={styles.dataItem}>
      <View style={styles.dataInfo}>
        <Text style={styles.dataTitle}>{title}</Text>
        <Text style={styles.dataDescription}>{description}</Text>
      </View>
      <View style={[styles.dataValue, { backgroundColor: color }]}>
        <Text style={styles.dataValueText}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#3A3A3E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Storage & Data</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Storage Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage Overview</Text>
            <View style={styles.storageCard}>
              <View style={styles.storageHeader}>
                <Ionicons name="phone-portrait-outline" size={24} color="#3A3A3E" />
                <Text style={styles.storageCardTitle}>Device Storage</Text>
              </View>
              <Text style={styles.totalStorage}>{storageData.totalStorage} used</Text>
              <View style={styles.storageBar}>
                <View style={[styles.storageBarFill, { width: '60%' }]} />
              </View>
            </View>
          </View>

          {/* Storage Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage Breakdown</Text>
            
            <StorageItem
              icon="images-outline"
              title="Photos"
              size={storageData.photos}
              onClear={handleClearPhotos}
            />
            
            <StorageItem
              icon="videocam-outline"
              title="Videos"
              size={storageData.videos}
              onClear={() => Alert.alert('Clear Videos', 'Video clearing not implemented yet.')}
            />
            
            <StorageItem
              icon="document-outline"
              title="Documents"
              size={storageData.documents}
              onClear={() => Alert.alert('Clear Documents', 'Document clearing not implemented yet.')}
            />
            
            <StorageItem
              icon="trash-outline"
              title="Cache"
              size={storageData.cache}
              onClear={handleClearCache}
            />
          </View>

          {/* Data Usage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Usage</Text>
            
            <DataUsageItem
              title="Messages Sent"
              description="This month"
              value="1,247"
              color="#10B981"
            />
            
            <DataUsageItem
              title="Photos Shared"
              description="This month"
              value="89"
              color="#3B82F6"
            />
            
            <DataUsageItem
              title="Videos Shared"
              description="This month"
              value="12"
              color="#8B5CF6"
            />
            
            <DataUsageItem
              title="Files Downloaded"
              description="This month"
              value="156"
              color="#F59E0B"
            />
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.clearAllButton]} 
              onPress={handleClearAllData}
              disabled={isClearing}
            >
              {isClearing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.actionButtonText}>
                {isClearing ? 'Clearing...' : 'Clear All Data'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.refreshButton]} 
              onPress={() => {
                // Simulate refresh
                Alert.alert('Refreshed', 'Storage data has been refreshed.');
              }}
            >
              <Ionicons name="refresh-outline" size={20} color="#3A3A3E" />
              <Text style={[styles.actionButtonText, styles.refreshButtonText]}>
                Refresh Data
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Clearing data will remove downloaded content but won't affect your account or settings.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: getFontSize('LG'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginBottom: 16,
  },
  storageCard: {
    padding: 20,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storageCardTitle: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    color: '#3A3A3E',
    marginLeft: 12,
  },
  totalStorage: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
    marginBottom: 12,
  },
  storageBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storageTitle: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#3A3A3E',
    marginLeft: 12,
  },
  storageRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageSize: {
    fontSize: getFontSize('SM'),
    color: '#6B7280',
    marginRight: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('MEDIUM'),
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  dataInfo: {
    flex: 1,
  },
  dataTitle: {
    fontSize: getFontSize('SM'),
    fontWeight: getFontWeight('MEDIUM'),
    color: '#3A3A3E',
    marginBottom: 2,
  },
  dataDescription: {
    fontSize: getFontSize('XS'),
    color: '#6B7280',
  },
  dataValue: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dataValueText: {
    color: '#FFFFFF',
    fontSize: getFontSize('XS'),
    fontWeight: getFontWeight('SEMIBOLD'),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  clearAllButton: {
    backgroundColor: '#EF4444',
  },
  refreshButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: getFontSize('BASE'),
    fontWeight: getFontWeight('SEMIBOLD'),
    marginLeft: 8,
  },
  refreshButtonText: {
    color: '#3A3A3E',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: getFontSize('XS'),
    color: '#6B7280',
    marginLeft: 12,
    lineHeight: 16,
  },
});

export default StorageDataScreen;
