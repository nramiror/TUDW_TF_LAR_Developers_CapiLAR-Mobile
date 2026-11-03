import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  DEPOSITO_LABEL,
  MOVIMIENTO_LABEL,
  abrirEnvaseRequest,
  actualizarEnvaseRequest,
  formatEnvases,
  formatFechaHora,
  formatPeso,
  formatVariacion,
  getArticuloRequest,
  getMovimientosRequest,
  terminarEnvaseRequest,
} from '@/api/articulos';
import type { Articulo, Movimiento } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { UNIDAD_LABEL } from '@/api/fichas';
import { ArticuloCard } from '@/components/articuloCard/articuloCard';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Loader } from '@/components/loader/loader';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { parseDecimal } from '@/utils/validation';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// F11, desde la pestaña Stock o el escáner: el artículo, su envase abierto y el historial de movimientos (por páginas, del más nuevo al más viejo).
// Un artículo dado de baja se puede ver, pero no se le registran movimientos ni se abren envases
export default function ArticuloDetalle() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ articuloId: string }>();
  const articuloId = Number(params.articuloId);

  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  // Texto de "lo que queda" mientras se edita; null si no se está editando
  const [pesoActual, setPesoActual] = useState<string | null>(null);
  const [pesoError, setPesoError] = useState('');

  // Siempre desde la primera página: al volver de registrar un movimiento, el nuevo aparece arriba
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [art, pag] = await Promise.all([getArticuloRequest(token, articuloId), getMovimientosRequest(token, articuloId, 1)]);
      setArticulo(art);
      setMovimientos(pag.items);
      setTotal(pag.total);
      setPagina(1);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, articuloId]);

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

  const cargarMas = async () => {
    if (!token || isLoadingMore || movimientos.length >= total) return;
    setIsLoadingMore(true);
    try {
      const pag = await getMovimientosRequest(token, articuloId, pagina + 1);
      // Si entre medio se registró otro movimiento, la página se corre: se evitan repetidos
      setMovimientos((prev) => [...prev, ...pag.items.filter((item) => !prev.some((mov) => mov.id === item.id))]);
      setTotal(pag.total);
      setPagina(pag.pagina);
    } catch (err) {
      Alert.alert('No se pudieron cargar más', errorMessage(err));
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) return <Loader />;

  if (!articulo || !token) {
    return (
      <Screen edges={[]}>
        <FormMessage message={error || 'No encontramos el producto.'} />
        <Button variant="secundario" onPress={refresh}>
          Reintentar
        </Button>
      </Screen>
    );
  }

  const dadoDeBaja = articulo.fechaBaja !== null;
  const { envaseEnUso } = articulo;

  // Las acciones del envase responden el artículo actualizado (terminar no: queda sin envase)
  const runEnvase = async (request: () => Promise<Articulo | null>, failTitle: string) => {
    setIsBusy(true);
    try {
      const updated = await request();
      setArticulo(updated ?? { ...articulo, envaseEnUso: null });
      setPesoActual(null);
    } catch (err) {
      Alert.alert(failTitle, errorMessage(err));
      load();
    } finally {
      setIsBusy(false);
    }
  };

  const abrirEnvase = () => {
    const abrir = () => runEnvase(() => abrirEnvaseRequest(token, articuloId), 'No se pudo abrir el envase');
    if (!envaseEnUso) return abrir();
    Alert.alert('Abrir un envase nuevo', `El envase abierto (quedan ${formatPeso(envaseEnUso.pesoActual, envaseEnUso.tipoPeso)}) se da por terminado.`, [
      { text: 'Volver', style: 'cancel' },
      { text: 'Abrir nuevo', onPress: abrir },
    ]);
  };

  const terminarEnvase = () => {
    Alert.alert('Terminar el envase', 'El producto queda sin envase abierto. El stock no cambia.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: () =>
          runEnvase(async () => {
            await terminarEnvaseRequest(token, articuloId);
            return null;
          }, 'No se pudo terminar el envase'),
      },
    ]);
  };

  const guardarPeso = () => {
    if (pesoActual === null) return;
    const value = parseDecimal(pesoActual, 2);
    if (value === null) return setPesoError('Escribí un número, con hasta 2 decimales.');
    if (value > Number(articulo.pesoInicial)) {
      return setPesoError(`No puede superar el contenido del envase (${formatPeso(articulo.pesoInicial, articulo.tipoPeso)}).`);
    }
    runEnvase(() => actualizarEnvaseRequest(token, articuloId, value), 'No se pudo actualizar');
  };

  // Lo que queda del envase abierto, en una barra
  const porcentaje = envaseEnUso ? Math.min(100, Math.max(0, (Number(envaseEnUso.pesoActual) / Number(articulo.pesoInicial)) * 100)) : 0;

  const header = (
    <View style={styles.header}>
      {dadoDeBaja && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Este producto está dado de baja: se puede ver su historial, pero no registrar movimientos ni abrir envases.
          </Text>
        </View>
      )}

      <ArticuloCard articulo={articulo} />
      <View style={styles.data}>
        <Text style={styles.detail}>Stock mínimo: {formatEnvases(articulo.stockMinAlert)}</Text>
        <Text style={styles.detail}>Ubicación: {DEPOSITO_LABEL[articulo.tipoDeposito]}</Text>
        <Text style={styles.detail}>Código: {articulo.qr}</Text>
      </View>

      {!dadoDeBaja && (
        <Button onPress={() => router.push({ pathname: '/movimiento-nuevo', params: { articuloId } })}>Registrar movimiento</Button>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Envase abierto</Text>
        {envaseEnUso ? (
          <>
            <Text style={styles.text}>
              Quedan {formatPeso(envaseEnUso.pesoActual, envaseEnUso.tipoPeso)} de {formatPeso(articulo.pesoInicial, articulo.tipoPeso)}
            </Text>
            <View style={styles.bar} accessibilityLabel={`Queda el ${Math.round(porcentaje)} %`}>
              <View style={[styles.barFill, { width: `${porcentaje}%` }]} />
            </View>

            {pesoActual !== null ? (
              <View style={styles.gapSm}>
                <TextField
                  label={`¿Cuánto queda? (en ${UNIDAD_LABEL[articulo.tipoPeso] === 'unidad' ? 'unidades' : UNIDAD_LABEL[articulo.tipoPeso]})`}
                  value={pesoActual}
                  onChangeText={(text) => {
                    setPesoActual(text);
                    setPesoError('');
                  }}
                  keyboardType="decimal-pad"
                  error={pesoError}
                  hint={`De 0 a ${formatPeso(articulo.pesoInicial, articulo.tipoPeso)}`}
                  autoFocus
                />
                <View style={styles.buttonsRow}>
                  <Button style={styles.flex} onPress={guardarPeso} isLoading={isBusy}>
                    Guardar
                  </Button>
                  <Button variant="grey" style={styles.flex} onPress={() => setPesoActual(null)} disabled={isBusy}>
                    Volver
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.gapSm}>
                {!dadoDeBaja && (
                  <Button
                    variant="secundario"
                    onPress={() => {
                      setPesoActual(String(Number(envaseEnUso.pesoActual)).replace('.', ','));
                      setPesoError('');
                    }}
                    disabled={isBusy}
                  >
                    Actualizar lo que queda
                  </Button>
                )}
                <View style={styles.buttonsRow}>
                  {!dadoDeBaja && (
                    <Button variant="secundario" style={styles.flex} onPress={abrirEnvase} disabled={isBusy}>
                      Abrir otro
                    </Button>
                  )}
                  <Button variant="grey" style={styles.flex} onPress={terminarEnvase} isLoading={isBusy}>
                    Terminar
                  </Button>
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.detail}>
              {dadoDeBaja ? 'No hay un envase abierto.' : 'No hay un envase abierto. Al abrir uno queda lleno; el stock no cambia.'}
            </Text>
            {!dadoDeBaja && (
              <Button variant="secundario" onPress={abrirEnvase} isLoading={isBusy}>
                Abrir un envase
              </Button>
            )}
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Movimientos ({total})</Text>
    </View>
  );

  const footer =
    movimientos.length < total ? (
      <Button variant="secundario" onPress={cargarMas} isLoading={isLoadingMore} style={styles.more}>
        Cargar más
      </Button>
    ) : null;

  return (
    <Screen edges={['bottom']} style={styles.screen}>
      <FlatList
        data={movimientos}
        keyExtractor={(mov) => String(mov.id)}
        renderItem={({ item }) => <MovimientoRow movimiento={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.detail}>Todavía no hay movimientos.</Text>}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.violet]} />}
        ListFooterComponentStyle={styles.footer}
      />
    </Screen>
  );
}

