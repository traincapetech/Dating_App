// Independent background handler to avoid cycles
export async function handleBackgroundMessage(remoteMessage) {
  console.log('Message handled in the background!', remoteMessage);
  return Promise.resolve();
}
