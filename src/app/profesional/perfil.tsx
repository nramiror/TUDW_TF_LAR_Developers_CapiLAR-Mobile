import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button/button';
import { ComingSoon } from '@/components/comingSoon/comingSoon';
import { spacing } from '@/theme';

// Datos del profesional y cerrar sesión (F01)
export default function PerfilProfesional() {
  return (
    <View style={{ flex: 1, padding: spacing.md }}>
      <ComingSoon title="Mi perfil" issue="PWA-185" />
      {/* Provisorio: cuando haya sesión, este botón borra el token (logout) */}
      <Button variant="grey" onPress={() => router.replace('/')}>
        Volver al inicio
      </Button>
    </View>
  );
}
