import { colors } from './colors';
import { fonts, fontSizes } from './typography';

// Estilo común de las barras de pestañas (cliente y profesional).
// Etiquetas y contador en 12 px: React Navigation trae 10 y 11 por defecto (encuesta del TP4, mínimo 12)
export const tabScreenOptions = {
  headerTitleAlign: 'center' as const,
  headerTitleStyle: { fontFamily: fonts.subtitle, color: colors.black },
  headerShadowVisible: false,
  tabBarActiveTintColor: colors.violet,
  tabBarInactiveTintColor: colors.greyLight,
  tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs },
  tabBarBadgeStyle: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.xs },
  tabBarStyle: { borderTopColor: colors.border },
  sceneStyle: { backgroundColor: colors.background },
};
