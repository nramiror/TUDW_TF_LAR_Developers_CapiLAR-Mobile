import { colors } from './colors';
import { fonts } from './typography';

// Estilo común de las barras de pestañas (cliente y profesional)
export const tabScreenOptions = {
  headerTitleAlign: 'center' as const,
  headerTitleStyle: { fontFamily: fonts.subtitle, color: colors.black },
  headerShadowVisible: false,
  tabBarActiveTintColor: colors.violet,
  tabBarInactiveTintColor: colors.greyLight,
  tabBarLabelStyle: { fontFamily: fonts.bodyMedium },
  tabBarStyle: { borderTopColor: colors.border },
  sceneStyle: { backgroundColor: colors.background },
};
