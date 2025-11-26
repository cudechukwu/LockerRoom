# Rebuild Instructions for Native Modules

## Quick Answer
**Yes, you can click the play button in Xcode!** But first, you need to regenerate the native project to include the new modules.

## Two Ways to Rebuild

### Option 1: Using Xcode (Recommended if you already have it open)

1. **First, regenerate the native project:**
   ```bash
   cd /Users/chukwudi/Desktop/LockerRoom
   npx expo prebuild --clean
   ```
   This updates the Xcode project with the new native modules.

2. **Then in Xcode:**
   - Open `ios/LockerRoomtemp.xcworkspace` (or `.xcodeproj`)
   - Click the **Play button** (▶️) to build and run
   - Or press `Cmd + R`

### Option 2: Using Command Line (Easier, does everything)

```bash
cd /Users/chukwudi/Desktop/LockerRoom
npx expo run:ios
```

This command will:
- Automatically regenerate the native project
- Build the iOS app
- Install it on your device/simulator
- Start Metro bundler

## About Metro

**Metro is just the JavaScript bundler** - it doesn't rebuild native code. It only:
- Bundles your JS/TS code
- Serves it to your app
- Hot reloads JS changes

**Native modules** (like `expo-device`, `expo-camera`) need a **native rebuild** which requires:
- Xcode to compile iOS code
- Linking the native modules
- Installing on device

## After Rebuild

Once rebuilt, the app will have access to:
- ✅ `expo-device` - Device information
- ✅ `expo-application` - Installation ID
- ✅ `expo-camera` - Camera for QR scanning

## Quick Command (Easiest)

Just run this one command - it does everything:

```bash
npx expo run:ios
```

Then Metro will start automatically and your app will launch with the new native modules!

