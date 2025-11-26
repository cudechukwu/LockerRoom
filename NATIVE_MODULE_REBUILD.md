# Native Module Rebuild Required

## Issue
The `expo-device` native module is not found. This happens when native modules are added but the app hasn't been rebuilt.

## Solution

You need to rebuild the native app to link the new native modules (`expo-device`, `expo-application`, `expo-camera`).

### For iOS (Development Build)

```bash
# Rebuild the iOS app
npx expo run:ios
```

### For Android (Development Build)

```bash
# Rebuild the Android app
npx expo run:android
```

### Alternative: Prebuild (if using bare workflow)

```bash
# Prebuild native projects
npx expo prebuild --clean

# Then run on iOS
npx expo run:ios

# Or Android
npx expo run:android
```

## Temporary Workaround

I've added error handling to `deviceFingerprint.js` that will use a fallback method if the native modules aren't available. However, for production use, you should rebuild the app.

## Note

After rebuilding, the native modules will be properly linked and the error will disappear. The app will then be able to:
- Get device information for fingerprinting
- Access camera for QR code scanning
- Get installation ID for device tracking

