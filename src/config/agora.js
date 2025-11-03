/**
 * Agora.io Configuration
 * 
 * Get your App ID and App Certificate from:
 * https://console.agora.io/
 * 
 * Add to your .env file:
 * EXPO_PUBLIC_AGORA_APP_ID=your_app_id_here
 * EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your_app_certificate_here
 */

export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

export const AGORA_APP_CERTIFICATE = process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE || '';

// Validate configuration
export const isAgoraConfigured = () => {
  return !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE);
};

// Log warning if not configured (development only)
if (__DEV__ && !isAgoraConfigured()) {
  console.warn(
    '⚠️ Agora.io is not configured. Please add EXPO_PUBLIC_AGORA_APP_ID and EXPO_PUBLIC_AGORA_APP_CERTIFICATE to your .env file.\n' +
    'Get your credentials from: https://console.agora.io/'
  );
}

