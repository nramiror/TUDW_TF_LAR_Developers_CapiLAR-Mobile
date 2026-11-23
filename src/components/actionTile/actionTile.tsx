import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSizes, radius, spacing, useAccent } from '@/theme';

export interface TileAction {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}

// Acceso con ícono a la izquierda y texto corto al lado (perfil, atajos de la agenda)
// El ícono y su círculo, en el color del rol
export const ActionTile = ({ label, icon, onPress }: TileAction) => {
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: accent.surface }]}
      accessibilityRole="button"
    >
      <View style={[styles.icon, { backgroundColor: accent.surface }]}>
        <Ionicons name={icon} size={20} color={accent.accent} />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
};

// Grilla de 2 columnas: cada acceso ocupa casi la mitad y el gap completa el resto
export const ActionGrid = ({ actions }: { actions: TileAction[] }) => (
  <View style={styles.grid}>
    {actions.map((action) => (
      <ActionTile key={action.label} {...action} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs + 1,
    color: colors.black,
  },
});