// Un movimiento del historial: tipo, cuánto cambió el stock, cuándo, quién y por qué
const MovimientoRow = ({ movimiento }: { movimiento: Movimiento }) => {
  const value = Number(movimiento.cantidad);
  const color = value > 0 ? colors.success : value < 0 ? colors.error : colors.grey;
  return (
    <View style={styles.mov}>
      <View style={styles.movRow}>
        <Text style={styles.movTipo}>{MOVIMIENTO_LABEL[movimiento.tipo]}</Text>
        <Text style={[styles.movCantidad, { color }]}>{formatVariacion(movimiento.cantidad)}</Text>
      </View>
      <Text style={styles.detail}>
        {formatFechaHora(movimiento.fecha)}
        {movimiento.usuario ? ` · ${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : ''}
      </Text>
      {movimiento.motivo ? <Text style={styles.text}>{movimiento.motivo}</Text> : null}
      {movimiento.numComprobante ? <Text style={styles.detail}>Comprobante {movimiento.numComprobante}</Text> : null}
    </View>
  );
};

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
    marginBottom: spacing.sm,
  },
  notice: {
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  noticeText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.warning,
  },
  data: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  bar: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.violet,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  gapSm: {
    gap: spacing.sm,
  },
  mov: {
    gap: 2,
    paddingVertical: spacing.sm,
  },
  movRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  movTipo: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  movCantidad: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  footer: {
    marginTop: spacing.md,
  },
  more: {
    alignSelf: 'stretch',
  },
});
