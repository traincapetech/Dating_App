// Independent background handler to avoid cycles
export async function handleBackgroundMessage(remoteMessage) {
  console.log('Message handled in the background!', remoteMessage);

  if (remoteMessage.data && remoteMessage.data.type === 'chat_message') {
    // Dynamic import to avoid early initialization loops in headless mode
    const { displayChatNotification } = await import('../notificationHelper');
    await displayChatNotification(remoteMessage.data);
  }

  return Promise.resolve();
}
