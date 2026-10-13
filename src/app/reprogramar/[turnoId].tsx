import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getUpcomingWorkDatesRequest } from '@/api/professionals';
import { formatFechaCorta, formatFechaLarga, getHorariosLibresRequest, rescheduleTurnoRequest, toIsoDate } from '@/api/turnos';
import type { TurnoItem } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

type Params = {
  turnoId: string;
  fecha: string;
  horaInicio: string;
  cliente: string;
  servicios: string;
  items: string;
};

// F03: el profesional propone otro día y horario para un turno. Queda REPROGRAMADO hasta que el cliente lo acepte.
// Los datos del turno llegan desde la agenda (el back no tiene un GET de un turno)
export default function Reprogramar() {
  const params = useLocalSearchParams<Params>();
  const turnoId = Number(params.turnoId);
  const { user, token } = useAuth();
  const legajo = user?.profesional?.legajo;

  const [items] = useState<TurnoItem[]>(() => {
    try {
      return JSON.parse(params.items ?? '[]');
    } catch {
      return [];
    }
  });
  const [fechas, setFechas] = useState<string[]>([]);
  const [fecha, setFecha] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [hora, setHora] = useState<string | null>(null);
  const [isLoadingFechas, setIsLoadingFechas] = useState(true);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [horariosVersion, setHorariosVersion] = useState(0);

  // Días que trabaja (de hoy a 60). Arranca en el día del turno si sigue cargado
  useEffect(() => {
    if (!token || !legajo) return;
    let cancelled = false;
    getUpcomingWorkDatesRequest(token, legajo)
      .then((dates) => {
        if (cancelled) return;
        const today = toIsoDate(new Date());
        const upcoming = dates.filter((date) => date >= today).sort();
        setFechas(upcoming);
        setFecha(upcoming.includes(params.fecha) ? params.fecha : (upcoming[0] ?? null));
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingFechas(false));
    return () => {
      cancelled = true;
    };
  }, [token, legajo, params.fecha]);

  // Horarios libres ese día para los mismos servicios, sin contar el horario actual del turno.
  // Con turnoId el back ya descarta los que el cliente tiene ocupados (no acepta además clienteId)
  useEffect(() => {
    if (!token || !fecha || items.length === 0) return;
    let cancelled = false;
    setHora(null);
    setHorarios([]);
    setIsLoadingHorarios(true);
    getHorariosLibresRequest(token, fecha, items, { turnoId })
      .then((result) => {
        if (cancelled) return;
        // El mismo horario que ya tiene no es una propuesta nueva
        setHorarios(result.horarios.filter((item) => !(fecha === params.fecha && item === params.horaInicio)));
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingHorarios(false));
    return () => {
      cancelled = true;
    };
  }, [token, fecha, items, turnoId, params.fecha, params.horaInicio, horariosVersion]);

  if (!user || !token) return <Redirect href="/" />;

  if (!legajo || !turnoId || items.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <FormMessage message="No se pudo abrir este turno. Volvé a la agenda y probá de nuevo." />
        <Button variant="secundario" onPress={() => router.back()}>
          Volver
        </Button>
      </Screen>
    );
  }

  const save = async () => {
    if (!fecha || !hora) return;
    setError('');
    setIsSaving(true);
    try {
      await rescheduleTurnoRequest(token, turnoId, fecha, hora);
      Alert.alert('Nuevo horario propuesto', `Le avisamos a ${params.cliente} por mail. El turno se confirma cuando lo acepte.`, [
        { text: 'Volver a la agenda', onPress: () => router.back() },
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
        <Text style={styles.cardTitle}>{params.cliente}</Text>
        <Text style={styles.cardText}>{params.servicios}</Text>
        <Text style={styles.cardText}>
          Ahora: {formatFechaLarga(params.fecha)}, {params.horaInicio} h
        </Text>
      </View>

      <Section title="¿Qué día?">
        {isLoadingFechas ? (
          <ActivityIndicator color={colors.violet} style={styles.loading} />
        ) : fechas.length === 0 ? (
          <Text style={styles.hint}>No tenés días cargados en los próximos 60 días. Cargalos en "Mis horarios".</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {fechas.map((item) => (
              <Chip key={item} label={formatFechaCorta(item)} selected={item === fecha} onPress={() => setFecha(item)} />
            ))}
          </ScrollView>
        )}
      </Section>

      {fecha && (
        <Section title="¿A qué hora?">
          {isLoadingHorarios ? (
            <ActivityIndicator color={colors.violet} style={styles.loading} />
          ) : horarios.length === 0 ? (
            <Text style={styles.hint}>No quedan horarios libres ese día. Probá con otro.</Text>
          ) : (
            <View style={styles.wrap}>
              {horarios.map((item) => (
                <Chip key={item} label={item} selected={item === hora} onPress={() => setHora(item)} />
              ))}
            </View>
          )}
        </Section>
      )}

      {hora && fecha && (
        <Text style={styles.note}>
          Le vas a proponer el {formatFechaLarga(fecha)} a las {hora} h. El turno queda en espera hasta que {params.cliente} lo
          acepte desde la app.
        </Text>
      )}

      {error !== '' && <FormMessage message={error} />}

      {hora && (
        <Button onPress={save} isLoading={isSaving}>
          Proponer nuevo horario
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
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  loading: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
});
