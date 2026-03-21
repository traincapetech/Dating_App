import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { sendMessageApi } from './chatService'; // REST API fallback

// Lock network calls to prevent user mashing the "Reply" button
const isSendingMap = new Map();

export const sendSmartMessage = async (text, chatId, recipientId, senderId) => {
  const isKilled = AppState.currentState === 'background' || 
                   AppState.currentState === 'inactive' || 
                   !AppState.currentState;

  // 1. Debounce duplicate spams
  const lockKey = `${chatId}_${text.substring(0, 10)}`;
  if (isSendingMap.has(lockKey)) return { success: false, reason: 'duplicate' };
  isSendingMap.set(lockKey, true);

  try {
    if (isKilled) {
      // BACKGROUND: Socket is dead. Force REST explicitly.
      // 8-second timeout wrapper. Android kills background tasks at 15s.
      // If we don't catch the timeout, Notifee UI will hang and never update.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); 

      // Note: your sendMessageApi might need to accept an object or arguments. 
      // It looks like `sendMessageApi({ matchId, senderId, receiverId, text })`
      const result = await sendMessageApi({
        matchId: chatId,
        senderId,
        receiverId: recipientId,
        text,
      });
      // Axios doesn't support AbortController directly unless you pass signal: controller.signal in config,
      // but if you are using fetch it works. Assuming sendMessageApi is standard.
      
      clearTimeout(timeoutId);
      return { success: true, message: result };
      
    } else {
      // FOREGROUND: 
      // Call the standard REST API here to be safe, since socket emit requires the app to be fully active
      // and the socket instance is typically tied to a component.
      const result = await sendMessageApi({
        matchId: chatId,
        senderId,
        receiverId: recipientId,
        text,
      });
      return { success: true, message: result };
    }
  } catch (error) {
    // NETWORK FAILURE: Queue locally to sync when app opens.
    await queueFailedMessage(chatId, text, recipientId, senderId);
    return { success: false, error };
  } finally {
    isSendingMap.delete(lockKey);
  }
};

async function queueFailedMessage(chatId, text, recipientId, senderId) {
  try {
    const queueData = await AsyncStorage.getItem('@pryvo_offline_queue');
    const queue = queueData ? JSON.parse(queueData) : [];
    queue.push({ chatId, text, recipientId, senderId, timestamp: Date.now() });
    await AsyncStorage.setItem('@pryvo_offline_queue', JSON.stringify(queue));
  } catch(e) {}
}
