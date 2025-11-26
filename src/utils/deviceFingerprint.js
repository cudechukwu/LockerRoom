/**
 * Device Fingerprinting Utility
 * Creates a unique device identifier for anti-cheat measures
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import CryptoJS from 'crypto-js';

/**
 * Get device fingerprint for anti-cheat
 * @returns {Promise<string>} Device fingerprint hash
 */
export async function getDeviceFingerprint() {
  try {
    // Check if native modules are available
    let deviceInfo = {
      model: 'unknown',
      os: 'unknown',
      osVersion: 'unknown',
      deviceId: 'unknown',
      brand: 'unknown',
      manufacturer: 'unknown'
    };

    try {
      // Try to get device info from native modules
      let installationId = 'unknown';
      
      // Check if Application module is available before calling
      if (Application && typeof Application.getInstallationIdAsync === 'function') {
        try {
          installationId = await Application.getInstallationIdAsync() || 'unknown';
        } catch (appError) {
          // Application module exists but call failed
          console.warn('Failed to get installation ID:', appError.message);
          installationId = `fallback-${Date.now()}-${Math.random()}`;
        }
      } else {
        // Application module not available
        installationId = `fallback-${Date.now()}-${Math.random()}`;
      }
      
      deviceInfo = {
        model: Device.modelName || 'unknown',
        os: Device.osName || 'unknown',
        osVersion: Device.osVersion || 'unknown',
        deviceId: installationId,
        brand: Device.brand || 'unknown',
        manufacturer: Device.manufacturer || 'unknown'
      };
    } catch (nativeError) {
      // Native module not available - use fallback
      console.warn('Native device module not available, using fallback:', nativeError.message);
      // Use a combination of available info
      deviceInfo.deviceId = `fallback-${Date.now()}-${Math.random()}`;
    }
    
    // Create a hash of the device info (don't store PII)
    const deviceString = JSON.stringify(deviceInfo);
    const hash = CryptoJS.SHA256(deviceString).toString();
    
    return hash;
  } catch (error) {
    console.error('Error getting device fingerprint:', error);
    // Fallback to a simple hash based on timestamp
    return CryptoJS.SHA256(`fallback-${Date.now()}-${Math.random()}`).toString();
  }
}

/**
 * Get device info (for debugging/logging purposes)
 * @returns {Promise<Object>} Device information
 */
export async function getDeviceInfo() {
  try {
    // Check if native modules are available
    try {
      let installationId = 'unknown';
      
      // Check if Application module is available before calling
      if (Application && typeof Application.getInstallationIdAsync === 'function') {
        try {
          installationId = await Application.getInstallationIdAsync() || 'unknown';
        } catch (appError) {
          // Application module exists but call failed
          installationId = `fallback-${Date.now()}`;
        }
      } else {
        // Application module not available
        installationId = `fallback-${Date.now()}`;
      }
      
      return {
        model: Device.modelName,
        os: Device.osName,
        osVersion: Device.osVersion,
        deviceId: installationId,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        isDevice: Device.isDevice,
        platform: Device.platform
      };
    } catch (nativeError) {
      // Native module not available
      console.warn('Native device module not available:', nativeError.message);
      return {
        model: 'unknown',
        os: 'unknown',
        osVersion: 'unknown',
        deviceId: `fallback-${Date.now()}`,
        brand: 'unknown',
        manufacturer: 'unknown',
        isDevice: false,
        platform: 'unknown'
      };
    }
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
}

