import { StyleSheet, Text, View } from 'react-native';

import { textoSinPrecio } from '@/api/fichas';
import type { TotalDeProductos } from '@/api/fichas';
import { formatPrice } from '@/api/services';
import { colors, fonts, fontSizes, spacing } from '@/theme';

// Total de los productos de una ficha, al final de las fórmulas (como en la web). Sin productos no muestra nada
export const TotalProductos = ({ total, sinPrecio, estimado }: TotalDeProductos) => {
  if (total === 0 && sinPrecio === 0) return null;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>
          Total de productos{estimado && <Text style={styles.estimado}> (estimado)</Text>}
        </Text>
        <Text style={styles.label}>{formatPrice(total)}</Text>
      </View>
      {sinPrecio > 0 && <Text style={styles.hint}>{textoSinPrecio(sinPrecio)}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  estimado: {
    fontFamily: fonts.body,
    color: colors.grey,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
});
