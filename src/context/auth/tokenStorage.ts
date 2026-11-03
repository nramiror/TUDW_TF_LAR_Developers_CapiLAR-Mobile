import * as SecureStore from 'expo-secure-store';

// Los tokens se guardan cifrados en el celular (Keystore de Android), no en texto plano como localStorage en la web.
// El access token dura 15 min; el refresh token (7 días) sirve para pedir uno nuevo sin volver a loguearse
const TOKEN_KEY = 'capilar_token';
const REFRESH_TOKEN_KEY = 'capilar_refresh_token';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const getStoredToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const getStoredRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const storeTokens = async ({ accessToken, refreshToken }: StoredTokens) => {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearStoredTokens = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};
