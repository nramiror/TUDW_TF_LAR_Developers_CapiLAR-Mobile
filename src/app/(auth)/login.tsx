import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button/button';
import { ComingSoon } from '@/components/comingSoon/comingSoon';
import { Screen } from '@/components/screen/screen';
import { colors, fonts, fontSizes, spacing } from '@/theme';

// Provisoria: el formulario y la sesión con SecureStore se hacen en PWA-185.
// Los botones de demo permiten recorrer la estructura de cada rol mientras tanto.
export default function Login() {
  return (
    <Screen edges={['bottom']}>
      <ComingSoon title="Iniciar sesión" issue="PWA-185" />

      <View style={styles.demo}>
        <Text style={styles.demoLabel}>Solo para desarrollo</Text>
        <Button variant="grey" onPress={() => router.replace('/cliente')}>
          Ver app de cliente
        </Button>
        <Button variant="grey" onPress={() => router.replace('/profesional')}>
          Ver app de profesional
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demo: {
    gap: spacing.sm,
  },
  demoLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.greyLight,
    textAlign: 'center',
  },
});
