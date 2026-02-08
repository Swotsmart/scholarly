import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'scholarly_auth_token';
const REFRESH_TOKEN_KEY = 'scholarly_refresh_token';
const USER_DATA_KEY = 'scholarly_user_data';

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getUserData(): Promise<Record<string, unknown> | null> {
  const data = await SecureStore.getItemAsync(USER_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

export async function setUserData(data: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(data));
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_DATA_KEY);
}
