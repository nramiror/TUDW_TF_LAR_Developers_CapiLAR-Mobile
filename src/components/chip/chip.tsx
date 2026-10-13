import { Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

// Opción seleccionable en forma de pastilla (profesional, día, horario) o botón chico. Elegida: fondo violeta
export const Chip = ({ label, selected = false, onPress, disabled = false, accessibilityLabel, style }: ChipProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && !selected && styles.pressed, disabled && styles.disabled, style]}
    accessibilityRole="button"
    accessibilityState={{ selected, disabled }}
    accessibilityLabel={accessibilityLabel ?? label}
  >
    <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  pressed: {
    backgroundColor: colors.surface,
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
    color: colors.white,
  },
});
