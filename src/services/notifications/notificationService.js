import {Platform, PermissionsAndroid, Alert, NativeModules} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client.js';

const NOTIFICATION_TOKEN_KEY = '@pryvo_notification_token';
const NOTIFICATION_PERMISSION_KEY = '@pryvo_notification_permission';

// Helper to check if Firebase native module is available
const isFirebaseAvailable = () => {
  try {
    if (Platform.OS === 'web') return false;
    // Check if the native module is actually linked and has expected properties
    const module = NativeModules.RNFBAppModule;
    return !!(
      module &&
      (module.registerContext || module.initializeFirebaseApp)
    );
  } catch (error) {
    return false;
  }
};

// Hardcoded AuthorizationStatus to avoid accessing messaging.AuthorizationStatus when missing
const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

// Safe wrapper for messaging()
const getMessaging = () => {
  if (!isFirebaseAvailable()) {
    // Return a mock object to prevent crashes
    return {
      isMock: true,
      requestPermission: async () => AuthorizationStatus.NOT_DETERMINED,
      hasPermission: async () => AuthorizationStatus.NOT_DETERMINED,
      getToken: async () => null,
      deleteToken: async () => {},
      onMessage: () => () => {},
      onNotificationOpenedApp: () => {},
      getInitialNotification: async () => null,
      subscribeToTopic: async () => {},
      unsubscribeFromTopic: async () => {},
      AuthorizationStatus, // Include status enum in mock
    };
  }
  // Lazy require to prevent fatal error upon top-level import
  return require('@react-native-firebase/messaging').default();
};

// Request notification permissions
export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'android') {
      // Android 13+ requires runtime permission
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }
    }

    if (!isFirebaseAvailable()) return false;

    const authStatus = await getMessaging().requestPermission();
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    await AsyncStorage.setItem(
      NOTIFICATION_PERMISSION_KEY,
      enabled ? 'granted' : 'denied',
    );

    return enabled;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Check if notification permission is granted
export async function checkNotificationPermission() {
  try {
    if (!isFirebaseAvailable()) return false;

    const authStatus = await getMessaging().hasPermission();
    return (
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}

// Get FCM token
export async function getFCMToken() {
  try {
    // Check if we already have a token stored
    const storedToken = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    // Get FCM token
    const token = await getMessaging().getToken();

    if (token) {
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    throw error;
  }
}

// Delete FCM token (when user disables notifications)
export async function deleteFCMToken() {
  try {
    await getMessaging().deleteToken();
    await AsyncStorage.removeItem(NOTIFICATION_TOKEN_KEY);
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'denied');
    return true;
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return false;
  }
}

// Setup notification handlers
export function setupNotificationHandlers(navigation) {
  // Handle foreground notifications
  const unsubscribeForeground = getMessaging().onMessage(
    async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);

      // You can show a local notification or update UI here
      Alert.alert(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || '',
        [
          {
            text: 'View',
            onPress: () => {
              // Navigate to relevant screen based on notification data
              if (remoteMessage.data?.type === 'message') {
                navigation?.navigate('Messages');
              } else if (remoteMessage.data?.type === 'match') {
                navigation?.navigate('HomeTabs');
              }
            },
          },
          {text: 'OK'},
        ],
      );
    },
  );

  // Handle background/quit state notifications
  getMessaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification opened app:', remoteMessage);

    // Navigate to relevant screen
    if (remoteMessage.data?.type === 'message') {
      navigation?.navigate('Messages');
    } else if (remoteMessage.data?.type === 'match') {
      navigation?.navigate('HomeTabs');
    }
  });

  // Check if app was opened from a quit state via notification
  getMessaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from notification:', remoteMessage);
        // Handle navigation
        if (remoteMessage.data?.type === 'message') {
          navigation?.navigate('Messages');
        } else if (remoteMessage.data?.type === 'match') {
          navigation?.navigate('HomeTabs');
        }
      }
    });

  return unsubscribeForeground;
}

// Get userId from storage (if available)
async function getUserId() {
  try {
    const userData = await AsyncStorage.getItem('@pryvo_user');
    if (userData && userData !== 'undefined') {
      const user = JSON.parse(userData);
      return user.id;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Enable notifications (request permission and get token)
export async function enableNotifications(userId = null) {
  try {
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      throw new Error(
        'Notification permission denied. Please enable in device settings.',
      );
    }

    const token = await getFCMToken();

    if (!token) {
      throw new Error('Failed to get notification token');
    }

    // Get userId if not provided
    const finalUserId = userId || (await getUserId());

    // Send token to backend to associate with user
    if (finalUserId) {
      try {
        await apiClient.post('/notifications/register', {
          userId: finalUserId,
          token,
          platform: Platform.OS,
        });
      } catch (error) {
        console.warn('Failed to register token with backend:', error);
        // Don't throw - token is still valid locally
      }
    }

    return {success: true, token};
  } catch (error) {
    console.error('Error enabling notifications:', error);
    throw error;
  }
}

// Disable notifications (delete token)
export async function disableNotifications(userId = null) {
  try {
    await deleteFCMToken();

    // Get userId if not provided
    const finalUserId = userId || (await getUserId());

    // Notify backend to remove token
    if (finalUserId) {
      try {
        await apiClient.post('/notifications/unregister', {
          userId: finalUserId,
        });
      } catch (error) {
        console.warn('Failed to unregister token with backend:', error);
        // Don't throw - token is still deleted locally
      }
    }

    return {success: true};
  } catch (error) {
    console.error('Error disabling notifications:', error);
    throw error;
  }
}
