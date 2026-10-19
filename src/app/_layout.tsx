import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider } from '@/context/auth/authProvider';
import { colors, fontAssets, fonts } from '@/theme';

// El splash (logo sobre blanco) queda visible hasta que cargan las tipografías
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Si fallan las fuentes se sigue igual, con la tipografía del sistema
  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerTintColor: colors.violet,
          headerTitleStyle: { fontFamily: fonts.subtitle, color: colors.black },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="cliente" />
        <Stack.Screen name="profesional" />
        {/* Desde "Mi perfil" de los dos roles, con flecha para volver */}
        <Stack.Screen name="editar-perfil" options={{ headerShown: true, title: 'Editar mis datos' }} />
        <Stack.Screen name="cambiar-contrasena" options={{ headerShown: true, title: 'Cambiar contraseña' }} />
        {/* Desde el catálogo del cliente: profesional, día, horario y confirmación */}
        <Stack.Screen name="reservar/[servicioId]" options={{ headerShown: true, title: 'Reservar turno' }} />
        {/* Desde la agenda del profesional: otro día y horario para un turno */}
        <Stack.Screen name="reprogramar/[turnoId]" options={{ headerShown: true, title: 'Reprogramar turno' }} />
        {/* Desde la agenda del profesional: turno a nombre de un cliente (nace confirmado) */}
        <Stack.Screen name="nuevo-turno" options={{ headerShown: true, title: 'Nuevo turno' }} />
        {/* F08, desde la agenda del profesional: ficha técnica del turno e historial capilar de la clienta */}
        <Stack.Screen name="ficha/[turnoId]" options={{ headerShown: true, title: 'Ficha técnica' }} />
        <Stack.Screen name="historial/[clienteId]" options={{ headerShown: true, title: 'Historial capilar' }} />
        <Stack.Screen name="ficha-detalle/[fichaId]" options={{ headerShown: true, title: 'Ficha técnica' }} />
        {/* F08, desde el perfil del cliente */}
        <Stack.Screen name="mis-fichas" options={{ headerShown: true, title: 'Mi historial capilar' }} />
        {/* F05: el profesional crea la serie desde un turno de la agenda y las gestiona; la clienta las ve desde su perfil */}
        <Stack.Screen name="serie-nueva" options={{ headerShown: true, title: 'Crear serie' }} />
        <Stack.Screen name="series" options={{ headerShown: true, title: 'Mis series de turnos' }} />
        <Stack.Screen name="mis-series" options={{ headerShown: true, title: 'Mis series de turnos' }} />
        <Stack.Screen name="serie-reservar" options={{ headerShown: true, title: 'Elegir otro horario' }} />
      </Stack>
    </AuthProvider>
  );
}
