import { Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing, useAccent } from '@/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// Opción seleccionable en forma de pastilla (profesional, día, horario, intensidad) o botón chico. Siempre pastilla.
// Elegida: fondo clarito con borde y texto violeta (pedido de Andrea: el violeta lleno se veía muy fuerte)
// Los colores de lo elegido y lo presionado son los del rol (violeta la clienta, fucsia la profesional)
export const Chip = ({ label, selected = false, onPress, disabled = false, accessibilityLabel, style }: ChipProps) => {
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: accent.surface, borderColor: accent.accent },
        pressed && !selected && { backgroundColor: accent.surface },
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={[styles.label, selected && [styles.selectedLabel, { color: accent.text }]]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  selectedLabel: {
    fontFamily: fonts.bodySemiBold,
  },
});
