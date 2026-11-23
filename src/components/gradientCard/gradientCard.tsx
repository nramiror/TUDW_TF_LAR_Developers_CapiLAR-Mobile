import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, gradient, radius, spacing } from '@/theme';

interface GradientCardProps {
  children: ReactNode;
  // Estilo del interior (gap, padding)
  style?: StyleProp<ViewStyle>;
  // Se ve apagada (opacidad); junto con muted, como deshabilitada (turnos cancelados)
  dimmed?: boolean;
  // Lo que ya no está activo (ej. series dadas de baja): fondo gris suave y borde gris, sin degradado (pedido de Andrea)
  muted?: boolean;
}

const BORDE = 1.5;

// Tarjeta blanca con el borde del degradado de la marca (la aprobó Andrea en Mis turnos, PWA-282).
// El borde es el padding del degradado que queda a la vista alrededor del interior blanco
export const GradientCard = ({ children, style, dimmed = false, muted = false }: GradientCardProps) =>
  muted ? (
    <View style={[styles.border, styles.mutedBorder, dimmed && styles.dimmed]}>
      <View style={[styles.card, styles.mutedCard, style]}>{children}</View>
    </View>
  ) : (
    <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={[styles.border, dimmed && styles.dimmed]}>
      <View style={[styles.card, style]}>{children}</View>
    </LinearGradient>
  );

const styles = StyleSheet.create({
  border: {
    padding: BORDE,
    borderRadius: radius.md,
  },
  mutedBorder: {
    backgroundColor: colors.border,
  },
  dimmed: {
    opacity: 0.6,
  },
  card: {
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md - BORDE,
    backgroundColor: colors.white,
  },
  mutedCard: {
    backgroundColor: colors.mutedSurface,
  },
});
