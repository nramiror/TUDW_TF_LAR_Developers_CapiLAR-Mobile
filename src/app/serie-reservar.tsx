import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { createTurnoRequest, formatFechaLarga, getHorariosLibresRequest } from '@/api/turnos';
import type { TurnoItem } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { HorarioGrid } from '@/components/horarioGrid/horarioGrid';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type Params = {
  serieId: string;
  fecha: string;
  servicioId: string;
  legajo: string;
  servicio: string;
  profesional: string;
  horaInicio: string;
};

// F05: la clienta elige otro horario para una fecha de su serie que estaba ocupada. Mismo servicio y profesional;
// queda CONFIRMADO y dentro de la serie
export default function SerieReservar() {
  const params = useLocalSearchParams<Params>();
  const serieId = Number(params.serieId);
  const { user, token } = useAuth();

  const items = useMemo<TurnoItem[]>(
    () => [{ servicioId: Number(params.servicioId), legajo: Number(params.legajo) }],
    [params.servicioId, params.legajo],
  );
  const [horarios, setHorarios] = useState<string[]>([]);
  const [hora, setHora] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [horariosVersion, setHorariosVersion] = useState(0);

  useEffect(() => {
    if (!token || !params.fecha) return;
    let cancelled = false;
    setHora(null);
    setIsLoading(true);
    getHorariosLibresRequest(token, params.fecha, items)
      .then((result) => !cancelled && setHorarios(result.horarios))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, params.fecha, items, horariosVersion]);

  if (!user || !token) return <Redirect href="/" />;

  if (!serieId || !params.fecha) {
    return (
      <Screen edges={['bottom']}>
        <FormMessage message="No se pudo abrir esta fecha. Volvé a tus series y probá de nuevo." />
        <Button variant="secundario" onPress={() => router.back()}>
          Volver
        </Button>
      </Screen>
    );
  }

  const save = async () => {
    if (!hora) return;
    setError('');
    setIsSaving(true);
    try {
      await createTurnoRequest(token, { fecha: params.fecha, horaInicio: hora, items, serieId });
      Alert.alert('Turno reservado', `Te esperamos el ${formatFechaLarga(params.fecha)} a las ${hora} h.`, [
        { text: 'Volver a mis series', onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(errorMessage(err));
      // 409: alguien tomó ese horario mientras tanto -> se actualiza la lista
      if (err instanceof ApiError && err.status === 409) setHorariosVersion((v) => v + 1);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{capitalize(formatFechaLarga(params.fecha))}</Text>
        <Text style={styles.cardText}>
          {params.servicio} con {params.profesional}
        </Text>
        <Text style={styles.hint}>Ese día no había lugar a las {params.horaInicio} h. Elegí otro horario.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿A qué hora?</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.violet} style={styles.loading} />
        ) : horarios.length === 0 ? (
          <Text style={styles.hint}>No quedan horarios libres ese día. Podés pedir otro turno desde Reservar.</Text>
        ) : (
          <HorarioGrid horarios={horarios} selected={hora} onSelect={setHora} />
        )}
      </View>

      {hora && <Text style={styles.hint}>El turno queda confirmado y es parte de tu serie.</Text>}

      {error !== '' && <FormMessage message={error} />}

      {hora && (
        <Button onPress={save} isLoading={isSaving}>
          Reservar
        </Button>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  cardText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  loading: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
});
