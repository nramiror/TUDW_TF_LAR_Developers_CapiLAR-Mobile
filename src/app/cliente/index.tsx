import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getServicesRequest } from '@/api/services';
import type { Servicio } from '@/api/services';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Greeting } from '@/components/greeting/greeting';
import { Screen } from '@/components/screen/screen';
import { ServiceCard } from '@/components/serviceCard/serviceCard';
import { colors, fonts, fontSizes, spacing } from '@/theme';

// F03: catálogo de servicios. Al tocar uno se elige profesional, día y horario (reservar/[servicioId])
export default function Reservar() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setServicios(await getServicesRequest());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando servicios" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={refresh}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.hint}>Todavía no hay servicios para reservar.</Text>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <FlatList
        data={error ? [] : servicios}
        keyExtractor={(servicio) => String(servicio.id)}
        renderItem={({ item }) => (
          <ServiceCard servicio={item} onPress={() => router.push({ pathname: '/reservar/[servicioId]', params: { servicioId: item.id } })} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Greeting subtitle="¿Qué te querés hacer?" />
            <Text style={styles.hint}>Elegí un servicio para ver los días y horarios disponibles.</Text>
          </View>
        }
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
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
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
