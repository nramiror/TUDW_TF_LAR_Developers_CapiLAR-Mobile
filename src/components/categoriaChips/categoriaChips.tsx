import { ScrollView, StyleSheet } from 'react-native';

import type { Categoria } from '@/api/services';
import { Chip } from '@/components/chip/chip';
import { spacing } from '@/theme';

interface CategoriaChipsProps {
  categorias: Categoria[];
  // La elegida; null: todas
  value: number | null;
  onChange: (id: number | null) => void;
}

// Filtro de servicios por categoría (catálogo y nuevo turno), como en la web: 'Todas' y una pastilla por categoría.
// En una fila que se desliza de costado, para no ocupar media pantalla si el salón carga muchas
export const CategoriaChips = ({ categorias, value, onChange }: CategoriaChipsProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
    accessibilityLabel='Filtrar por categoría'
  >
    {[{ id: null, nombre: 'Todas' }, ...categorias].map((categoria) => (
      <Chip
        key={categoria.id ?? 'todas'}
        label={categoria.nombre}
        selected={categoria.id === value}
        onPress={() => onChange(categoria.id)}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
});
