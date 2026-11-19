import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { TIPO_PRODUCTO_LABEL, coincideBusqueda, estadoVencimiento, formatMarca, getArticulosRequest } from '@/api/articulos';
import type { Articulo, TipoProducto } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { ArticuloCard } from '@/components/articuloCard/articuloCard';
import { Button } from '@/components/button/button';
import { ActionGrid } from '@/components/actionTile/actionTile';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { SelectField } from '@/components/selectField/selectField';
import type { SelectOption } from '@/components/selectField/selectField';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

const TODOS = 'TODOS';

// Estado del stock, como los filtros de la web: poco stock y vencimiento (excluyentes)
type FiltroEstado = typeof TODOS | 'BAJO' | 'VENCIDO' | 'VENCE_PRONTO';
const FILTROS_ESTADO: SelectOption<FiltroEstado>[] = [
  { value: TODOS, label: 'Todos' },
  { value: 'BAJO', label: 'Poco stock' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'VENCE_PRONTO', label: 'Vence pronto' },
];

const cumpleEstado = (articulo: Articulo, estado: FiltroEstado) => {
  if (estado === TODOS) return true;
  // Los dados de baja no cuentan como poco stock ni por vencer (igual que la web)
  if (articulo.fechaBaja !== null) return false;
  if (estado === 'BAJO') return articulo.bajoStock;
  return estadoVencimiento(articulo) === estado;
};

// F11: stock del salón, filtrado en el celular mientras se escribe y con la línea de filtros de la web (tipo, marca, estado). Cada artículo abre su detalle (movimientos y envase abierto); "Escanear QR" lo abre directo
export default function Stock() {
  const { token } = useAuth();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<TipoProducto | typeof TODOS>(TODOS);
  const [marcaId, setMarcaId] = useState<string>(TODOS);
  const [estado, setEstado] = useState<FiltroEstado>(TODOS);

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

  // Solo los tipos y marcas que hay en el stock, ordenados por nombre
  const opcionesTipo: SelectOption<TipoProducto | typeof TODOS>[] = useMemo(
    () => [
      { value: TODOS, label: 'Todos' },
      ...[...new Set(articulos.map((articulo) => articulo.tipoProducto))]
        .map((value) => ({ value, label: TIPO_PRODUCTO_LABEL[value] }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    ],
    [articulos],
  );
  const opcionesMarca: SelectOption<string>[] = useMemo(
    () => [
      { value: TODOS, label: 'Todas' },
      ...[...new Map(articulos.map((articulo) => [String(articulo.marcaId), formatMarca(articulo.marca)])).entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    ],
    [articulos],
  );

  const visibles = useMemo(
    () =>
      articulos.filter(
        (articulo) =>
          (tipo === TODOS || articulo.tipoProducto === tipo) &&
          (marcaId === TODOS || String(articulo.marcaId) === marcaId) &&
          cumpleEstado(articulo, estado) &&
          coincideBusqueda(articulo, busqueda),
      ),
    [articulos, busqueda, tipo, marcaId, estado],
  );

  const hayFiltros = tipo !== TODOS || marcaId !== TODOS || estado !== TODOS;
  const limpiarFiltros = () => {
    setTipo(TODOS);
    setMarcaId(TODOS);
    setEstado(TODOS);
  };

  const header = (
    <View style={styles.header}>
      {/* Accesos con ícono, como en la agenda (pedido de Andrea) */}
      <ActionGrid
        actions={[
          { label: 'Escanear QR', icon: 'qr-code-outline', onPress: () => router.push('/escanear') },
          { label: 'Nuevo artículo', icon: 'add-circle-outline', onPress: () => router.push('/articulo-nuevo') },
        ]}
      />
      <TextField
        label="Buscar"
        placeholder="Nombre, marca, tono o código"
        value={busqueda}
        onChangeText={setBusqueda}
        autoCorrect={false}
        returnKeyType="search"
      />
      {/* Línea de filtros como la web */}
      <View style={styles.filters}>
        <SelectField label="Tipo" value={tipo} options={opcionesTipo} onChange={setTipo} style={styles.flex} />
        <SelectField label="Marca" value={marcaId} options={opcionesMarca} onChange={setMarcaId} style={styles.flex} />
        <SelectField label="Estado" value={estado} options={FILTROS_ESTADO} onChange={setEstado} style={styles.flex} />
      </View>
      {hayFiltros && (
        <Pressable onPress={limpiarFiltros} hitSlop={spacing.sm} style={styles.clear} accessibilityRole="button">
          <Ionicons name="close" size={16} color={colors.grey} />
          <Text style={styles.clearText}>Limpiar filtros</Text>
        </Pressable>
      )}
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
        ? 'Todavía no hay artículos cargados. Tocá "Nuevo artículo" para cargar el primero.'
        : 'No encontramos artículos con esa búsqueda o esos filtros.'}
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
  flex: {
    flex: 1,
  },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  clearText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.grey,
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
