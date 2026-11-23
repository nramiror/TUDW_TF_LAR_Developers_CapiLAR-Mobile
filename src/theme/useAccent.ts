import { useAuth } from '@/context/auth/useAuth';

import { accents } from './colors';
import type { Accent } from './colors';

// Acento del usuario logueado, para los componentes que usan los dos roles (botones, pastillas, links...).
// Sin sesión (bienvenida, login, registro) es el violeta de marca. Las pantallas solo del profesional usan el fucsia directo
export const useAccent = (): Accent => {
  const { user } = useAuth();
  return user?.rol === 'PROFESIONAL' ? accents.profesional : accents.cliente;
};
