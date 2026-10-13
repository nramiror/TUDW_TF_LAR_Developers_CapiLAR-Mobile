import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { Loader } from '@/components/loader/loader';
import { useAuth } from '@/context/auth/useAuth';
import { tabScreenOptions } from '@/theme/navigation';

// App del PROFESIONAL: agenda (con las solicitudes pendientes), días y horarios de trabajo y perfil. Más adelante: fichas técnicas con fotos (F08/F09)
// y escaneo de QR para el stock (F11). La administración (usuarios, servicios) queda en la web.
// Solo entra un usuario logueado con rol PROFESIONAL; si no hay sesión (o se cerró), vuelve a la bienvenida
export default function ProfesionalLayout() {
  const { user, isCheckingSession } = useAuth();
  if (isCheckingSession) return <Loader />;
  if (user?.rol !== 'PROFESIONAL') return <Redirect href="/" />;

  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="horarios"
        options={{
          title: 'Mis horarios',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
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
