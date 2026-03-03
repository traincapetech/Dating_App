import {useState, useEffect, useCallback} from 'react';
import streakService from '../services/streakService';

/**
 * Custom hook to manage streak data for a pair or a user
 * @param {string} userId - Current user ID
 * @param {string} partnerId - Optional partner ID to fetch specific streak
 */
export const useStreak = (userId, partnerId = null) => {
  const [streak, setStreak] = useState(null);
  const [userStreaks, setUserStreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (partnerId) {
        const data = await streakService.getStreakForPair(userId, partnerId);
        setStreak(data);
      } else {
        const data = await streakService.fetchUserStreaks(userId);
        setUserStreaks(data);
      }
    } catch (err) {
      console.warn('useStreak error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId, partnerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh function for pull-to-refresh or explicit refresh
  const refresh = () => loadData();

  return {
    streak,
    userStreaks,
    loading,
    error,
    refresh,
  };
};

export default useStreak;
