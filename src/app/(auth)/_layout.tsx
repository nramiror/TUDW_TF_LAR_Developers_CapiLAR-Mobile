import { Redirect, Stack } from 'expo-router';

import { homeForRole } from '@/context/auth/homeForRole';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts } from '@/theme';

// Pantallas sin sesión: login, registro y recuperar contraseña, con flecha para volver.
// Si ya hay sesión (por ejemplo, recién se registró) se va al inicio de su rol
export default function AuthLayout() {
  const { user } = useAuth();
  const home = user ? homeForRole(user.rol) : null;
  if (home) return <Redirect href={home} />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.violet,
        headerTitleStyle: { fontFamily: fonts.subtitle, color: colors.black },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
      <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
      <Stack.Screen name="recuperar" options={{ title: 'Recuperar contraseña' }} />
    </Stack>
  );
}
