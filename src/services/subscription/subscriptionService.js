import apiClient from '../api/client';

/**
 * Get available subscription plans
 */
export const getAvailablePlans = async () => {
  try {
    const response = await apiClient.get('/subscription/plans');
    return response;
  } catch (error) {
    console.error('Get Plans Error:', error?.message || error);
    throw error;
  }
};

/**
 * Get user's subscription status
 */
export const getSubscriptionStatus = async userId => {
  try {
    const response = await apiClient.get(`/subscription/status/${userId}`);
    return response;
  } catch (error) {
    console.error('Get Subscription Status Error:', error?.message || error);
    return {success: false, isPremium: false, subscription: null};
  }
};

/**
 * Create payment order
 */
export const createPaymentOrder = async (userId, planId) => {
  try {
    const response = await apiClient.post('/subscription/payment/order', {
      userId,
      planId,
    });
    return response;
  } catch (error) {
    console.error('Create Payment Order Error:', error?.message || error);
    throw error;
  }
};

/**
 * Verify payment and create subscription
 */
export const verifyPaymentAndCreateSubscription = async (
  userId,
  planId,
  orderId,
  paymentId,
  signature = '',
  gateway = 'stripe',
  currency = 'USD',
  autoRenew = true,
) => {
  try {
    const response = await apiClient.post('/subscription/payment/verify', {
      userId,
      planId,
      orderId,
      paymentId,
      signature,
      gateway,
      currency,
      autoRenew,
    });
    return response;
  } catch (error) {
    console.error('Verify Payment Error:', error?.message || error);
    throw error;
  }
};

/**
 * Create new subscription (for testing - bypasses payment)
 */
export const createSubscription = async (
  userId,
  planId,
  paymentMethod = 'in_app',
  transactionId = null,
  autoRenew = true,
) => {
  try {
    const response = await apiClient.post('/subscription/create', {
      userId,
      planId,
      paymentMethod,
      transactionId,
      autoRenew,
    });
    return response;
  } catch (error) {
    console.error('Create Subscription Error:', error?.message || error);
    throw error;
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (subscriptionId, userId) => {
  try {
    const response = await apiClient.post(
      `/subscription/cancel/${subscriptionId}`,
      {
        userId,
      },
    );
    return response;
  } catch (error) {
    console.error('Cancel Subscription Error:', error?.message || error);
    throw error;
  }
};

/**
 * Get all subscriptions for a user
 */
export const getUserSubscriptions = async userId => {
  try {
    const response = await apiClient.get(`/subscription/user/${userId}`);
    return response;
  } catch (error) {
    console.error('Get User Subscriptions Error:', error?.message || error);
    return {success: false, subscriptions: []};
  }
};

/**
 * Verify premium status
 */
export const verifyPremiumStatus = async userId => {
  try {
    const response = await apiClient.get(`/subscription/verify/${userId}`);
    return response;
  } catch (error) {
    console.error('Verify Premium Status Error:', error?.message || error);
    return {success: false, isPremium: false};
  }
};

/**
 * Enable/disable auto-renewal
 */
export const setAutoRenewal = async (subscriptionId, enabled) => {
  try {
    const response = await apiClient.post(
      `/subscription/auto-renew/${subscriptionId}`,
      {
        enabled,
      },
    );
    return response;
  } catch (error) {
    console.error('Set Auto-Renewal Error:', error?.message || error);
    throw error;
  }
};
