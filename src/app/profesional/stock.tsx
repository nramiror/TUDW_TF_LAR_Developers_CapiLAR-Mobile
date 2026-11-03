import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { formatMarca, getArticulosRequest } from '@/api/articulos';
import type { Articulo } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { ArticuloCard } from '@/components/articuloCard/articuloCard';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Sin mayúsculas ni tildes, como la búsqueda del back
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const textoBuscable = (articulo: Articulo) =>
  normalizar([articulo.nombre, articulo.codigo, articulo.tonalidad, formatMarca(articulo.marca)].filter(Boolean).join(' '));

// F11: stock del salón. Los artículos del salón son pocos, así que se traen todos y se filtran en el celular mientras se escribe.
// Cada artículo abre su detalle (movimientos y envase abierto); "Escanear QR" lo abre directo
export default function Stock() {
  const { token } = useAuth();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setArticulos(await getArticulosRequest(token));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Al volver del detalle o del escáner el stock puede haber cambiado
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const bajoStock = articulos.filter((articulo) => articulo.bajoStock).length;

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return articulos.filter(
      (articulo) => (!soloBajoStock || articulo.bajoStock) && (!texto || textoBuscable(articulo).includes(texto)),
    );
  }, [articulos, busqueda, soloBajoStock]);

  const header = (
    <View style={styles.header}>
      <Button onPress={() => router.push('/escanear')}>Escanear QR</Button>
      <TextField
        label="Buscar"
        placeholder="Nombre, marca, tono o código"
        value={busqueda}
        onChangeText={setBusqueda}
        autoCorrect={false}
        returnKeyType="search"
      />
      <View style={styles.filters}>
        <Chip label="Todos" selected={!soloBajoStock} onPress={() => setSoloBajoStock(false)} />
        <Chip label={`Bajo stock (${bajoStock})`} selected={soloBajoStock} onPress={() => setSoloBajoStock(true)} />
      </View>
    </View>
  );

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando stock" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={refresh}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.hint}>
      {articulos.length === 0
        ? 'Todavía no hay artículos cargados. Los da de alta el administrador desde la web.'
        : soloBajoStock && !busqueda.trim()
          ? 'No hay artículos con bajo stock.'
          : 'No encontramos artículos con esa búsqueda.'}
    </Text>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <FlatList
        data={error ? [] : visibles}
        keyExtractor={(articulo) => String(articulo.id)}
        renderItem={({ item }) => (
          <ArticuloCard articulo={item} onPress={() => router.push({ pathname: '/articulo/[articuloId]', params: { articuloId: item.id } })} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.violet]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
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
