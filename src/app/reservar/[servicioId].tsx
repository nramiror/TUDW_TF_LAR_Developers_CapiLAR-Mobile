import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getProfessionalsRequest, getUpcomingWorkDatesRequest } from '@/api/professionals';
import type { ProfesionalResumen } from '@/api/professionals';
import { formatPrice, getServicesRequest } from '@/api/services';
import type { Servicio } from '@/api/services';
import {
  MAX_DIAS_ANTICIPACION,
  buscarPrimerHorarioLibre,
  createTurnoRequest,
  formatFechaCorta,
  formatFechaLarga,
  getDiasSinLugarRequest,
  getHorariosLibresRequest,
  toIsoDate,
} from '@/api/turnos';
import { showAlert } from '@/components/appAlert/appAlert';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { HorarioGrid } from '@/components/horarioGrid/horarioGrid';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Loader } from '@/components/loader/loader';
import { Screen } from '@/components/screen/screen';
import { ServiceCard } from '@/components/serviceCard/serviceCard';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

type Primero = { estado: 'buscando' } | { estado: 'listo'; encontrado: { legajo: number; fecha: string; hora: string } | null };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

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
  // Días que no se pueden elegir: null si no queda ningún horario libre, o el motivo si ya tiene ese servicio ese día
  const [sinLugar, setSinLugar] = useState<Map<string, string | null>>(new Map());
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
  // "Primer turno disponible" (como la web): buscando, o lo que encontró (null si nadie tiene lugar en 60 días)
  const [primero, setPrimero] = useState<Primero | null>(null);
  // Número de la búsqueda: si mientras busca se elige una profesional a mano, la respuesta se descarta
  const busquedaPrimero = useRef(0);
  // Día y horario encontrados, que se eligen cuando terminan de cargar los días y los horarios de esa profesional
  const pendiente = useRef<{ fecha: string; hora: string } | null>(null);

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

  // Días que trabaja el profesional (de hoy a 60 días). Encuesta del TP4: los que ya no tienen horarios libres
  // se ven en gris y no se pueden elegir. Se elige el primero que tiene lugar
  useEffect(() => {
    if (!token || legajo === null) return;
    let cancelled = false;
    setFecha(null);
    setFechas([]);
    setSinLugar(new Map());
    setError('');
    setIsLoadingFechas(true);
    const load = async () => {
      const dates = await getUpcomingWorkDatesRequest(token, legajo);
      const today = toIsoDate(new Date());
      const upcoming = dates.filter((date) => date >= today).sort();
      const completos = await getDiasSinLugarRequest(token, upcoming, [{ servicioId, legajo }]);
      if (cancelled) return;
      setFechas(upcoming);
      setSinLugar(completos);
      // Con "Primer turno disponible", el día que encontró; si no, el primero con lugar
      const buscado = pendiente.current?.fecha;
      const usable = buscado && upcoming.includes(buscado) && !completos.has(buscado) ? buscado : null;
      if (!usable) pendiente.current = null;
      setFecha(usable ?? upcoming.find((date) => !completos.has(date)) ?? null);
    };
    load()
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingFechas(false));
    return () => {
      cancelled = true;
    };
  }, [token, legajo, servicioId]);

  const fechasConLugar = fechas.filter((item) => !sinLugar.has(item)).length;
  // Regla del back (22/11): un servicio por día. Se avisa qué días ya tiene uno, con el mensaje del back
  const repetidos = fechas.filter((item) => sinLugar.get(item));
  const hayCompletos = fechas.some((item) => sinLugar.has(item) && !sinLugar.get(item));

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
        // "Primer turno disponible": queda elegido el horario que encontró, listo para confirmar
        if (pendiente.current?.fecha === fecha) {
          if (result.horarios.includes(pendiente.current.hora)) setHora(pendiente.current.hora);
          pendiente.current = null;
        }
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

  // Elegir una profesional a mano deja de usar "Primer turno disponible" (y descarta una búsqueda en curso)
  const elegirProfesional = (nuevo: number) => {
    busquedaPrimero.current++;
    pendiente.current = null;
    setPrimero(null);
    setLegajo(nuevo);
  };

  // Busca, entre todas las profesionales que hacen el servicio, el primer día con lugar de cada una (de los que trabaja)
  // y se queda con el más cercano: elige profesional, día y horario, y queda listo para confirmar
  const buscarPrimero = async () => {
    const busqueda = ++busquedaPrimero.current;
    pendiente.current = null;
    setPrimero({ estado: 'buscando' });
    setLegajo(null);
    setError('');

    const hoy = toIsoDate(new Date());
    const porProfesional = await Promise.all(
      profesionales.map(async (item) => {
        const dias = await getUpcomingWorkDatesRequest(token, item.legajo).catch((): string[] => []);
        const proximos = dias.filter((dia) => dia >= hoy).sort();
        const libre = await buscarPrimerHorarioLibre(token, proximos, [{ servicioId, legajo: item.legajo }]);
        return libre && { legajo: item.legajo, ...libre };
      }),
    );
    if (busqueda !== busquedaPrimero.current) return;

    // El más cercano: por fecha y, el mismo día, por hora ("HH:mm" se compara como texto)
    const mejor =
      porProfesional
        .filter((item) => item !== null)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))[0] ?? null;
    setPrimero({ estado: 'listo', encontrado: mejor });
    if (mejor) {
      pendiente.current = { fecha: mejor.fecha, hora: mejor.hora };
      setLegajo(mejor.legajo);
    }
  };

  // El aviso de lo encontrado se ve mientras siga elegido eso mismo
  const encontrado = primero?.estado === 'listo' ? primero.encontrado : null;
  const mostrarEncontrado =
    encontrado !== null && encontrado.legajo === legajo && encontrado.fecha === fecha && encontrado.hora === hora && profesional;

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
      showAlert(title, message, [{ text: 'Ver mis turnos', onPress: () => router.dismissTo('/cliente/turnos') }]);
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
          <>
            <View style={styles.wrap}>
              {/* Quality del TF (como la web): sin elegir a nadie, el turno libre más cercano entre todo el equipo */}
              <Chip
                label="Primer turno disponible"
                selected={primero !== null}
                onPress={buscarPrimero}
                accessibilityLabel="Primer turno disponible, con cualquiera del equipo"
              />
              {profesionales.map((item) => (
                <Chip
                  key={item.legajo}
                  label={`${item.nombre} ${item.apellido}`}
                  selected={primero === null && item.legajo === legajo}
                  onPress={() => elegirProfesional(item.legajo)}
                />
              ))}
            </View>
            {primero?.estado === 'buscando' && (
              <View style={styles.buscando}>
                <ActivityIndicator color={colors.violet} />
                <Text style={styles.hint}>Buscando el primer turno libre...</Text>
              </View>
            )}
            {mostrarEncontrado && (
              <View style={styles.aviso} accessibilityLiveRegion="polite">
                <Ionicons name="time-outline" size={20} color={colors.violet} />
                <View style={styles.flex}>
                  <Text style={styles.avisoTitle}>Encontramos el primer turno libre</Text>
                  <Text style={styles.hint}>
                    {capitalize(formatFechaLarga(encontrado.fecha))} a las {encontrado.hora} con {profesional.nombre} {profesional.apellido}.
                    Revisalo abajo y confirmá, o elegí otro día y horario.
                  </Text>
                </View>
              </View>
            )}
            {primero?.estado === 'listo' && !primero.encontrado && (
              <View style={[styles.aviso, styles.avisoSinLugar]} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
                <View style={styles.flex}>
                  <Text style={[styles.avisoTitle, styles.sinLugarTitle]}>No hay turnos libres</Text>
                  <Text style={styles.hint}>
                    Nadie del equipo tiene lugar para este servicio en los próximos {MAX_DIAS_ANTICIPACION} días.
                  </Text>
                </View>
              </View>
            )}
          </>
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
          ) : fechasConLugar === 0 ? (
            <Text style={styles.hint}>
              {profesional?.nombre} no tiene horarios libres en los próximos 60 días.
              {profesionales.length > 1 ? ' Probá con otro profesional.' : ''}
            </Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {fechas.map((item) => {
                  const completo = sinLugar.has(item);
                  return (
                    <Chip
                      key={item}
                      label={formatFechaCorta(item)}
                      selected={item === fecha}
                      onPress={() => {
                        setFecha(item);
                        setError('');
                      }}
                      disabled={completo}
                      style={completo && styles.dayFull}
                      accessibilityLabel={`${formatFechaLarga(item)}${completo ? `, ${sinLugar.get(item) ?? 'sin horarios libres'}` : ''}`}
                    />
                  );
                })}
              </ScrollView>
              {hayCompletos && <Text style={styles.hint}>Los días en gris ya no tienen horarios libres.</Text>}
              {repetidos.map((item) => (
                <Text key={item} style={styles.hint}>
                  {formatFechaCorta(item)}: {sinLugar.get(item)}.
                </Text>
              ))}
            </>
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
            <HorarioGrid horarios={horarios} selected={hora} onSelect={setHora} />
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
  buscando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aviso: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.violet,
    backgroundColor: colors.surface,
  },
  avisoSinLugar: {
    borderColor: colors.warning,
    backgroundColor: colors.white,
  },
  avisoTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.violetText,
  },
  sinLugarTitle: {
    color: colors.warning,
  },
  flex: {
    flex: 1,
    gap: spacing.xs,
  },
  // Día completo: gris como lo inactivo (además del 50% de opacidad del Chip deshabilitado)
  dayFull: {
    backgroundColor: colors.mutedSurface,
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
