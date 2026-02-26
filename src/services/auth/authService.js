import {apiClient} from '../api/client';
import {getAccessToken} from '../storage/tokenStorage';
import {storeTokens, clearTokens} from '../storage/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getAuthHeaders() {
  const token = await getAccessToken();
  return token ? {token} : {};
}

export async function signUp(payload) {
  const data = await apiClient.post('/auth/signup', payload);
  if (data?.tokens) {
    await storeTokens(data.tokens);
  }
  // Store user data for easy access
  if (data?.user) {
    await AsyncStorage.setItem('@pryvo_user', JSON.stringify(data.user));
    await AsyncStorage.setItem('@pryvo_needs_profile_reset', 'true');
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
    await AsyncStorage.setItem('@pryvo_needs_profile_reset', 'true');
  }
  return data;
}

export async function googleSignIn() {
  const {GoogleSignin} = await import(
    '@react-native-google-signin/google-signin'
  );

  GoogleSignin.configure({
    webClientId:
      '327819775040-7u678ovm7tucvrkjp167slqgqbr6829o.apps.googleusercontent.com',
    offlineAccess: false,
  });

  // Check if play services are available
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  // Trigger Google Sign-In
  const response = await GoogleSignin.signIn();
  const idToken = response?.data?.idToken;

  if (!idToken) {
    throw new Error('Failed to get Google ID token');
  }

  // Send token to our backend
  const data = await apiClient.post('/auth/google', {idToken});

  if (data?.tokens) {
    await storeTokens(data.tokens);
  }
  if (data?.user) {
    await AsyncStorage.setItem('@pryvo_user', JSON.stringify(data.user));
    await AsyncStorage.setItem('@pryvo_needs_profile_reset', 'true');
  }

  return data;
}

export async function signOut() {
  await clearTokens();
  await AsyncStorage.removeItem('@pryvo_user');
  await AsyncStorage.removeItem('@pryvo_needs_profile_reset');
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

/**
 * Logout from all devices
 * Invalidates all refresh tokens for the user
 */
export async function logoutFromAllDevices() {
  try {
    const headers = await getAuthHeaders();
    await apiClient.post('/auth/logout-all-devices', {}, headers);
  } catch (error) {
    // Even if API call fails, clear local tokens
    console.error('Error calling logout API:', error);
  }

  // Always clear local tokens
  await clearTokens();
  await AsyncStorage.removeItem('@pryvo_user');

  return {success: true, message: 'Logged out from all devices'};
}
