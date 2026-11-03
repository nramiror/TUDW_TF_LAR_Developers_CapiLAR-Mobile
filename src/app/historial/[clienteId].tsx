import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getFichasClienteRequest } from '@/api/fichas';
import type { Ficha } from '@/api/fichas';
import { formatFechaLarga } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const plural = (count: number, singular: string, pluralText: string) => `${count} ${count === 1 ? singular : pluralText}`;

// F08: historial capilar de una clienta (cualquier profesional del salón), de la ficha más nueva a la más vieja.
// Al tocar una se ve completa
export default function HistorialCapilar() {
  const { clienteId: rawId, cliente } = useLocalSearchParams<{ clienteId: string; cliente: string }>();
  const clienteId = Number(rawId);
  const { token } = useAuth();
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setFichas(await getFichasClienteRequest(token, clienteId));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [token, clienteId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando historial" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={refresh}>
        Reintentar
      </Button>
    </View>
  ) : (
    <Text style={styles.hint}>Todavía no tiene fichas técnicas cargadas.</Text>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <FlatList
        data={error ? [] : fichas}
        keyExtractor={(ficha) => String(ficha.id)}
        ListHeaderComponent={<Text style={styles.title}>{cliente}</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/ficha-detalle/[fichaId]', params: { fichaId: String(item.id) } })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={styles.cardText}>
              <Text style={styles.date}>{capitalize(formatFechaLarga(item.fecha))}</Text>
              <Text style={styles.detail}>
                {item.servicio} · {item.profesional}
              </Text>
              <Text style={styles.summary}>
                {plural(item.formulas.length, 'fórmula', 'fórmulas')} · {plural(item.fotos.length, 'foto', 'fotos')}
                {item.cerradaEn ? '' : ' · abierta'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.grey} />
          </Pressable>
        )}
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
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  date: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
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
