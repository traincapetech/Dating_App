import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@pryvo/token';
const REFRESH_KEY = '@pryvo/refresh';

export async function storeTokens({accessToken, refreshToken}) {
  const ops = [];
  if (accessToken) {
    ops.push(AsyncStorage.setItem(TOKEN_KEY, accessToken));
  }
  if (refreshToken) {
    ops.push(AsyncStorage.setItem(REFRESH_KEY, refreshToken));
  }
  await Promise.all(ops);
} 

export function getAccessToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

