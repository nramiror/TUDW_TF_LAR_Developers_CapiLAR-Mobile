import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { colors, fonts, fontSizes, spacing } from '@/theme';

interface TitleProps {
  children: ReactNode;
  // Subtítulo: más chico y en gris
  subtitle?: boolean;
  style?: StyleProp<TextStyle>;
}

export const Title = ({ children, subtitle = false, style }: TitleProps) => (
  <Text accessibilityRole="header" style={[subtitle ? styles.subtitle : styles.title, style]}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.title,
    fontSize: fontSizes.xxl,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.grey,
  },
});
