import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, gradient, radius, spacing, useAccent } from '@/theme';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  // Mismos nombres que el Button de la web
  variant?: 'primario' | 'secundario' | 'grey';
  // sm: acciones dentro de una tarjeta (ej. "Cancelar turno")
  size?: 'md' | 'sm';
  disabled?: boolean;
  // Muestra un spinner y no deja tocar (mientras se espera al back)
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BORDE = 1.5;

// primario: fondo degradado. secundario: borde degradado y fondo blanco. grey: borde y texto gris.
// Sin sombra y con borde fino (pedido de Andrea tras la demo del 75%: los botones se veían toscos).
// El degradado y el blanco del secundario son capas de fondo pegadas a los bordes (absolutas) y el texto va en el flujo
// normal: así el botón mide lo que su texto. Antes las capas usaban flexGrow y, cuando el botón no ocupaba todo el ancho,
// Android lo estiraba hacia abajo como un recuadro vacío (pasó con "Ver turnos" del rango y con "Cerrar sesión")
export const Button = ({ children, onPress, variant = 'primario', size = 'md', disabled = false, isLoading = false, style }: ButtonProps) => {
  const isDisabled = disabled || isLoading;
  // El borde degradado es el de marca en los dos roles; el texto del secundario va en el color del rol
  const { text: accentText } = useAccent();
  const textColor = variant === 'primario' ? colors.white : variant === 'grey' ? colors.grey : accentText;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        variant === 'grey' && styles.grey,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {variant !== 'grey' && (
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={[StyleSheet.absoluteFill, styles.layer]}
          pointerEvents="none"
        />
      )}
      {/* El borde degradado es lo que queda a la vista alrededor de esta capa blanca */}
      {variant === 'secundario' && <View style={styles.secondaryFill} pointerEvents="none" />}

      {isLoading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, size === 'sm' && styles.textSm, { color: textColor }]}>{children}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  // 44 de alto: lo mínimo cómodo para el dedo
  md: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  grey: {
    borderWidth: BORDE,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  layer: {
    borderRadius: radius.md,
  },
  secondaryFill: {
    position: 'absolute',
    top: BORDE,
    right: BORDE,
    bottom: BORDE,
    left: BORDE,
    borderRadius: radius.md - BORDE,
    backgroundColor: colors.white,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
  },
  textSm: {
    fontSize: fontSizes.sm,
  },
});
