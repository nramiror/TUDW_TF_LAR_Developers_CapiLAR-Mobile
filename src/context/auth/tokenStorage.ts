import * as SecureStore from 'expo-secure-store';

// El JWT se guarda cifrado en el celular (Keystore de Android), no en texto plano como localStorage en la web
const TOKEN_KEY = 'capilar_token';

export const getStoredToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const storeToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);

export const clearStoredToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
