import notifee from '@notifee/react-native';
import { countdownManager } from './countdownManager';

async function handleCountdown(remoteMessage) {
  const { data, notification: systemNotification } = remoteMessage;
  const title = data?.title || systemNotification?.title || 'Limited Time Offer';
  const originalBody = data?.body || systemNotification?.body || '';
  const expiryTime = data?.expiryTime;
  const notificationId = data?.notifId || remoteMessage.messageId || 'countdown_timer';

  if (!expiryTime) return;

  await countdownManager.startCountdown(notificationId, title, originalBody, expiryTime);
}

// Independent background handler to avoid cycles
export async function handleBackgroundMessage(remoteMessage) {
  console.log('Message handled in the background!', remoteMessage);

  // Handle countdown if expiryTime is present
  if (remoteMessage.data && remoteMessage.data.expiryTime) {
    await handleCountdown(remoteMessage);
    return Promise.resolve();
  }

  // Cancel the auto-generated FCM notification (if any) before showing
  // our rich Notifee notification with Reply button, to avoid duplicates.
  try {
    await notifee.cancelAllNotifications();
  } catch (_) {}

  if (remoteMessage.data && remoteMessage.data.type === 'chat_message') {
    const { displayChatNotification } = await import('../notificationHelper');
    await displayChatNotification(remoteMessage.data);
  } else if (remoteMessage.data && remoteMessage.data.type === 'timer') {
    const { displayTimerNotification } = await import('../notificationHelper');
    await displayTimerNotification(remoteMessage.data);
  } else if (remoteMessage.data && remoteMessage.data.type === 'live') {
    const { showPryvoLiveNotification } = await import('../notificationHelper');
    await showPryvoLiveNotification(remoteMessage.data);
  }

  return Promise.resolve();
}
