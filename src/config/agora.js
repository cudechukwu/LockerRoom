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
  // Only check APP_ID for client-side (certificate is only needed server-side)
  const configured = !!(AGORA_APP_ID);
  if (!configured && __DEV__) {
    console.warn('⚠️ Agora APP_ID missing:', {
      hasAppId: !!AGORA_APP_ID,
      appIdValue: AGORA_APP_ID ? `${AGORA_APP_ID.substring(0, 8)}...` : 'empty',
      envCheck: typeof process !== 'undefined' ? 'process exists' : 'no process',
    });
  }
  return configured;
};

// Log warning if not configured (development only)
if (__DEV__ && !isAgoraConfigured()) {
  console.warn(
    '⚠️ Agora.io is not configured. Please add EXPO_PUBLIC_AGORA_APP_ID and EXPO_PUBLIC_AGORA_APP_CERTIFICATE to your .env file.\n' +
    'Get your credentials from: https://console.agora.io/'
  );
}

