import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { coincideBusqueda, formatEnvases, formatMarca, formatPeso, getArticulosRequest } from '@/api/articulos';
import type { Articulo } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

interface ArticuloPickerProps {
  visible: boolean;
  onSelect: (articulo: Articulo) => void;
  onClose: () => void;
}

// F11, desde la ficha técnica: elegir un producto del stock para un insumo. Solo los de uso en el salón (SALON o AMBOS),
// que son los que el back acepta en una ficha. La lista se pide al abrir, así el stock está al día
export const ArticuloPicker = ({ visible, onSelect, onClose }: ArticuloPickerProps) => {
  const { token } = useAuth();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!visible || !token) return;
    let cancelled = false;
    setBusqueda('');
    setIsLoading(true);
    setError('');
    getArticulosRequest(token, 'SALON')
      .then((result) => !cancelled && setArticulos(result))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [visible, token, intento]);

  const visibles = useMemo(() => articulos.filter((articulo) => coincideBusqueda(articulo, busqueda)), [articulos, busqueda]);

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando productos" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={() => setIntento((n) => n + 1)}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.detail}>
      {articulos.length === 0 ? 'No hay productos de uso en el salón cargados en el stock.' : 'No encontramos productos con esa búsqueda.'}
    </Text>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Elegir del stock</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={colors.black} />
          </Pressable>
        </View>
        <View style={styles.search}>
          <TextField
            label="Buscar"
            placeholder="Nombre, marca, tono o código"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <FlatList
          data={error ? [] : visibles}
          keyExtractor={(articulo) => String(articulo.id)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${item.nombre}, ${formatEnvases(item.stock)}`}
            >
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.detail}>
                {formatMarca(item.marca)}
                {item.tonalidad ? ` · Tono ${item.tonalidad}` : ''}
              </Text>
              <Text style={[styles.detail, (item.bajoStock || Number(item.stock) <= 0) && styles.warning]}>
                {formatEnvases(item.stock)} de {formatPeso(item.pesoInicial, item.tipoPeso)}
                {item.bajoStock ? ' · Bajo stock' : ''}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={empty}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  search: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  item: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  nombre: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  warning: {
    color: colors.warning,
  },
  separator: {
    height: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  gap: {
    gap: spacing.md,
  },
});
