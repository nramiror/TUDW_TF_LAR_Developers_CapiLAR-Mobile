import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

interface LogoProps {
  // Ancho en puntos; el alto se calcula con la proporción del logo
  width?: number;
  // Versión blanca, para fondos oscuros o degradados
  light?: boolean;
}

// Mismos archivos que la web (public/capiLAR_logo1.png y capiLAR_logo_footer.png)
const LOGO = require('@/assets/images/logo.png');
const LOGO_BLANCO = require('@/assets/images/logo-blanco.png');
const ASPECT_RATIO = 1904 / 511;

export const Logo = ({ width = 200, light = false }: LogoProps) => (
  <Image
    source={light ? LOGO_BLANCO : LOGO}
    style={[styles.logo, { width, height: width / ASPECT_RATIO }]}
    contentFit="contain"
    accessibilityLabel="CapiLAR"
  />
);

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
