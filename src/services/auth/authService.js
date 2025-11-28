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

