import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ApiStatus } from '@/components/apiStatus/apiStatus';
import { Button } from '@/components/button/button';
import { Loader } from '@/components/loader/loader';
import { Logo } from '@/components/logo/logo';
import { Screen } from '@/components/screen/screen';
import { homeForRole } from '@/context/auth/homeForRole';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';

// Bienvenida. Si hay una sesión guardada, va directo al inicio de su rol (auto-login)
export default function Bienvenida() {
  const { user, isCheckingSession } = useAuth();

  if (isCheckingSession) return <Loader />;

  const home = user ? homeForRole(user.rol) : null;
  if (home) return <Redirect href={home} />;

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

      {/* Solo en desarrollo: chequea que el celu llegue al back (no aparece en el APK) */}
      {__DEV__ && <ApiStatus />}
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
