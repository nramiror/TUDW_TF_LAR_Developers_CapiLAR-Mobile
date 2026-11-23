import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, radius, spacing, useAccent } from '@/theme';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

// Desplegable compacto, como el FilterSelect de la web (filtros de la agenda y de stock): muestra la opción elegida
// y, al tocarlo, sube desde abajo la lista con un tilde en la elegida. Sin librerías: Modal de React Native
export const SelectField = <T extends string>({ label, value, options, onChange, style }: SelectFieldProps<T>) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  // Lo presionado y lo elegido, en el color del rol
  const accent = useAccent();
  const elegida = options.find((option) => option.value === value);

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.box, pressed && { backgroundColor: accent.surface }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${elegida?.label ?? ''}`}
        accessibilityHint="Abre las opciones"
      >
        <Text style={styles.value} numberOfLines={1}>
          {elegida?.label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.grey} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.title}>{label}</Text>
          {/* Hay listas largas (ej. marcas): con scroll y alto máximo */}
          <ScrollView style={styles.list}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setOpen(false);
                    onChange(option.value);
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: accent.surface }]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={[styles.optionText, selected && [styles.optionSelected, { color: accent.text }]]}>{option.label}</Text>
                  {selected && <Ionicons name="checkmark" size={20} color={accent.accent} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  value: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '70%',
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
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  optionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  optionSelected: {
    fontFamily: fonts.bodySemiBold,
  },
});
