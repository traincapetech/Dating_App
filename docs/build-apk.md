# Building APK for Android Testing

This guide will help you build an APK file for testing on a real Android device.

## Prerequisites

1. **Android Studio** installed
2. **Java Development Kit (JDK)** - Version 11 or higher
3. **Android SDK** configured
4. **Environment Variables** set:
   - `ANDROID_HOME` pointing to your Android SDK location
   - `JAVA_HOME` pointing to your JDK location

## Step 1: Generate a Keystore (For Release Build)

For testing, you can use a debug keystore. For production, generate a release keystore:

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

## Step 2: Configure Gradle for Release Build

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

Create `android/gradle.properties` and add:

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_STORE_PASSWORD=your-store-password
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

## Step 3: Build Debug APK (For Testing)

For quick testing, build a debug APK:

```bash
cd android
./gradlew assembleDebug
```

The APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Step 4: Build Release APK (For Distribution)

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

## Step 5: Install on Device

### Option 1: Using ADB
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Transfer via USB
1. Connect your Android device via USB
2. Enable "USB Debugging" in Developer Options
3. Copy the APK file to your device
4. Open the APK file on your device and install

### Option 3: Transfer via Email/Cloud
1. Upload the APK to Google Drive, Dropbox, or email it to yourself
2. Download and install on your Android device
3. Make sure "Install from Unknown Sources" is enabled

## Troubleshooting

### Error: "SDK location not found"
Set `ANDROID_HOME` environment variable:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk # Windows
```

### Error: "Java version mismatch"
Make sure you're using JDK 11 or higher:
```bash
java -version
```

### Error: "Gradle build failed"
Clean and rebuild:
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### APK Size Too Large
The debug APK includes debug symbols and is larger. The release APK will be smaller.

## Quick Commands

```bash
# Clean build
cd android && ./gradlew clean

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew assembleRelease

# Install on connected device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Check connected devices
adb devices
```

## Notes

- Debug APKs are signed with a debug certificate and expire after 30 days
- Release APKs require proper signing and can be distributed
- Make sure your device allows installation from unknown sources
- For production, always use release builds with proper signing

