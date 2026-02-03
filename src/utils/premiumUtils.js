import AsyncStorage from '@react-native-async-storage/async-storage';
import {getSubscriptionStatus} from '../services/subscription/subscriptionService';

/**
 * Check if user has active premium subscription
 */
export async function isUserPremium() {
  try {
    const userData = await AsyncStorage.getItem('@pryvo_user');
    if (userData && userData !== 'undefined') {
      try {
        const user = JSON.parse(userData);
        const userId = user.id;

        // Check subscription status from backend
        const response = await getSubscriptionStatus(userId);
        return response?.isPremium || false;
      } catch (e) {
        console.error('Failed to parse user data:', e);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

/**
 * Check if user has access to a specific premium feature
 */
export async function hasPremiumFeature(featureName) {
  const isPremium = await isUserPremium();
  if (!isPremium) return false;

  // Get subscription details to check specific features
  try {
    const userData = await AsyncStorage.getItem('@pryvo_user');
    let user = null;
    if (userData && userData !== 'undefined') {
      try {
        user = JSON.parse(userData);
      } catch (e) {
        console.error('Failed to parse user data:', e); // Original error message
        return false; // Original return type
      }
    } else {
      return false; // Original return type
    }

    if (!user) {
      // If user is still null after checks
      return false;
    }

    const response = await getSubscriptionStatus(user.id);

    if (response?.subscription?.features) {
      return response.subscription.features.includes(featureName);
    }

    // If no specific features listed, assume all premium features are available
    return isPremium;
  } catch (error) {
    console.error('Error checking premium feature:', error);
    return false;
  }
}

/**
 * Premium feature names
 */
export const PREMIUM_FEATURES = {
  UNLIMITED_LIKES: 'unlimited_likes',
  SEE_WHO_LIKED_YOU: 'see_who_liked_you',
  ADVANCED_FILTERS: 'advanced_filters',
  PRIORITY_MATCHING: 'priority_matching',
  BOOST_PROFILE: 'boost_profile',
  UNDO_SWIPE: 'undo_swipe',
};
