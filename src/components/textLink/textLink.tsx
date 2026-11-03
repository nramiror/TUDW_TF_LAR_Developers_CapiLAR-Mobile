import { StyleSheet, Text } from 'react-native';

import { colors, fonts, fontSizes } from '@/theme';

interface TextLinkProps {
  // Texto gris antes del link (ej. "¿No tenés cuenta?")
  prefix?: string;
  label: string;
  onPress: () => void;
}

// Texto con un link en violeta, como los links del login de la web
export const TextLink = ({ prefix, label, onPress }: TextLinkProps) => (
  <Text style={styles.text}>
    {prefix ? `${prefix} ` : ''}
    <Text style={styles.link} onPress={onPress} accessibilityRole="link" suppressHighlighting>
      {label}
    </Text>
  </Text>
);

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    textAlign: 'center',
  },
  link: {
    fontFamily: fonts.bodySemiBold,
    color: colors.violet,
  },
});
