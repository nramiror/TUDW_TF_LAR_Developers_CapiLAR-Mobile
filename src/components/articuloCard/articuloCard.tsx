import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatEnvases, formatMarca, formatPeso } from '@/api/articulos';
import type { Articulo } from '@/api/articulos';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

interface ArticuloCardProps {
  articulo: Articulo;
  // Sin onPress es solo para ver (cabecera del detalle)
  onPress?: () => void;
}

// F11: un artículo del stock con su marca, cuántos envases quedan y el envase abierto
export const ArticuloCard = ({ articulo, onPress }: ArticuloCardProps) => {
  const { envaseEnUso } = articulo;
  const dadoDeBaja = articulo.fechaBaja !== null;

  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{articulo.nombre}</Text>
        {dadoDeBaja ? (
          <View style={[styles.badge, { borderColor: colors.grey }]}>
            <Text style={[styles.badgeText, { color: colors.grey }]}>Dado de baja</Text>
          </View>
        ) : (
          articulo.bajoStock && (
            <View style={[styles.badge, { borderColor: colors.warning }]}>
              <Text style={[styles.badgeText, { color: colors.warning }]}>Bajo stock</Text>
            </View>
          )
        )}
      </View>
      <Text style={styles.detail}>
        {formatMarca(articulo.marca)}
        {articulo.tonalidad ? ` · Tono ${articulo.tonalidad}` : ''}
      </Text>
      <View style={styles.row}>
        <Text style={[styles.stock, Number(articulo.stock) < 0 && styles.negativo]}>{formatEnvases(articulo.stock)}</Text>
        <Text style={styles.detail}>de {formatPeso(articulo.pesoInicial, articulo.tipoPeso)}</Text>
      </View>
      <Text style={styles.detail}>
        {envaseEnUso
          ? `Envase abierto: quedan ${formatPeso(envaseEnUso.pesoActual, envaseEnUso.tipoPeso)}`
          : 'Sin envase abierto'}
      </Text>
    </>
  );

  if (!onPress) return <View style={styles.card}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${articulo.nombre}, ${formatEnvases(articulo.stock)}${articulo.bajoStock ? ', bajo stock' : ''}`}
    >
      <View style={styles.flex}>{content}</View>
      <Ionicons name="chevron-forward" size={20} color={colors.greyLight} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  stock: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  negativo: {
    color: colors.error,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
});
