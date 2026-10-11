import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { loginRequest, meRequest, registerRequest } from '@/api/auth';
import type { AuthResponse, RegisterData, Rol, Usuario } from '@/api/auth';
import { ApiError } from '@/api/client';

import { AuthContext } from './authContext';
import { clearStoredToken, getStoredToken, storeToken } from './tokenStorage';

// Igual que el AuthProvider de la web, pero el token vive en SecureStore.
// Al abrir la app se recupera el token y se piden los datos actualizados con GET /auth/me (auto-login).
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const stored = await getStoredToken();
        if (!stored) return;

        const me = await meRequest(stored);
        if (cancelled) return;
        setToken(stored);
        setUser(me);
      } catch (error) {
        // 401: el token venció (dura 1 día) o la cuenta se dio de baja -> se borra y hay que volver a entrar.
        // Si es un error de red se conserva, para reintentar la próxima vez que se abra la app
        if (error instanceof ApiError && error.status === 401) await clearStoredToken();
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(async ({ accessToken, user: loggedUser }: AuthResponse) => {
    await storeToken(accessToken);
    setToken(accessToken);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const login = useCallback(
    async (email: string, contrasena: string) => startSession(await loginRequest(email, contrasena)),
    [startSession],
  );

  // El registro ya devuelve el token: el usuario queda logueado
  const register = useCallback(async (data: RegisterData) => startSession(await registerRequest(data)), [startSession]);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

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
      updateUser: setUser,
    }),
    [user, token, isCheckingSession, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
