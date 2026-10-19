import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getSeriesRequest } from '@/api/series';
import type { FechaSerie, Serie } from '@/api/series';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { SerieCard } from '@/components/serieCard/serieCard';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';

// F05: series de turnos de la clienta (las arma su estilista; ella solo las ve). Cada turno se cancela desde
// "Mis turnos" con las reglas de siempre. En una fecha que estaba ocupada puede elegir otro horario de ese día
export default function MisSeries() {
  const { token } = useAuth();
  const [series, setSeries] = useState<Serie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // Las dadas de baja no le sirven a la clienta (sus turnos ya se cancelaron)
      setSeries((await getSeriesRequest(token)).filter((serie) => serie.estado !== 'BAJA'));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Al volver de reservar otro horario, la fecha ya aparece con su turno
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

  const elegirHorario = (serie: Serie, fecha: FechaSerie) =>
    router.push({
      pathname: '/serie-reservar',
      params: {
        serieId: String(serie.id),
        fecha: fecha.fecha,
        servicioId: String(serie.servicioId),
        legajo: String(serie.legajo),
        servicio: serie.servicio,
        profesional: serie.profesional,
        horaInicio: serie.horaInicio,
      },
    });

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando series" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={refresh}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.hint}>
      No tenés series de turnos. Si hacés un servicio seguido, tu estilista te puede reservar los próximos turnos de una vez.
    </Text>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <FlatList
        data={error ? [] : series}
        keyExtractor={(serie) => String(serie.id)}
        ListHeaderComponent={
          series.length > 0 ? <Text style={[styles.hint, styles.header]}>Para cancelar un turno de la serie, hacelo desde &quot;Mis turnos&quot;.</Text> : null
        }
        renderItem={({ item }) => <SerieCard serie={item} para="cliente" onElegirHorario={(fecha) => elegirHorario(item, fecha)} />}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
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
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  header: {
    marginBottom: spacing.sm,
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
