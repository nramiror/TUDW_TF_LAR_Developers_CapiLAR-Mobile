import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getProfessionalsRequest, getUpcomingWorkDatesRequest } from '@/api/professionals';
import type { ProfesionalResumen } from '@/api/professionals';
import { formatPrice, getServicesRequest } from '@/api/services';
import type { Servicio } from '@/api/services';
import { createTurnoRequest, formatFechaCorta, formatFechaLarga, getHorariosLibresRequest, toIsoDate } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Loader } from '@/components/loader/loader';
import { Screen } from '@/components/screen/screen';
import { ServiceCard } from '@/components/serviceCard/serviceCard';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// "10:00" + 50 -> "10:50"
const addMinutes = (hora: string, minutes: number) => {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// F03: reservar un servicio (uno por turno, acordado con el equipo). Se elige profesional, día y horario libre.
// Nace CONFIRMADO; si el servicio requiere evaluación, queda PENDIENTE hasta que el profesional lo acepte
export default function ReservarServicio() {
  const { servicioId: rawId } = useLocalSearchParams<{ servicioId: string }>();
  const servicioId = Number(rawId);
  const { user, token } = useAuth();

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [profesionales, setProfesionales] = useState<ProfesionalResumen[]>([]);
  const [legajo, setLegajo] = useState<number | null>(null);
  const [fechas, setFechas] = useState<string[]>([]);
  const [fecha, setFecha] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [duracion, setDuracion] = useState(0);
  const [hora, setHora] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFechas, setIsLoadingFechas] = useState(false);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  // Cambia para volver a pedir los horarios (por ejemplo, si otro cliente tomó el elegido)
  const [horariosVersion, setHorariosVersion] = useState(0);

  // Servicio y profesionales que lo hacen. Si hay uno solo, queda elegido
  useEffect(() => {
    const load = async () => {
      try {
        const [catalog, pros] = await Promise.all([getServicesRequest(), getProfessionalsRequest(servicioId)]);
        const found = catalog.find((item) => item.id === servicioId);
        if (!found) throw new ApiError('Este servicio ya no está disponible.', 404);
        setServicio(found);
        setProfesionales(pros);
        if (pros.length === 1) setLegajo(pros[0].legajo);
      } catch (err) {
        setLoadError(errorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [servicioId]);

  // Días que trabaja el profesional (de hoy a 60 días). Se elige el primero
  useEffect(() => {
    if (!token || legajo === null) return;
    let cancelled = false;
    setFecha(null);
    setFechas([]);
    setError('');
    setIsLoadingFechas(true);
    getUpcomingWorkDatesRequest(token, legajo)
      .then((dates) => {
        if (cancelled) return;
        const today = toIsoDate(new Date());
        const upcoming = dates.filter((date) => date >= today).sort();
        setFechas(upcoming);
        setFecha(upcoming[0] ?? null);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingFechas(false));
    return () => {
      cancelled = true;
    };
  }, [token, legajo]);

  // Horarios libres de ese día para el servicio con ese profesional
  useEffect(() => {
    if (!token || legajo === null || !fecha) return;
    let cancelled = false;
    setHora(null);
    setHorarios([]);
    setIsLoadingHorarios(true);
    getHorariosLibresRequest(token, fecha, [{ servicioId, legajo }])
      .then((result) => {
        if (cancelled) return;
        setHorarios(result.horarios);
        setDuracion(result.duracion);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingHorarios(false));
    return () => {
      cancelled = true;
    };
  }, [token, legajo, fecha, servicioId, horariosVersion]);

  if (!user || !token) return <Redirect href="/" />;
  if (isLoading) return <Loader />;

  if (loadError || !servicio) {
    return (
      <Screen edges={['bottom']}>
        <FormMessage message={loadError || 'Este servicio ya no está disponible.'} />
        <Button variant="secundario" onPress={() => router.back()}>
          Volver
        </Button>
      </Screen>
    );
  }

  const profesional = profesionales.find((item) => item.legajo === legajo);

  const book = async () => {
    if (legajo === null || !fecha || !hora) return;
    setError('');
    setIsBooking(true);
    try {
      const turno = await createTurnoRequest(token, { fecha, horaInicio: hora, items: [{ servicioId, legajo }] });
      // El estado lo decide el back según el servicio
      const [title, message] =
        turno.estado === 'PENDIENTE'
          ? ['¡Turno solicitado!', 'Te avisamos por mail cuando el salón lo confirme. Lo podés seguir en "Mis turnos".']
          : ['¡Turno confirmado!', 'Te esperamos. Te mandamos los datos por mail y lo podés ver en "Mis turnos".'];
      Alert.alert(title, message, [{ text: 'Ver mis turnos', onPress: () => router.dismissTo('/cliente/turnos') }]);
    } catch (err) {
      setError(errorMessage(err));
      // 409: alguien tomó ese horario mientras tanto -> se actualiza la lista
      if (err instanceof ApiError && err.status === 409) setHorariosVersion((v) => v + 1);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <ServiceCard servicio={servicio} />

      <Section title="¿Con quién?">
        {profesionales.length === 0 ? (
          <Text style={styles.hint}>Por ahora ningún profesional hace este servicio. Probá con otro.</Text>
        ) : (
          <View style={styles.wrap}>
            {profesionales.map((item) => (
              <Chip
                key={item.legajo}
                label={`${item.nombre} ${item.apellido}`}
                selected={item.legajo === legajo}
                onPress={() => setLegajo(item.legajo)}
              />
            ))}
          </View>
        )}
      </Section>

      {legajo !== null && (
        <Section title="¿Qué día?">
          {isLoadingFechas ? (
            <ActivityIndicator color={colors.violet} style={styles.loading} />
          ) : fechas.length === 0 ? (
            <Text style={styles.hint}>
              {profesional?.nombre} no tiene días cargados en los próximos 60 días.
              {profesionales.length > 1 ? ' Probá con otro profesional.' : ''}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {fechas.map((item) => (
                <Chip key={item} label={formatFechaCorta(item)} selected={item === fecha} onPress={() => setFecha(item)} />
              ))}
            </ScrollView>
          )}
        </Section>
      )}

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

      {hora && fecha && profesional && (
        <View style={styles.summary}>
          <Text style={styles.sectionTitle}>Tu turno</Text>
          <Text style={styles.summaryText}>
            {servicio.tipo} con {profesional.nombre} {profesional.apellido}
          </Text>
          <Text style={styles.summaryText}>
            {formatFechaLarga(fecha)}, de {hora} a {addMinutes(hora, duracion)} h
          </Text>
          <Text style={styles.summaryText}>Precio de referencia: {formatPrice(servicio.precio)}</Text>
          <Text style={styles.note}>
            El precio final se define en el salón según tu cabello.{' '}
            {servicio.requiereEvaluacion
              ? 'Este servicio requiere evaluación: tu turno queda pendiente hasta que el salón lo confirme. Una vez confirmado, podés cancelarlo hasta 12 horas antes.'
              : 'Tu turno queda confirmado al reservar. Podés cancelarlo hasta 12 horas antes.'}
          </Text>
        </View>
      )}

      {error !== '' && <FormMessage message={error} />}

      {hora && (
        <Button onPress={book} isLoading={isBooking}>
          {servicio.requiereEvaluacion ? 'Solicitar turno' : 'Confirmar turno'}
        </Button>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
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
  summary: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.violet,
    backgroundColor: colors.white,
  },
  summaryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  note: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
});
