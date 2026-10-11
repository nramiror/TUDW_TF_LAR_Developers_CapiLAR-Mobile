import { Stack } from 'expo-router';

import { colors, fonts } from '@/theme';

// Pantallas sin sesión: login y registro, con flecha para volver a la bienvenida
export default function AuthLayout() {
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
    </Stack>
  );
}
