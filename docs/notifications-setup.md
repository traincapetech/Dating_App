# Push Notifications Setup Guide

## ✅ What's Implemented

### Frontend
1. **Notification Service** (`src/services/notifications/notificationService.js`)
   - Request notification permissions (iOS & Android)
   - Get FCM (Firebase Cloud Messaging) token
   - Register/unregister tokens with backend
   - Handle foreground, background, and quit state notifications
   - Navigation handling for notification taps

2. **BasicInfoScreen Integration**
   - Toggle switch that actually requests permissions
   - Enables/disables notifications with proper error handling
   - Shows success/error alerts

### Backend
1. **Notification Token Model** (`server/src/models/notificationTokenModel.js`)
   - Stores device tokens associated with users
   - Supports multiple platforms (iOS, Android, Web)

2. **Notification Routes** (`server/src/routes/notificationRoutes.js`)
   - `POST /api/notifications/register` - Register device token
   - `POST /api/notifications/unregister` - Remove device token

## ⚠️ Required Setup

### 1. Firebase Configuration

#### For Android:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your project
3. Add Android app:
   - Package name: `com.pryvo` (check your `android/app/build.gradle`)
   - Download `google-services.json`
   - Place it in `android/app/`

#### For iOS:
1. Add iOS app in Firebase Console
2. Download `GoogleService-Info.plist`
3. Place it in `ios/Pryvo/`

### 2. Install Firebase Dependencies

The packages are already installed:
- `@react-native-firebase/app`
- `@react-native-firebase/messaging`

### 3. Android Setup

Add to `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Add to `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

### 4. iOS Setup

1. Install pods:
```bash
cd ios && pod install
```

2. Enable Push Notifications capability in Xcode
3. Add Background Modes → Remote notifications

## 📱 How It Works

1. **User enables notifications:**
   - App requests permission from device
   - Gets FCM token from Firebase
   - Sends token to backend with userId
   - Backend stores token for sending notifications later

2. **Receiving notifications:**
   - **Foreground:** Shows alert dialog
   - **Background:** Notification appears in system tray
   - **Quit state:** Notification appears, opens app when tapped

3. **User disables notifications:**
   - Deletes FCM token locally
   - Notifies backend to remove token
   - User won't receive notifications

## 🔔 Sending Notifications (Backend)

To send notifications, you'll need to use Firebase Admin SDK:

```javascript
// Example: Send notification to user
const admin = require('firebase-admin');
const {getTokensByUserIds} = require('./models/notificationTokenModel');

async function sendNotificationToUser(userId, title, body, data = {}) {
  const tokens = await getTokensByUserIds([userId]);
  
  if (tokens.length === 0) return;
  
  const messages = tokens.map(token => ({
    token: token.deviceToken,
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      type: data.type || 'general',
    },
  }));
  
  await admin.messaging().sendAll(messages);
}
```

## 🧪 Testing

1. **Enable notifications in app:**
   - Go to BasicInfoScreen → Notifications step
   - Toggle switch ON
   - Grant permission when prompted
   - Should see "Notifications Enabled" alert

2. **Check token registration:**
   - Check server logs for token registration
   - Check `data/notificationTokens.json` file

3. **Test notification:**
   - Use Firebase Console → Cloud Messaging
   - Send test notification to your device token

## 📝 Notes

- Notifications work even if user is not logged in (token stored locally)
- Token is automatically registered when user enables notifications
- Backend endpoints are ready for token management
- You'll need to implement the actual notification sending logic when you have matches/messages

