import { StyleSheet, Text, View } from 'react-native';

import { Title } from '@/components/title/title';
import { colors, fonts, fontSizes, spacing } from '@/theme';

interface ComingSoonProps {
  // Nombre de la sección que todavía no existe (ej. "Mis turnos")
  title: string;
  // Issue de Linear donde se va a hacer (ej. "PWA-186")
  issue?: string;
}

// Pantalla provisoria para las secciones que todavía no están hechas (igual que en la web)
export const ComingSoon = ({ title, issue }: ComingSoonProps) => (
  <View style={styles.container}>
    <Title>{title}</Title>
    <Text style={styles.soon}>Próximamente</Text>
    <Text style={styles.text}>Estamos trabajando en esta sección.</Text>
    {issue && <Text style={styles.issue}>{issue}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  soon: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.lg,
    color: colors.violet,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.grey,
    textAlign: 'center',
  },
  issue: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.greyLight,
  },
});
