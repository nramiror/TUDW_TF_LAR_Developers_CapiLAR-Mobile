import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { tabScreenOptions } from '@/theme/navigation';

// App del CLIENTE: servicios para reservar, sus turnos y su perfil.
// Cuando esté el login (PWA-185) acá se valida que haya sesión con rol CLIENTE.
export default function ClienteLayout() {
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
