import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ApiError } from '@/api/client';
import { getFichaRequest } from '@/api/fichas';
import type { Ficha } from '@/api/fichas';
import { Button } from '@/components/button/button';
import { FichaView } from '@/components/fichaView/fichaView';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, spacing } from '@/theme';

// F08: una ficha del historial capilar, completa y solo de lectura (desde el historial de la clienta)
export default function FichaDetalle() {
  const { fichaId } = useLocalSearchParams<{ fichaId: string }>();
  const { token } = useAuth();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      setFicha(await getFichaRequest(token, Number(fichaId)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    }
  }, [token, fichaId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      {error ? (
        <>
          <FormMessage message={error} />
          <Button variant="secundario" onPress={load}>
            Reintentar
          </Button>
        </>
      ) : ficha ? (
        <FichaView ficha={ficha} />
      ) : (
        <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando ficha" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
});
