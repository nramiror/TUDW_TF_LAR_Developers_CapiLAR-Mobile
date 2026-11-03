import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { FRECUENCIAS, FRECUENCIA_LABEL, createSerieRequest, fechasFinPosibles, previewSerieRequest } from '@/api/series';
import type { FechaPlanificada, FrecuenciaSerie, VistaPreviaSerie } from '@/api/series';
import { formatFechaCorta, formatFechaLarga } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// En las fechas ocupadas se muestran algunos horarios libres de ejemplo (los ve completos la clienta)
const MAX_HORARIOS_VISTA = 6;

type IconName = ComponentProps<typeof Ionicons>['name'];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// Qué va a pasar en cada fecha, contado para el profesional
const describir = (fecha: FechaPlanificada, hora: string): { icon: IconName; color: string; text: string; extra?: string } => {
  if (fecha.estado === 'LIBRE') return { icon: 'checkmark-circle', color: colors.success, text: `Se reserva a las ${hora} h` };
  if (fecha.estado === 'SIN_HORARIO') {
    return { icon: 'alert-circle', color: colors.warning, text: 'Se reserva, pero no cargaste tu horario ese día' };
  }
  const libres = fecha.horariosLibres;
  return {
    icon: 'close-circle',
    color: colors.error,
    text: `No se reserva${fecha.motivo ? `: ${fecha.motivo}` : ''}`,
    extra:
      libres.length === 0
        ? 'Ese día no quedan horarios libres.'
        : `La clienta puede elegir otro horario: ${libres.slice(0, MAX_HORARIOS_VISTA).join(', ')}${libres.length > MAX_HORARIOS_VISTA ? '…' : ''}`,
  };
};

type Params = {
  turnoId: string;
  detalleId: string;
  cliente: string;
  servicio: string;
  fecha: string;
  horaInicio: string;
};

// F05: el profesional repite el servicio de un turno CONFIRMADO suyo, a la misma hora, cada tantos días y hasta
// 60 días desde hoy. Antes de crearla ve qué pasa en cada fecha (vista previa del back)
export default function SerieNueva() {
  const params = useLocalSearchParams<Params>();
  const turnoId = Number(params.turnoId);
  const turnoDetalleId = Number(params.detalleId);
  const { user, token } = useAuth();

  const [frecuencia, setFrecuencia] = useState<FrecuenciaSerie>('SEMANAL');
  const finesPosibles = useMemo(() => fechasFinPosibles(params.fecha ?? '', frecuencia), [params.fecha, frecuencia]);
  // Por defecto, lo más lejos que se puede
  const [fechaFin, setFechaFin] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaPreviaSerie | null>(null);
  const [isLoadingVista, setIsLoadingVista] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Al cambiar la frecuencia cambian las fechas posibles: se vuelve a la última
  useEffect(() => {
    setFechaFin(finesPosibles.at(-1) ?? null);
  }, [finesPosibles]);

  useEffect(() => {
    if (!token || !turnoId || !fechaFin) return;
    let cancelled = false;
    setVista(null);
    setError('');
    setIsLoadingVista(true);
    previewSerieRequest(token, { turnoId, turnoDetalleId, frecuencia, fechaFin })
      .then((result) => !cancelled && setVista(result))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingVista(false));
    return () => {
      cancelled = true;
    };
  }, [token, turnoId, turnoDetalleId, frecuencia, fechaFin]);

  if (!user || !token) return <Redirect href="/" />;

  if (!turnoId || !turnoDetalleId || !params.fecha) {
    return (
      <Screen edges={['bottom']}>
        <FormMessage message="No se pudo abrir este turno. Volvé a la agenda y probá de nuevo." />
        <Button variant="secundario" onPress={() => router.back()}>
          Volver
        </Button>
      </Screen>
    );
  }

  const seReservan = vista?.fechas.filter((item) => item.estado !== 'OCUPADA').length ?? 0;
  const ocupadas = vista?.fechas.filter((item) => item.estado === 'OCUPADA').length ?? 0;
  const sinHorario = vista?.fechas.some((item) => item.estado === 'SIN_HORARIO') ?? false;

  const save = async () => {
    if (!fechaFin) return;
    setError('');
    setIsSaving(true);
    try {
      const serie = await createSerieRequest(token, { turnoId, turnoDetalleId, frecuencia, fechaFin });
      const reservados = serie.fechas.filter((item) => item.turnoId !== null).length;
      Alert.alert(
        'Serie creada',
        `Se reservaron ${reservados} ${reservados === 1 ? 'turno' : 'turnos'}. A ${params.cliente} le llega un mail con todas las fechas.` +
          (sinHorario ? ' Acordate de cargar tu horario en los días que te faltan.' : ''),
        [{ text: 'Volver a la agenda', onPress: () => router.back() }],
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{params.cliente}</Text>
        <Text style={styles.cardText}>{params.servicio}</Text>
        <Text style={styles.cardText}>
          Turno de origen: {formatFechaLarga(params.fecha)}, {params.horaInicio} h
        </Text>
      </View>

      <Section title="¿Cada cuánto?">
        <View style={styles.wrap}>
          {FRECUENCIAS.map((item) => (
            <Chip key={item} label={FRECUENCIA_LABEL[item]} selected={item === frecuencia} onPress={() => setFrecuencia(item)} />
          ))}
        </View>
      </Section>

      <Section title="¿Hasta cuándo?">
        {finesPosibles.length === 0 ? (
          <Text style={styles.hint}>Con esta frecuencia no hay fechas dentro de los próximos 60 días.</Text>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {finesPosibles.map((item) => (
                <Chip key={item} label={formatFechaCorta(item)} selected={item === fechaFin} onPress={() => setFechaFin(item)} />
              ))}
            </ScrollView>
            <Text style={styles.hint}>La serie puede llegar hasta 60 días desde hoy.</Text>
          </>
        )}
      </Section>

      {(isLoadingVista || vista) && (
        <Section title="Fechas">
          {isLoadingVista || !vista ? (
            <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Calculando fechas" />
          ) : (
            <View style={styles.fechas}>
              {vista.fechas.map((item) => {
                const info = describir(item, vista.horaInicio);
                return (
                  <View key={item.fecha} style={styles.fecha}>
                    <Ionicons name={info.icon} size={20} color={info.color} />
                    <View style={styles.fechaTexts}>
                      <Text style={styles.fechaDia}>{formatFechaCorta(item.fecha)}</Text>
                      <Text style={styles.cardText}>{info.text}</Text>
                      {info.extra && <Text style={styles.hint}>{info.extra}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Section>
      )}

      {vista && (
        <Text style={styles.note}>
          {`Se ${seReservan === 1 ? 'reserva 1 turno' : `reservan ${seReservan} turnos`} confirmados`}
          {ocupadas > 0 ? ` y ${ocupadas === 1 ? 'queda 1 fecha ocupada' : `quedan ${ocupadas} fechas ocupadas`}` : ''}. A{' '}
          {params.cliente} le llega un mail con todas las fechas
          {ocupadas > 0 ? ' y, en las ocupadas, puede elegir otro horario desde la app' : ''}.
          {sinHorario ? ' En los días sin horario cargado te llega un mail para que lo cargues.' : ''}
        </Text>
      )}

      {error !== '' && <FormMessage message={error} />}

      {vista && (
        <Button onPress={save} isLoading={isSaving}>
          Crear serie
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
  fechas: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  fecha: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fechaTexts: {
    flex: 1,
    gap: 2,
  },
  fechaDia: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
});
