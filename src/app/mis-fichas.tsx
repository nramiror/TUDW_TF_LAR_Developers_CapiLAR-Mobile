import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getMisFichasRequest } from '@/api/fichas';
import type { FichaCliente } from '@/api/fichas';
import { formatFechaLarga } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { FichaFotos } from '@/components/fichaFotos/fichaFotos';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// F08: historial capilar del CLIENTE. De cada servicio completado ve los cuidados que le indicó su estilista
// y las fotos de antes y después (el diagnóstico y las fórmulas quedan para el salón)
export default function MisFichas() {
  const { token } = useAuth();
  const [fichas, setFichas] = useState<FichaCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setFichas(await getMisFichasRequest(token));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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
    <Text style={styles.hint}>
      Todavía no tenés fichas. Después de cada servicio vas a ver acá los cuidados que te indicó tu estilista y las fotos de antes y
      después.
    </Text>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <FlatList
        data={error ? [] : fichas}
        keyExtractor={(ficha) => String(ficha.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.date}>{capitalize(formatFechaLarga(item.fecha))}</Text>
            <Text style={styles.detail}>
              {item.servicio} · {item.profesional}
            </Text>
            <Text style={styles.label}>Cuidados</Text>
            <Text style={item.indicacionesCliente ? styles.text : styles.hint}>
              {item.indicacionesCliente || 'Tu estilista no dejó indicaciones.'}
            </Text>
            {item.fotos.length > 0 && (
              <>
                <Text style={styles.label}>Fotos</Text>
                <FichaFotos fichaId={item.id} fotos={item.fotos} />
              </>
            )}
          </View>
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
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  date: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  label: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.violet,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
    lineHeight: 20,
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
