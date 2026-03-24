import { Platform } from 'react-native';
import notifee, { AndroidStyle } from '@notifee/react-native';

// Retrieve existing messages from the system tray so we don't overwrite them
export async function getExistingMessages(chatId) {
  if (Platform.OS !== 'android') return [];
  try {
    const notifications = await notifee.getDisplayedNotifications();
    const existing = notifications.find(n => n.id === chatId);
    if (existing?.notification?.android?.style?.messages) {
      return existing.notification.android.style.messages;
    }
  } catch(e) {}
  return [];
}

export async function displayChatNotification(data) {
  const { chatId, senderName, messageText, timestamp } = data;
  
  if (Platform.OS !== 'android') return; // Notifee messaging style is Android only

  try {
    const channelId = await notifee.createChannel({
      id: 'messages',
      name: 'Messages',
      vibration: true,
      importance: 4, // 4 = HIGH priority, required for heads-up alerts
    });

    const existingMessages = await getExistingMessages(chatId);
    existingMessages.push({
      text: messageText,
      timestamp: timestamp ? parseInt(timestamp, 10) : Date.now(),
    });

    await notifee.displayNotification({
      id: chatId,     // Pin Notification to this specific chat
      title: senderName,
      body: messageText, 
      data: data,
      android: {
        channelId: channelId, 
        groupSummary: true,
        groupId: 'chat_group', // WhatsApp style grouping
        style: {
          type: AndroidStyle.MESSAGING,
          person: { name: senderName },
          messages: existingMessages,
        },
        actions: [
          {
            title: 'Reply',
            pressAction: { id: 'reply' },
            input: { allowFreeFormInput: true, placeholder: 'Reply...' },
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
    const { chatId, senderName } = notification.data;
    const existingMessages = await getExistingMessages(chatId);
    
    // Append current user's reply
    existingMessages.push({
      text: replyText,
      timestamp: Date.now(),
      person: { name: 'You' } // Supplying 'You' auto-aligns it dynamically in Android UI
    });

    await notifee.displayNotification({
      id: notification.id,
      title: senderName,
      body: `You: ${replyText}`,
      data: notification.data,
      android: {
        channelId: notification.android.channelId,
        style: {
          type: AndroidStyle.MESSAGING,
          person: { name: senderName },
          messages: existingMessages,
        },
        actions: [], // CRITICAL: Strip the reply button so they cannot background-spam
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
