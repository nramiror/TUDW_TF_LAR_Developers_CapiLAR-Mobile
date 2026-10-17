import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { loginRequest, logoutRequest, meRequest, refreshRequest, registerRequest } from '@/api/auth';
import type { AuthResponse, RegisterData, Rol, Usuario } from '@/api/auth';
import { ApiError, SESSION_EXPIRED_MESSAGE, setTokenRefresher } from '@/api/client';

import { AuthContext } from './authContext';
import { clearStoredTokens, getStoredRefreshToken, getStoredToken, storeTokens } from './tokenStorage';

// Igual que el AuthProvider de la web, pero los tokens viven en SecureStore.
// Al abrir la app se recupera el token y se piden los datos actualizados con GET /auth/me (auto-login).
// El access token dura 15 min: cuando un pedido da 401, apiFetch pide uno nuevo acá con el refresh token
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Copias para el refresher, que corre fuera del render
  const tokenRef = useRef<string | null>(null);
  const isLoggedInRef = useRef(false);
  // Refresh en curso: si fallan varios pedidos a la vez, todos esperan el mismo (el back rota el token y usar el viejo cierra la sesión)
  const refreshingRef = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback(async (session: AuthResponse) => {
    await storeTokens(session);
    tokenRef.current = session.accessToken;
    isLoggedInRef.current = true;
    setToken(session.accessToken);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    isLoggedInRef.current = false;
    setToken(null);
    setUser(null);
    await clearStoredTokens();
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const storedRefresh = await getStoredRefreshToken();
    try {
      if (!storedRefresh) throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
      const session = await refreshRequest(storedRefresh);
      await applySession(session);
      return session.accessToken;
    } catch (error) {
      // Sin red se conservan los tokens para reintentar; con 401 la sesión ya no sirve (venció, se usó en otro dispositivo o se dio de baja)
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const wasLoggedIn = isLoggedInRef.current;
      await clearSession();
      // Al layout del rol le alcanza con que no haya usuario para volver a la bienvenida; el aviso explica por qué
      if (wasLoggedIn) Alert.alert('Sesión vencida', SESSION_EXPIRED_MESSAGE);
      return null;
    }
  }, [applySession, clearSession]);

  const renewToken = useCallback(
    async (failedToken: string) => {
      // Otro pedido ya la renovó mientras este esperaba la respuesta: alcanza con reintentar con el token actual
      if (tokenRef.current && tokenRef.current !== failedToken) return tokenRef.current;
      refreshingRef.current ??= refreshSession().finally(() => {
        refreshingRef.current = null;
      });
      return refreshingRef.current;
    },
    [refreshSession],
  );

  useEffect(() => {
    setTokenRefresher(renewToken);
    return () => setTokenRefresher(null);
  }, [renewToken]);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const stored = await getStoredToken();
        if (!stored) return;
        tokenRef.current = stored;

        // Si el access token venció, apiFetch lo renueva con el refresh token y reintenta
        const me = await meRequest(stored);
        if (cancelled || !tokenRef.current) return;
        isLoggedInRef.current = true;
        setToken(tokenRef.current);
        setUser(me);
      } catch {
        // 401: el refresher ya borró la sesión y hay que volver a entrar.
        // Si es un error de red se conservan los tokens, para reintentar la próxima vez que se abra la app
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(
    async (session: AuthResponse) => {
      await applySession(session);
      return session.user;
    },
    [applySession],
  );

  const login = useCallback(
    async (email: string, contrasena: string) => startSession(await loginRequest(email, contrasena)),
    [startSession],
  );

  // El registro ya devuelve los tokens: el usuario queda logueado
  const register = useCallback(async (data: RegisterData) => startSession(await registerRequest(data)), [startSession]);

  const logout = useCallback(async () => {
    const storedRefresh = await getStoredRefreshToken();
    await clearSession();
    // Se avisa al back para que el refresh token deje de servir; sin red igual se cierra en el celu
    if (storedRefresh) logoutRequest(storedRefresh).catch(() => undefined);
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: user !== null,
      isCheckingSession,
      hasRole: (...roles: Rol[]) => user !== null && roles.includes(user.rol),
      login,
      register,
      logout,
      renewToken,
      updateUser: setUser,
    }),
    [user, token, isCheckingSession, login, register, logout, renewToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
