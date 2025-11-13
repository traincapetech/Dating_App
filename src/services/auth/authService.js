import {apiClient} from '../api/client';
import {storeTokens, clearTokens} from '../storage/tokenStorage';

export async function signUp(payload) {
  const data = await apiClient.post('/auth/signup', payload);
  if (data?.tokens) {
    await storeTokens(data.tokens);
  }
  return data;
}

export async function signIn(payload) {
  const data = await apiClient.post('/auth/login', payload);
  if (data?.tokens) {
    await storeTokens(data.tokens);
  }
  return data;
}

export async function signOut() {
  await clearTokens();
}

