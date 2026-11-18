import { router } from 'expo-router';

import { ProfileView } from '@/components/profileView/profileView';

// Datos del cliente y cerrar sesión (F01), sus series de turnos (F05) y su historial capilar (F08)
export default function PerfilCliente() {
  return (
    <ProfileView
      actions={[
        { label: 'Mis series de turnos', icon: 'repeat-outline', onPress: () => router.push('/mis-series') },
        { label: 'Mi historial capilar', icon: 'document-text-outline', onPress: () => router.push('/mis-fichas') },
      ]}
    />
  );
}
