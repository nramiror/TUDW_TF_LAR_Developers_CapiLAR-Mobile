import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, gradient, radius, spacing } from '@/theme';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  // Mismos nombres que el Button de la web
  variant?: 'primario' | 'secundario' | 'grey';
  disabled?: boolean;
  // Muestra un spinner y no deja tocar (mientras se espera al back)
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// primario: fondo degradado. secundario: borde degradado y fondo blanco. grey: borde y texto gris
export const Button = ({ children, onPress, variant = 'primario', disabled = false, isLoading = false, style }: ButtonProps) => {
  const isDisabled = disabled || isLoading;
  const textColor = variant === 'primario' ? colors.white : variant === 'grey' ? colors.grey : colors.black;

  const content = isLoading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <Text style={[styles.text, { color: textColor }]}>{children}</Text>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed, isDisabled && styles.disabled, style]}
    >
      {variant === 'grey' ? (
        <View style={[styles.inner, styles.grey]}>{content}</View>
      ) : (
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.gradient}>
          {variant === 'primario' ? (
            <View style={styles.inner}>{content}</View>
          ) : (
            // El borde degradado es el padding de 2 px que deja ver el degradado alrededor
            <View style={[styles.inner, styles.secondaryInner]}>{content}</View>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.sm,
    elevation: 2,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  // flexGrow: si el botón se estira (por ejemplo, junto a otro más alto en una fila), el fondo lo acompaña
  gradient: {
    flexGrow: 1,
    borderRadius: radius.sm,
    padding: 2,
  },
  inner: {
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm - 1,
  },
  secondaryInner: {
    backgroundColor: colors.white,
  },
  grey: {
    borderWidth: 2,
    borderColor: colors.greyLight,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
  },
  text: {
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
  },
});
