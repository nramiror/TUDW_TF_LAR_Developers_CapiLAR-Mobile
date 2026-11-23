import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { endSerieRequest, getSeriesRequest, reactivateSerieRequest, suspendSerieRequest } from '@/api/series';
import type { EstadoSerie, Serie } from '@/api/series';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { ReasonModal } from '@/components/reasonModal/reasonModal';
import { Screen } from '@/components/screen/screen';
import { SerieCard } from '@/components/serieCard/serieCard';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Las activas arriba y las dadas de baja al final; dentro de cada grupo, más nuevas primero (como las manda el back)
const ORDEN: Record<EstadoSerie, number> = { ACTIVA: 0, SUSPENDIDA: 1, BAJA: 2 };
const ordenar = (series: Serie[]) => [...series].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado]);

// Sin mayúsculas ni tildes, para buscar por la clienta ("maria" encuentra a "María")
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const deLaClienta = (serie: Serie, busqueda: string) =>
  normalizar(`${serie.cliente.nombre} ${serie.cliente.apellido}`).includes(normalizar(busqueda.trim()));

type MotivoPedido = { tipo: 'suspender' | 'baja'; serie: Serie };

// F05: series que gestiona el profesional. Suspender cancela los turnos que no empezaron y se puede reactivar;
// dar de baja es definitivo. Las series se crean desde un turno de la agenda
export default function Series() {
  const { token } = useAuth();
  const [series, setSeries] = useState<Serie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [motivoPedido, setMotivoPedido] = useState<MotivoPedido | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setSeries(ordenar(await getSeriesRequest(token)));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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

  const run = async (serie: Serie, request: () => Promise<Serie>, failTitle: string) => {
    setBusyId(serie.id);
    try {
      const updated = await request();
      setSeries((prev) => ordenar(prev.map((item) => (item.id === updated.id ? updated : item))));
      setMotivoPedido(null);
    } catch (err) {
      Alert.alert(failTitle, errorMessage(err));
      load();
    } finally {
      setBusyId(null);
    }
  };

  const reactivar = (serie: Serie) => {
    if (!token) return;
    Alert.alert('Reactivar serie', `Se vuelven a reservar las fechas que quedan de ${serie.cliente.nombre}, y le llega un mail.`, [
      { text: 'Volver', style: 'cancel' },
      { text: 'Reactivar', onPress: () => run(serie, () => reactivateSerieRequest(token, serie.id), 'No se pudo reactivar') },
    ]);
  };

  const confirmMotivo = (motivo: string) => {
    if (!token || !motivoPedido) return;
    const { tipo, serie } = motivoPedido;
    if (tipo === 'suspender') run(serie, () => suspendSerieRequest(token, serie.id, motivo), 'No se pudo suspender');
    else run(serie, () => endSerieRequest(token, serie.id, motivo), 'No se pudo dar de baja');
  };

  const empty = isLoading ? (
    <ActivityIndicator color={colors.fuchsia} style={styles.loading} accessibilityLabel="Cargando series" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={refresh}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.hint}>
      {series.length > 0
        ? `No encontramos series de "${busqueda.trim()}".`
        : 'Todavía no tenés series. Para crear una, abrí un turno confirmado o completado en tu agenda y elegí "Crear serie".'}
    </Text>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <FlatList
        data={error ? [] : series.filter((serie) => deLaClienta(serie, busqueda))}
        // Búsqueda por clienta arriba (pedido de Andrea); solo si hay series
        ListHeaderComponent={
          series.length > 0 ? (
            <View style={styles.header}>
              <TextField
                label="Buscar por cliente"
                placeholder="Nombre o apellido"
                value={busqueda}
                onChangeText={setBusqueda}
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        keyExtractor={(serie) => String(serie.id)}
        renderItem={({ item }) => (
          <SerieCard serie={item} para="profesional">
            {item.estado !== 'BAJA' && (
              <>
                <Button variant="grey" size="sm" onPress={() => setMotivoPedido({ tipo: 'baja', serie: item })} disabled={busyId === item.id}>
                  Dar de baja
                </Button>
                {item.estado === 'ACTIVA' ? (
                  <Button
                    variant="secundario"
                    size="sm"
                    onPress={() => setMotivoPedido({ tipo: 'suspender', serie: item })}
                    disabled={busyId === item.id}
                  >
                    Suspender
                  </Button>
                ) : (
                  <Button size="sm" onPress={() => reactivar(item)} isLoading={busyId === item.id}>
                    Reactivar
                  </Button>
                )}
              </>
            )}
          </SerieCard>
        )}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.fuchsia]} />}
      />

      <ReasonModal
        visible={motivoPedido !== null}
        title={motivoPedido?.tipo === 'suspender' ? 'Suspender serie' : 'Dar de baja la serie'}
        description={
          motivoPedido?.tipo === 'suspender'
            ? 'Se cancelan los turnos de la serie que todavía no empezaron y le avisamos a la clienta. Después la podés reactivar.'
            : 'Se cancelan los turnos de la serie que todavía no empezaron y le avisamos a la clienta. No se puede deshacer.'
        }
        confirmLabel={motivoPedido?.tipo === 'suspender' ? 'Suspender' : 'Dar de baja'}
        optional
        isLoading={busyId !== null}
        onConfirm={confirmMotivo}
        onClose={() => setMotivoPedido(null)}
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
    marginBottom: spacing.md,
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
