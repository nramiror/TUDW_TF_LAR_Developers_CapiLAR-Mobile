import { useContext } from 'react';

import { AuthContext } from './authContext';

// Sesión del usuario: datos, token y acciones (login, registro, logout)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth se tiene que usar dentro de <AuthProvider>');
  return context;
};
