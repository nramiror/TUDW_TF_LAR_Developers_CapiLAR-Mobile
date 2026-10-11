import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

// Pantalla de carga a pantalla completa (por ejemplo, mientras se recupera la sesión)
export const Loader = () => (
  <View style={styles.container} accessibilityLabel="Cargando">
    <ActivityIndicator size="large" color={colors.violet} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
