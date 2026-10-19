import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface SheetOption {
  label: string;
  icon: IconName;
  onPress: () => void;
  // Acción que borra algo: en rojo
  destructive?: boolean;
  // Se ve en gris y no se toca; `hint` explica desde cuándo se puede usar
  disabled?: boolean;
  hint?: string;
}

interface OptionsSheetProps {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  onClose: () => void;
}

// Menú que sube desde abajo con una lista de acciones y "Cancelar".
// En Android, Alert muestra como mucho 3 botones; esto sirve para más opciones
export const OptionsSheet = ({ visible, title, options, onClose }: OptionsSheetProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        {title && <Text style={styles.title}>{title}</Text>}
        {options.map((option) => {
          const color = option.disabled ? colors.grey : option.destructive ? colors.error : colors.black;
          const iconColor = option.disabled ? colors.grey : option.destructive ? colors.error : colors.violet;
          return (
            <Pressable
              key={option.label}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              disabled={option.disabled}
              onPress={() => {
                onClose();
                option.onPress();
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled: option.disabled }}
              accessibilityHint={option.hint}
            >
              <Ionicons name={option.icon} size={22} color={iconColor} />
              <View style={styles.texts}>
                <Text style={[styles.label, { color }]}>{option.label}</Text>
                {option.hint && <Text style={styles.hint}>{option.hint}</Text>}
              </View>
            </Pressable>
          );
        })}
        <Pressable style={({ pressed }) => [styles.option, styles.cancel, pressed && styles.pressed]} onPress={onClose} accessibilityRole="button">
          <Text style={[styles.label, styles.cancelLabel]}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.grey,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  texts: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  cancel: {
    justifyContent: 'center',
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cancelLabel: {
    color: colors.grey,
  },
});
