import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { tabScreenOptions } from '@/theme/navigation';

// App del PROFESIONAL: agenda del día y perfil. Más adelante: fichas técnicas con fotos (F08/F09)
// y escaneo de QR para el stock (F11). La administración (usuarios, servicios) queda en la web.
// Cuando esté el login (PWA-185) acá se valida que haya sesión con rol PROFESIONAL.
export default function ProfesionalLayout() {
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
        name="perfil"
        options={{
          title: 'Mi perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
