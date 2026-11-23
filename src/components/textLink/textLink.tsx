import { StyleSheet, Text } from 'react-native';

import { colors, fonts, fontSizes, useAccent } from '@/theme';

interface TextLinkProps {
  // Texto gris antes del link (ej. "¿No tenés cuenta?")
  prefix?: string;
  label: string;
  onPress: () => void;
}

// Texto con un link en el color del rol (violeta sin sesión y para la clienta, fucsia para la profesional), como la web
export const TextLink = ({ prefix, label, onPress }: TextLinkProps) => {
  const { text } = useAccent();
  return (
    <Text style={styles.text}>
      {prefix ? `${prefix} ` : ''}
      <Text style={[styles.link, { color: text }]} onPress={onPress} accessibilityRole="link" suppressHighlighting>
        {label}
      </Text>
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    textAlign: 'center',
  },
  link: {
    fontFamily: fonts.bodySemiBold,
  },
});
