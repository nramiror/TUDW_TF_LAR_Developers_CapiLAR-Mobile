import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { Loader } from '@/components/loader/loader';
import { useAuth } from '@/context/auth/useAuth';
import { tabScreenOptions } from '@/theme/navigation';

// App del CLIENTE: servicios para reservar, sus turnos y su perfil.
// Solo entra un usuario logueado con rol CLIENTE; si no hay sesión (o se cerró), vuelve a la bienvenida
export default function ClienteLayout() {
  const { user, isCheckingSession } = useAuth();
  if (isCheckingSession) return <Loader />;
  if (user?.rol !== 'CLIENTE') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Reservar',
          tabBarIcon: ({ color, size }) => <Ionicons name="cut-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="turnos"
        options={{
          title: 'Mis turnos',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Mi perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
