import { Platform } from 'react-native';
import notifee, { AndroidStyle, AndroidImportance, AndroidVisibility } from '@notifee/react-native';

// Retrieve existing messages from the system tray so we don't overwrite them
export async function getExistingMessages(chatId) {
  if (Platform.OS !== 'android') return [];
  try {
    const notifications = await notifee.getDisplayedNotifications();
    const existing = notifications.find(n => n.id === chatId);
    if (existing?.notification?.android?.style?.messages) {
      // Filter out any invalid messages
      return existing.notification.android.style.messages.filter(m => m.text);
    }
  } catch(e) {}
  return [];
}

export async function displayChatNotification(data) {
  const { chatId, senderName, senderPhoto, messageText, timestamp } = data;
  
  if (Platform.OS !== 'android') return;

  try {
    const channelId = await notifee.createChannel({
      id: 'messages_priority',
      name: 'Direct Messages',
      vibration: true,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PRIVATE,
    });

    const existingMessages = await getExistingMessages(chatId);
    
    // Add the new incoming message with person attribution
    existingMessages.push({
      text: messageText,
      timestamp: timestamp ? parseInt(timestamp, 10) : Date.now(),
      person: { 
        name: senderName,
        icon: senderPhoto || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', // Fallback avatar
      },
    });

    // Cap history to last 10 messages for performance and UX
    const history = existingMessages.slice(-10);

    await notifee.displayNotification({
      id: chatId, 
      title: senderName,
      body: messageText, 
      data: data,
      android: {
        channelId: channelId, 
        groupSummary: true,
        groupId: 'chat_group',
        largeIcon: senderPhoto || 'ic_launcher',
        circularLargeIcon: true,
        color: '#4C2882',
        pressAction: { id: 'default' }, // Opens app on click
        style: {
          type: AndroidStyle.MESSAGING,
          person: { 
            name: senderName,
            icon: senderPhoto,
          },
          messages: history,
        },
        actions: [
          {
            title: 'Reply',
            pressAction: { id: 'reply' },
            input: { 
              allowFreeFormInput: true, 
              placeholder: `Reply to ${senderName}...` 
            },
          },
        ],
      },
    });
  } catch(e) {
    console.error('Failed to display Chat Notification:', e);
  }
}

// Fired EXACTLY when REST returns 200 OK
export async function updateNotificationWithReply(notification, replyText) {
  if (Platform.OS !== 'android') return;

  try {
    const { chatId, senderName, senderPhoto } = notification.data;
    const existingMessages = await getExistingMessages(chatId);
    
    // Append current user's reply with 'person' as 'You' for correct alignment
    existingMessages.push({
      text: replyText,
      timestamp: Date.now(),
      person: { name: 'You' }
    });

    const history = existingMessages.slice(-10);

    await notifee.displayNotification({
      id: notification.id,
      title: senderName,
      body: `Me: ${replyText}`,
      data: notification.data,
      android: {
        channelId: notification.android.channelId,
        largeIcon: senderPhoto || 'ic_launcher',
        circularLargeIcon: true,
        color: '#4C2882',
        pressAction: { id: 'default' },
        style: {
          type: AndroidStyle.MESSAGING,
          person: { 
            name: senderName,
            icon: senderPhoto 
          },
          messages: history,
        },
        actions: [
          {
            title: 'Reply',
            pressAction: { id: 'reply' },
            input: { 
              allowFreeFormInput: true, 
              placeholder: `Send another to ${senderName}...` 
            },
          },
        ],
      },
    });
  } catch(e) {
    console.error('Failed to update notification with reply:', e);
  }
}

// Fired on AbortController trigger or 5xx API failure
export async function showFailedReply(notification) {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.displayNotification({
      id: notification.id,
      title: notification.data.senderName,
      body: 'Failed to send reply. Saved to queue.',
      data: notification.data,
      android: {
        channelId: notification.android.channelId,
        color: '#FF0000', // Paint UI red to signify delivery failure
      },
    });
  } catch(e) {}
}

export async function displayTimerNotification(data) {
  const { title, body, endTime, actionText } = data;
  
  if (Platform.OS !== 'android') return;

  try {
    const channelId = await notifee.createChannel({
      id: 'timer_priority',
      name: 'Promotions & Timers',
      vibration: true,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
    });

    const targetTime = endTime ? parseInt(endTime, 10) : Date.now() + 3600000;

    await notifee.displayNotification({
      id: 'timer_notif', // Unique ID for the timer so it updates instead of duplicates
      title: title || 'Limited Time Offer',
      body: body || 'Act fast before time runs out!',
      data: data,
      android: {
        channelId: channelId,
        color: '#E0AAFF',
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
        pressAction: { id: 'default' },
        showChronometer: true,
        chronometerCountDown: true,
        timestamp: targetTime,
        actions: actionText ? [
          {
            title: actionText,
            pressAction: { id: 'default' },
          },
        ] : [],
      },
    });
  } catch(e) {
    console.error('Failed to display Timer Notification:', e);
  }
}
export async function showPryvoLiveNotification(payload) {
  if (Platform.OS !== 'android') return;

  try {
    const duration = payload.durationMinutes ? parseInt(payload.durationMinutes, 10) : 15;
    const countdownTarget = Date.now() + (duration * 60000);

    const title = payload.title || 'Peak time starts for you';
    const body = payload.body || 'Open the app now to get the best results.';

    // Notifee does not support direct custom RemoteViews injection (XML via id) natively for free.
    // Instead we use our custom Android Native Module to deliver the Schmooze-style timer layout.
    const { NativeModules } = require('react-native');
    if (NativeModules.PryvoNotification) {
      NativeModules.PryvoNotification.showLiveNotification(title, body, countdownTarget);
    } else {
      console.warn('PryvoNotification native module not found, falling back to basic notification');
      // Fallback
      const channelId = await notifee.createChannel({
        id: 'live_priority_v3', // New channel to clear old cache
        name: 'Pryvo Live Offers',
        vibration: true,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
      });

      await notifee.displayNotification({
        id: 'live_countdown_' + (payload.id || 'default'),
        title: title,
        body: body,
        android: {
          channelId: channelId,
          smallIcon: 'ic_launcher_round',
          color: '#6082B6',
          pressAction: { id: 'default' },
        },
      });
    }
  } catch (e) {
    console.error('Failed to display Live Pryvo Notification V3:', e);
  }
}
