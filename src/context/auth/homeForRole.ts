import type { Rol } from '@/api/auth';

// Pantalla de inicio de cada rol. El ADMIN no tiene app: la administración se hace en la web
export const homeForRole = (rol: Rol) => {
  if (rol === 'CLIENTE') return '/cliente' as const;
  if (rol === 'PROFESIONAL') return '/profesional' as const;
  return null;
};

export const ADMIN_SIN_APP_MESSAGE = 'La administración de CapiLAR se hace desde la web. Ingresá con una cuenta de cliente o profesional.';
