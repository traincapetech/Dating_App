# iOS Firebase Setup Guide

## ✅ What's Already Configured

1. **GoogleService-Info.plist** - ✅ Present in `ios/Pryvo/`
2. **Firebase initialization** - ✅ Added to `AppDelegate.mm`
3. **React Native Firebase packages** - ✅ Installed (`@react-native-firebase/app`, `@react-native-firebase/messaging`)

## 📋 Next Steps

### 1. Install Pods

The React Native Firebase packages will automatically link Firebase pods. Run:

```bash
cd ios
pod install
```

This will install all Firebase dependencies automatically via React Native Firebase.

### 2. Enable Push Notifications in Xcode

**Important:** You must do this in Xcode:

1. Open `ios/Pryvo.xcworkspace` in Xcode (⚠️ NOT `.xcodeproj`, use `.xcworkspace`)
2. Select **Pryvo** project in the navigator (left sidebar)
3. Select the **Pryvo** target (under TARGETS)
4. Go to **Signing & Capabilities** tab
5. Click **+ Capability** button
6. Add **Push Notifications**
7. Add **Background Modes** and check **Remote notifications**

### 3. Verify GoogleService-Info.plist

In Xcode:
1. Check that `GoogleService-Info.plist` is in the project
2. Right-click on it → **Get Info**
3. Ensure it's added to the **Pryvo** target (check the box)

### 4. Build and Test

```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

## 🔍 Current Configuration

### AppDelegate.mm
```objective-c
#import <Firebase.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Initialize Firebase
  [FIRApp configure];
  // ... rest of code
}
```

This is correct for React Native Firebase.

## ✅ Verification Checklist

- [ ] `GoogleService-Info.plist` is in `ios/Pryvo/` directory
- [ ] `AppDelegate.mm` has `#import <Firebase.h>` and `[FIRApp configure]`
- [ ] Ran `pod install` in `ios/` directory
- [ ] Push Notifications capability added in Xcode
- [ ] Background Modes → Remote notifications enabled in Xcode
- [ ] App builds and runs without Firebase errors

## 🚀 Testing Notifications

1. Build and run the app
2. Go to BasicInfoScreen → Notifications step
3. Toggle notifications ON
4. Grant permission when prompted
5. Check console for FCM token (should appear without errors)

## 📝 Notes

- React Native Firebase automatically handles pod linking
- No need to manually add Firebase pods to Podfile
- The `GoogleService-Info.plist` must be properly added to the Xcode project target
- Push Notifications capability is required for FCM to work
