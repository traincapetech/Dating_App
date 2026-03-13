// src/services/giftService.js
import apiClient from './api/client';

/**
 * Fetch available gifts catalog
 */
export const fetchGifts = async () => {
  try {
    const res = await apiClient.get('/gifts');
    return res?.gifts || [];
  } catch (err) {
    console.log('❌ fetchGifts error:', err?.message);
    return [];
  }
};

/**
 * Fetch user wallet and inventory
 * @param {string} userId - Current user ID
 */
export const fetchWallet = async userId => {
  if (!userId) return null;
  try {
    const res = await apiClient.get(`/gifts/wallet/${userId}`);
    return res?.wallet || null;
  } catch (err) {
    console.log('❌ fetchWallet error:', err?.message);
    return null;
  }
};

/**
 * Send a gift to another user
 * @param {object} params - Send gift parameters
 */
export const sendGiftApi = async ({matchId, senderId, receiverId, giftId}) => {
  try {
    const res = await apiClient.post('/gifts/send', {
      matchId,
      senderId,
      receiverId,
      giftId,
    });
    return res;
  } catch (err) {
    console.log('❌ sendGiftApi error:', err?.message);
    throw err;
  }
};

/**
 * Convert a received gift back to coins
 * @param {string} userId - Current user ID
 * @param {string} inventoryItemId - ID of the item in inventory
 */
export const convertGiftApi = async (userId, inventoryItemId) => {
  try {
    const res = await apiClient.post('/gifts/convert', {
      userId,
      inventoryItemId,
    });
    return res;
  } catch (err) {
    console.log('❌ convertGiftApi error:', err?.message);
    throw err;
  }
};

/**
 * Create a payment order for wallet top-up
 */
export const createWalletOrderApi = async ({userId, amount, currency}) => {
  try {
    const res = await apiClient.post('/gifts/wallet/topup/create', {
      userId,
      amount,
      currency,
    });
    return res;
  } catch (err) {
    console.log('❌ createWalletOrderApi error:', err?.message);
    throw err;
  }
};

/**
 * Verify wallet top-up payment
 */
export const verifyWalletPaymentApi = async (paymentData) => {
  try {
    const res = await apiClient.post('/gifts/wallet/topup/verify', paymentData);
    return res;
  } catch (err) {
    console.log('❌ verifyWalletPaymentApi error:', err?.message);
    throw err;
  }
};

export default {
  fetchGifts,
  fetchWallet,
  sendGiftApi,
  convertGiftApi,
  createWalletOrderApi,
  verifyWalletPaymentApi,
};
