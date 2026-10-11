import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  // Con scroll para pantallas largas (formularios, listados cortos). Para listas largas usar FlatList adentro
  scroll?: boolean;
  // Bordes donde respetar la barra de estado / navegación. Con tabs abajo, solo 'top'
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

// Contenedor base de todas las pantallas: fondo, márgenes y zona segura (notch, barra de estado)
export const Screen = ({ children, scroll = false, edges = ['top', 'bottom'], style }: ScreenProps) => (
  <SafeAreaView style={styles.safe} edges={edges}>
    {scroll ? (
      <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.content, styles.fill, style]}>{children}</View>
    )}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
});
