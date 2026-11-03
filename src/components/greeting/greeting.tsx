import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';

// Saludo con el nombre del usuario logueado, arriba de la pantalla de inicio de cada rol
export const Greeting = ({ subtitle }: { subtitle: string }) => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.hello}>¡Hola, {user?.nombre}!</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  hello: {
    fontFamily: fonts.title,
    fontSize: fontSizes.xxl,
    color: colors.black,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.grey,
  },
});
