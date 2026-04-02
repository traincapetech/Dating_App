// CRITICAL: Import ErrorUtils polyfill FIRST before anything else
import './errorutils-polyfill.js';

// IMPORTANT: react-native-gesture-handler must be imported AFTER polyfill
import 'react-native-gesture-handler';
import {enableScreens} from 'react-native-screens';

enableScreens();

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import messaging from '@react-native-firebase/messaging';
import {handleBackgroundMessage} from './src/services/notifications/backgroundHandler';

// Register background handler
messaging().setBackgroundMessageHandler(handleBackgroundMessage);

import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendSmartMessage } from './src/services/chatSendService';
import { updateNotificationWithReply, showFailedReply } from './src/services/notificationHelper';

// Handle direct replies from notification
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction, input } = detail;

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'reply') {
    const replyText = input?.trim();
    if (!replyText) return;

    if (notification?.data) {
      const { chatId, senderId } = notification.data;
      if (!chatId || !senderId) return;

      try {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        const myId = userData ? JSON.parse(userData).id : null;
        if (!myId) return;

        const result = await sendSmartMessage(replyText, chatId, senderId, myId);

        if (result.success) {
          await updateNotificationWithReply(notification, replyText);
        } else if (result.reason !== 'duplicate') {
          await showFailedReply(notification);
        }
      } catch (e) {
        console.error('Notifee background reply processing failed:', e);
      }
    }
  }
  if (type === EventType.ACTION_PRESS && pressAction?.id === 'match_action') {
    // If the user clicks "MATCH NOW", we clear the notification.
    // App navigation is handled by navigation listeners on app wakeup.
    await notifee.cancelNotification(notification.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
