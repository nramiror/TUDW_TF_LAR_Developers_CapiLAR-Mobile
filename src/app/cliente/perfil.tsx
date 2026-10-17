import { router } from 'expo-router';

import { Button } from '@/components/button/button';
import { ProfileView } from '@/components/profileView/profileView';

// Datos del cliente y cerrar sesión (F01), y su historial capilar (F08)
export default function PerfilCliente() {
  return (
    <ProfileView>
      <Button variant="secundario" onPress={() => router.push('/mis-fichas')}>
        Mi historial capilar
      </Button>
    </ProfileView>
  );
}
