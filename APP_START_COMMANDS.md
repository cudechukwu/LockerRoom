# App Start Commands Guide

This document explains the commands needed to build and run the LockerRoom app on your device.

## 🚀 Quick Start (After Initial Build)

Once you've built the app for your device, you only need:

```bash
npx expo start --dev-client
```

This starts the development server. Open the app on your phone and it will connect automatically.

---

## 📱 Building for Physical Device

### iOS (iPhone/iPad)

**First time or after adding native modules (like expo-sharing):**

```bash
npx expo run:ios --device
```

**What it does:**
- Builds the native iOS app for your connected physical device
- Installs the app on your iPhone/iPad
- Opens the app automatically
- Includes all native modules (expo-sharing, expo-file-system, etc.)

**Requirements:**
- iPhone/iPad connected via USB
- Xcode installed
- Apple Developer account (free account works for development)
- Device unlocked and trusted

**After build completes:**
```bash
npx expo start --dev-client
```

---

### Android

**First time or after adding native modules:**

```bash
npx expo run:android
```

**What it does:**
- Builds the native Android app (APK)
- Installs on connected Android device or emulator
- Opens the app automatically

**Requirements:**
- Android device connected via USB with USB debugging enabled
- OR Android emulator running
- Android Studio installed (for emulator)

**After build completes:**
```bash
npx expo start --dev-client
```

---

## 🖥️ Building for Simulator/Emulator

### iOS Simulator

```bash
npx expo run:ios
```

**What it does:**
- Builds for iOS Simulator (not physical device)
- Faster than device build
- Good for quick testing
- **Note:** Some features (like expo-sharing) may work differently on simulator

---

### Android Emulator

```bash
npx expo run:android
```

**What it does:**
- Builds for Android Emulator
- Requires emulator to be running first

---

## 🔄 When to Rebuild

You need to rebuild (`npx expo run:ios --device` or `npx expo run:android`) when:

- ✅ Adding new native modules (like `expo-sharing`, `expo-camera`, etc.)
- ✅ Changing native configuration
- ✅ Updating Expo SDK version
- ✅ First time setting up the project

You **don't need** to rebuild for:
- ❌ JavaScript/TypeScript code changes
- ❌ Component changes
- ❌ API changes
- ❌ Styling changes

These changes work with Fast Refresh - just save and the app updates!

---

## 🛠️ Other Useful Commands

### Start Dev Server (After Build)

```bash
npx expo start --dev-client
```

**What it does:**
- Starts Metro bundler (JavaScript bundler)
- Connects to your built app
- Enables Fast Refresh for code changes
- Shows QR code for connection

**Options:**
- `--clear` - Clears Metro cache (use if having issues)
- `--dev-client` - Required when using custom dev client

---

### Regenerate Native Code

```bash
npx expo prebuild --clean
```

**What it does:**
- Regenerates `ios/` and `android/` folders
- Cleans old native code
- **Does NOT build** - just prepares files

**When to use:**
- After changing `app.json` or `app.config.js`
- After updating Expo config plugins
- If native folders get corrupted

**After running:**
You still need to build: `npx expo run:ios --device`

---

### Clear Cache and Restart

```bash
npx expo start --clear
```

**What it does:**
- Clears Metro bundler cache
- Restarts dev server
- Fixes most "weird" JavaScript errors

**Use when:**
- Code changes not appearing
- Strange errors after updates
- Cache-related issues

---

## 📋 Typical Workflow

### First Time Setup

1. **Build for device:**
   ```bash
   npx expo run:ios --device
   # or
   npx expo run:android
   ```

2. **Wait for build to complete** (5-10 minutes)

3. **Start dev server:**
   ```bash
   npx expo start --dev-client
   ```

4. **Open app on device** - it connects automatically

---

### Daily Development

1. **Start dev server:**
   ```bash
   npx expo start --dev-client
   ```

2. **Open app on device** - already installed from previous build

3. **Make code changes** - Fast Refresh updates automatically

4. **If you add a native module:**
   - Stop dev server (Ctrl+C)
   - Rebuild: `npx expo run:ios --device`
   - Start dev server again: `npx expo start --dev-client`

---

## 🐛 Troubleshooting

### "Cannot find native module" Error

**Solution:** Rebuild the app
```bash
npx expo run:ios --device
```

### App Not Connecting to Dev Server

**Solution:** 
1. Make sure phone and computer are on same WiFi
2. Restart dev server: `npx expo start --dev-client --clear`
3. Reload app (shake device → "Reload")

### Build Fails

**Solution:**
1. Clean build:
   ```bash
   npx expo prebuild --clean
   npx expo run:ios --device
   ```

2. Clear caches:
   ```bash
   cd ios && xcodebuild clean && cd ..
   npx expo start --clear
   ```

### Device Not Detected

**iOS:**
- Unlock device
- Trust computer when prompted
- Check USB connection
- Run: `xcrun xctrace list devices` to verify

**Android:**
- Enable USB debugging in Developer Options
- Check: `adb devices` to verify connection

---

## 📝 Notes

- **Development builds** are different from Expo Go
- You must rebuild when adding native modules
- JavaScript changes work instantly with Fast Refresh
- Keep dev server running while developing
- Device and computer must be on same network for dev server connection

---

## 🔗 Related Files

- `eas.json` - EAS Build configuration (for cloud builds)
- `app.json` - Expo configuration
- `package.json` - Dependencies and scripts

