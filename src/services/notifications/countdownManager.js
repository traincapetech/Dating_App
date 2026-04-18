import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatRemainingTime } from '../notificationHelper';

const STORAGE_KEY = '@pryvo_active_countdowns';
const activeIntervals = new Map();

/**
 * Manages countdown timers for notifications.
 * Handles persistence, app restarts, and efficient updates.
 */
class CountdownManager {
  /**
   * Starts or restarts a countdown for a notification
   */
  async startCountdown(id, title, originalBody, expiryTime) {
    if (!id || !expiryTime) return;

    // 1. Clear any existing interval for this notification
    this.stopTimer(id);

    // 2. Persist the countdown data
    await this.saveTimerData(id, { title, originalBody, expiryTime });

    // 3. Start the timer loop
    this.runTimerLoop(id, title, originalBody, expiryTime);
  }

  /**
   * Internal loop runner
   */
  runTimerLoop(id, title, originalBody, expiryTime) {
    const update = async () => {
      const timeText = formatRemainingTime(expiryTime);
      const diff = new Date(expiryTime).getTime() - Date.now();

      // Handle Expiry
      if (!timeText || diff <= 0) {
        this.stopTimer(id);
        await this.removeTimerData(id);
        
        await notifee.displayNotification({
          id,
          title,
          body: '⏰ Offer expired',
          android: {
            channelId: 'timer_priority',
            smallIcon: 'ic_launcher',
          },
        });
        return;
      }

      // Update Notification
      await notifee.displayNotification({
        id,
        title,
        body: `${originalBody}\n⏳ ${timeText}`,
        android: {
          channelId: 'timer_priority',
          smallIcon: 'ic_launcher',
          color: '#E0AAFF',
          pressAction: { id: 'default' },
          onlyAlertOnce: true,
        },
      });

      // Switch interval speed if close to expiry (< 1 minute)
      const currentInterval = activeIntervals.get(id)?.intervalMs;
      const neededInterval = diff < 60000 ? 1000 : 60000;

      if (currentInterval !== neededInterval) {
        this.stopTimer(id);
        const newIntervalId = setInterval(update, neededInterval);
        activeIntervals.set(id, { intervalId: newIntervalId, intervalMs: neededInterval });
      }
    };

    // Initial update
    update();

    // Start initial interval (60s default or 1s if already close)
    const diff = new Date(expiryTime).getTime() - Date.now();
    const intervalMs = diff < 60000 ? 1000 : 60000;
    const intervalId = setInterval(update, intervalMs);
    
    activeIntervals.set(id, { intervalId, intervalMs });
  }

  /**
   * Stops a specific timer
   */
  stopTimer(id) {
    if (activeIntervals.has(id)) {
      clearInterval(activeIntervals.get(id).intervalId);
      activeIntervals.delete(id);
    }
  }

  /**
   * Resumes all persisted timers (call on app start)
   */
  async resumeTimers() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return;

      const timers = JSON.parse(data);
      const now = Date.now();

      for (const [id, config] of Object.entries(timers)) {
        if (new Date(config.expiryTime).getTime() > now) {
          this.runTimerLoop(id, config.title, config.originalBody, config.expiryTime);
        } else {
          // Clean up expired ones from storage
          await this.removeTimerData(id);
        }
      }
    } catch (e) {
      console.error('[CountdownManager] Failed to resume timers:', e);
    }
  }

  /**
   * Persistence Helpers
   */
  async saveTimerData(id, config) {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const timers = data ? JSON.parse(data) : {};
      timers[id] = config;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    } catch (e) {}
  }

  async removeTimerData(id) {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return;
      const timers = JSON.parse(data);
      delete timers[id];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    } catch (e) {}
  }

  /**
   * Hook into Notifee events to clean up timers when user clears notification
   */
  setupEventHandlers() {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.DISMISSED) {
        this.stopTimer(detail.notification.id);
        await this.removeTimerData(detail.notification.id);
      }
    });

    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.DISMISSED) {
        this.stopTimer(detail.notification.id);
        this.removeTimerData(detail.notification.id);
      }
    });
  }
}

export const countdownManager = new CountdownManager();
