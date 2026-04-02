// Independent background handler to avoid cycles
export async function handleBackgroundMessage(remoteMessage) {
  console.log('Message handled in the background!', remoteMessage);

  if (remoteMessage.data && remoteMessage.data.type === 'chat_message') {
    // Dynamic import to avoid early initialization loops in headless mode
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
