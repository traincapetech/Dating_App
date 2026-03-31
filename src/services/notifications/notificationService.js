import {Platform, PermissionsAndroid, Alert, NativeModules} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client.js';

const NOTIFICATION_TOKEN_KEY = '@pryvo_notification_token';
const NOTIFICATION_PERMISSION_KEY = '@pryvo_notification_permission';

import messaging from '@react-native-firebase/messaging';

// Hardcoded AuthorizationStatus to avoid accessing messaging.AuthorizationStatus when missing
const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

// Use messaging directly
const getMessaging = () => {
  return messaging();
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
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // If system permission is granted, we consider it efficient for "permission" check
          // We still need to init Firebase later for tokens, but permission itself is YES.
          await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
          return true;
        }
        // If explicitly denied
        return false;
      }
      // For Android < 13, permission is effectively granted at install
      return true;
    }

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
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted;
      }
      return true; // Android < 13 implies granted
    }

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
export async function getFCMToken(forceRefresh = false) {
  try {
    if (!forceRefresh) {
      // Check if we already have a token stored
      const storedToken = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
      if (storedToken) {
        return storedToken;
      }
    }

    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission not granted, skipping token fetch');
      return null;
    }

    // Get FCM token directly from Firebase
    try {
      const token = await getMessaging().getToken();
      if (token) {
        await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
        return token;
      }
    } catch (tokenError) {
      console.warn('Failed to fetch FCM token:', tokenError);
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
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
import notifee, { EventType } from '@notifee/react-native';
import { displayChatNotification, updateNotificationWithReply, displayTimerNotification } from '../notificationHelper.js';
import { sendSmartMessage } from '../chatSendService.js';

// Setup notification handlers
export function setupNotificationHandlers(navigation) {
  // Handle FCM foreground notifications (App is open)
  const unsubscribeForeground = getMessaging().onMessage(
    async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);
      if (remoteMessage.data?.type === 'chat_message') {
        // Only display if user is not actively chatting with them right now
        // Typically you'd check active route, but for safety we draw it
        await displayChatNotification(remoteMessage.data);
      } else if (remoteMessage.data?.type === 'timer') {
        await displayTimerNotification(remoteMessage.data);
      }
    },
  );

  // Handle Notifee Actions (Tap on notification or Reply button) while app is open
  const unsubscribeNotifee = notifee.onForegroundEvent(async ({ type, detail }) => {
    const { notification, pressAction, input } = detail;

    // Handle Quick Reply while app is open
    if (type === EventType.ACTION_PRESS && pressAction?.id === 'reply') {
      const replyText = input?.trim();
      if (!replyText || !notification?.data) return;
      
      const { chatId, senderId } = notification.data;
      const myId = await getUserId();
      
      const result = await sendSmartMessage(replyText, chatId, senderId, myId);
      if (result.success) {
        await updateNotificationWithReply(notification, replyText);
      }
    }

    // Handle standard tap on the whole notification
    if (type === EventType.ACTION_PRESS && pressAction?.id === 'default') {
      if (notification?.data?.type === 'chat_message') {
        navigation?.navigate('Messages'); // Or direct to ChatScreen if you pass params
      }
    }
  });

  // Handle FCM OS-level notification clicks (if not data-only)
  getMessaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification opened app (FCM):', remoteMessage);
    if (remoteMessage.data?.type === 'message' || remoteMessage.data?.type === 'chat_message') {
      navigation?.navigate('Messages');
    } else if (remoteMessage.data?.type === 'match') {
      navigation?.navigate('HomeTabs');
    }
  });

  // Handle initial boot from FCM notification
  getMessaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from notification (FCM Init):', remoteMessage);
        if (remoteMessage.data?.type === 'message' || remoteMessage.data?.type === 'chat_message') {
          navigation?.navigate('Messages');
        } else if (remoteMessage.data?.type === 'match') {
          navigation?.navigate('HomeTabs');
        }
      }
    });

  // Wait, also check Notifee initial boot in case FCM didn't catch the data-only proxy
  notifee.getInitialNotification().then(initialNotification => {
    if (initialNotification) {
      console.log('App opened from notification (Notifee Init):', initialNotification);
      if (initialNotification.notification.data?.type === 'chat_message') {
        setTimeout(() => navigation?.navigate('Messages'), 500); // Small delay to let Nav mount
      }
    }
  });

  return () => {
    unsubscribeForeground();
    unsubscribeNotifee();
  };
}

// Setup token refresh listener
export function setupTokenRefreshListener() {
  const unsubscribe = getMessaging().onTokenRefresh(async token => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
      
      const userId = await getUserId();
      if (userId) {
        console.log('FCM Token refreshed for user:', userId);
        await apiClient.post('/notifications/register', {
          userId,
          token,
          platform: Platform.OS,
        });
      }
    } catch (error) {
      console.warn('Failed to handle token refresh:', error);
    }
  });

  return unsubscribe;
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
      return {success: false, reason: 'permission_denied'};
    }

    // Always try to get a fresh token from Firebase to handle re-installs
    const token = await getFCMToken(true); 

    if (!token) {
      console.warn(
        'Failed to get notification token - notifications may not work',
      );
      return {success: false, reason: 'no_token'};
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
    // Suppress error for UI
    return {success: false, error: error.message};
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
