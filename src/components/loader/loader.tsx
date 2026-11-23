import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, useAccent } from '@/theme';

// Pantalla de carga a pantalla completa (por ejemplo, mientras se recupera la sesión)
export const Loader = () => {
  const { accent } = useAccent();
  return (
    <View style={styles.container} accessibilityLabel="Cargando">
      <ActivityIndicator size="large" color={accent} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
