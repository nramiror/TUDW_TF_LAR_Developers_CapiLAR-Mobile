import { createContext } from 'react';

import type { RegisterData, Rol, Usuario } from '@/api/auth';

export interface AuthContextValue {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  // Al abrir la app, mientras se valida el token guardado con GET /auth/me
  isCheckingSession: boolean;
  hasRole: (...roles: Rol[]) => boolean;
  login: (email: string, contrasena: string) => Promise<Usuario>;
  register: (data: RegisterData) => Promise<Usuario>;
  logout: () => Promise<void>;
  // Para lo que no pasa por apiFetch (imágenes con token): pide un access token nuevo si el que falló venció
  renewToken: (failedToken: string) => Promise<string | null>;
  updateUser: (user: Usuario) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
