import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip/chip';
import { spacing } from '@/theme';

interface HorarioGridProps {
  // "HH:mm"
  horarios: string[];
  selected: string | null;
  onSelect: (hora: string) => void;
}

// Horarios libres en 4 columnas del mismo ancho. Con flexWrap cada pastilla medía lo que su texto
// ("11:11" es más angosto que "10:00" en Inter) y las filas no quedaban alineadas
export const HorarioGrid = ({ horarios, selected, onSelect }: HorarioGridProps) => (
  <View style={styles.grid}>
    {horarios.map((hora) => (
      <View key={hora} style={styles.cell}>
        <Chip label={hora} selected={hora === selected} onPress={() => onSelect(hora)} style={styles.chip} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  // El margen negativo compensa el padding de las celdas de los costados
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    rowGap: spacing.sm,
  },
  cell: {
    width: '25%',
    paddingHorizontal: spacing.xs,
  },
  chip: {
    paddingHorizontal: 0,
  },
});
