import {apiClient} from '../api/client';
import {storeTokens, clearTokens} from '../storage/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function signUp(payload) {
  const data = await apiClient.post('/auth/signup', payload);
  if (data?.tokens) {
    await storeTokens(data.tokens);
  }
  // Store user data for easy access
  if (data?.user) {
    await AsyncStorage.setItem('@pryvo_user', JSON.stringify(data.user));
  }
  return data;
}

export async function signIn(payload) {
  const data = await apiClient.post('/auth/login', payload);
  if (data?.tokens) {
    await storeTokens(data.tokens);
  }
  // Store user data for easy access
  if (data?.user) {
    await AsyncStorage.setItem('@pryvo_user', JSON.stringify(data.user));
  }
  return data;
}

export async function signOut() {
  await clearTokens();
  await AsyncStorage.removeItem('@pryvo_user');
}

export async function changeEmail(userId, newEmail, password) {
  const data = await apiClient.post('/auth/change-email', {
    userId,
    newEmail,
    password,
  });
  if (data?.user) {
    await AsyncStorage.setItem('@pryvo_user', JSON.stringify(data.user));
  }
  return data;
}

export async function changePassword(userId, currentPassword, newPassword) {
  return await apiClient.post('/auth/change-password', {
    userId,
    currentPassword,
    newPassword,
  });
}

export async function forgotPassword(email) {
  return await apiClient.post('/auth/forgot-password', {
    email,
  });
}

export async function resetPassword(email, code, newPassword) {
  return await apiClient.post('/auth/reset-password', {
    email,
    code,
    newPassword,
  });
}

export async function deleteAccount(userId) {
  return await apiClient.delete(`/auth/user/${userId}`);
}

