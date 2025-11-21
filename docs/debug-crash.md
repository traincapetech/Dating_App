# Debug App Crash - Quick Guide

## Get Crash Logs from Device

### Method 1: Using ADB (Recommended)
```bash
# Connect device via USB, enable USB debugging, then:
adb logcat -d | grep -i "pryvo\|error\|exception\|fatal\|androidruntime" > crash_log.txt
```

### Method 2: Using Android Studio
1. Open Android Studio
2. View → Tool Windows → Logcat
3. Filter by package: `com.pryvo`
4. Look for red error messages

### Method 3: From Device Settings
1. Settings → Apps → Pryvo → App info
2. Check "App details" or crash reports

## Common Crash Causes & Fixes

### 1. Missing JavaScript Bundle
**Symptom**: App crashes immediately on launch
**Fix**: Ensure bundle is included:
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
```

### 2. Network Image Loading Failure
**Symptom**: Crash when SplashScreen loads
**Fix**: Already added error handling, but verify internet permission in AndroidManifest.xml

### 3. Missing Native Module
**Symptom**: "Module not found" or "Cannot read property"
**Fix**: Check if all native modules are properly linked:
```bash
cd android && ./gradlew clean
```

### 4. Reanimated/Gesture Handler Not Initialized
**Symptom**: Crash related to animations
**Fix**: Already imported at top of index.js - verify order is correct

### 5. Firebase Initialization
**Symptom**: Crash related to Firebase
**Fix**: Verify google-services.json exists in android/app/

## Quick Test Build

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
cd android
./gradlew assembleRelease
```

## Share Crash Logs

If app still crashes, share the logcat output for analysis.

