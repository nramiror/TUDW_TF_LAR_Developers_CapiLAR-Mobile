import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiStatus } from '@/components/apiStatus/apiStatus';
import { Button } from '@/components/button/button';
import { Logo } from '@/components/logo/logo';
import { Screen } from '@/components/screen/screen';
import { colors, fonts, fontSizes, spacing } from '@/theme';

// Pantalla de bienvenida. Cuando esté el login (PWA-185), si hay sesión guardada se redirige
// directo al panel según el rol y esta pantalla solo la ve quien no inició sesión.
export default function Bienvenida() {
  return (
    <Screen style={styles.container}>
      <View style={styles.hero}>
        <Logo width={240} />
        <Text style={styles.tagline}>Gestión de turnos, fichas técnicas y stock para tu salón</Text>
      </View>

      <View style={styles.actions}>
        <Button onPress={() => router.push('/login')}>Iniciar sesión</Button>
        <Button variant="secundario" onPress={() => router.push('/registro')}>
          Crear cuenta
        </Button>
      </View>

      <ApiStatus />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.grey,
    textAlign: 'center',
    maxWidth: 280,
  },
  actions: {
    gap: spacing.sm,
  },
});
