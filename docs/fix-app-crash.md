# Fix: App Crashes on Launch After Installing APK

## Issues Fixed

### 1. **Build Configuration Error**
- Fixed syntax error in `build.gradle` (line 67)
- Changed `minifyEnabled enableProguardInReleaseBuilds = false` to `minifyEnabled enableProguardInReleaseBuilds`

### 2. **JavaScript Bundle Missing**
- Added explicit bundle asset name configuration in `MainApplication.kt`
- Created build script to ensure bundle is included in release builds

### 3. **Error Handling**
- Added error logging in `MainApplication` and `MainActivity`
- Added error boundary in React app

## How to Rebuild the APK

### Option 1: Using the Build Script (Recommended)

```bash
./scripts/build-release-apk.sh
```

This script will:
1. Clean previous builds
2. Bundle JavaScript code
3. Build release APK

### Option 2: Manual Build

```bash
# Step 1: Clean previous builds
cd android
./gradlew clean

# Step 2: Bundle JavaScript (IMPORTANT!)
cd ..
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# Step 3: Build release APK
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Debugging Tips

If the app still crashes, check the logs:

```bash
# Connect your device via USB and run:
adb logcat | grep -i "pryvo\|error\|exception\|fatal"

# Or filter by tag:
adb logcat -s MainApplication MainActivity ReactNativeJS
```

Common issues to check:

1. **Missing JavaScript Bundle**: The bundle file should exist at `android/app/src/main/assets/index.android.bundle`
2. **Firebase Configuration**: Ensure `google-services.json` is in `android/app/`
3. **Permissions**: Check AndroidManifest.xml has required permissions
4. **Native Modules**: Ensure all native modules are properly linked

## Verify Bundle is Included

After building, verify the bundle exists:

```bash
# Check if bundle is in APK
unzip -l android/app/build/outputs/apk/release/app-release.apk | grep "index.android.bundle"
```

If the bundle is missing, the app will crash immediately on launch.

## Next Steps

1. Rebuild using one of the methods above
2. Install the new APK on your device
3. Check logs if it still crashes
4. Share the error logs if you need further assistance

