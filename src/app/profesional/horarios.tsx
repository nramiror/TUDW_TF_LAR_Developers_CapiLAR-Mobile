import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { MAX_HORAS_JORNADA, createAvailabilityRequest, deleteAvailabilityRequest, getAvailabilityRequest } from '@/api/professionals';
import type { Disponibilidad } from '@/api/professionals';
import { MAX_DIAS_ANTICIPACION, addDays, formatFechaCorta, formatWeek, fromIsoDate, startOfWeek, toIsoDate } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Días de la semana en el orden del salón (getDay(): 0 es domingo)
const DIAS = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
];

// Las horas se eligen de a 30 minutos, de 06:00 a 23:00
const PASO = 30;
const HORA_MIN = 6 * 60;
const HORA_MAX = 23 * 60;

const toMinutes = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};
const toHora = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// Ya hay un horario de ese día que se pisa con inicio-fin
const seSuperpone = (horarios: Disponibilidad[], fecha: string, inicio: number, fin: number) =>
  horarios.some((h) => h.fecha === fecha && inicio < toMinutes(h.horarioFin) && toMinutes(h.horarioInicio) < fin);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const weekDates = (lunes: Date) => Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(lunes, i)));

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// Hora con botones de - y + (30 minutos)
const HoraStepper = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <View style={styles.stepper}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <View style={styles.stepperRow}>
      <Pressable
        onPress={() => onChange(Math.max(HORA_MIN, value - PASO))}
        disabled={value <= HORA_MIN}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed, value <= HORA_MIN && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: 30 minutos antes`}
      >
        <Ionicons name="remove" size={20} color={colors.violet} />
      </Pressable>
      <Text style={styles.stepperValue}>{toHora(value)}</Text>
      <Pressable
        onPress={() => onChange(Math.min(HORA_MAX, value + PASO))}
        disabled={value >= HORA_MAX}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed, value >= HORA_MAX && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: 30 minutos después`}
      >
        <Ionicons name="add" size={20} color={colors.violet} />
      </Pressable>
    </View>
  </View>
);

// F03: días y horarios de trabajo del profesional, semana por semana como en la web.
// Un día sin horarios es un día libre (no hay bloqueos). Una semana armada se puede copiar a la siguiente
export default function MisHorarios() {
  const { user, token } = useAuth();
  const legajo = user?.profesional?.legajo;

  const [semana, setSemana] = useState(() => startOfWeek(new Date()));
  const [horarios, setHorarios] = useState<Disponibilidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [dias, setDias] = useState<number[]>([]);
  const [inicio, setInicio] = useState(9 * 60);
  const [fin, setFin] = useState(18 * 60);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token || !legajo) return;
    try {
      setHorarios(await getAvailabilityRequest(token, legajo, toIsoDate(semana), toIsoDate(addDays(semana, 6))));
      setLoadError('');
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, legajo, semana]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!token || !legajo) {
    return (
      <Screen edges={[]}>
        <FormMessage message="Tu usuario no tiene legajo de profesional. Consultá con el administrador del salón." />
      </Screen>
    );
  }

  const hoy = toIsoDate(new Date());
  // Se cargan horarios de hoy a 60 días (lo que se puede reservar)
  const limite = toIsoDate(addDays(new Date(), MAX_DIAS_ANTICIPACION));
  const editable = (fecha: string) => fecha >= hoy && fecha <= limite;
  const fechasSemana = weekDates(semana);
  const esEstaSemana = toIsoDate(semana) === toIsoDate(startOfWeek(new Date()));
  const hayMasAdelante = toIsoDate(addDays(semana, 7)) <= limite;

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const irASemana = (lunes: Date) => {
    setSemana(lunes);
    setHorarios([]);
    setFormError('');
    setIsLoading(true);
  };

  // Fechas de esta semana en los días elegidos que todavía se pueden cargar.
  // Se saltean las que ya tienen un horario que se superpone, para no frenar toda la carga por un día
  const elegidas = fechasSemana.filter((fecha) => dias.includes(fromIsoDate(fecha).getDay()) && editable(fecha));
  const fechas = elegidas.filter((fecha) => !seSuperpone(horarios, fecha, inicio, fin));
  const salteadas = elegidas.length - fechas.length;

  const toggleDia = (day: number) => {
    setFormError('');
    setDias((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const save = async () => {
    setFormError('');
    if (dias.length === 0) return setFormError('Elegí al menos un día de la semana');
    if (inicio >= fin) return setFormError('El horario de inicio tiene que ser anterior al de fin');
    if (fin - inicio > MAX_HORAS_JORNADA * 60) return setFormError(`La jornada no puede superar las ${MAX_HORAS_JORNADA} horas`);
    if (elegidas.length === 0) return setFormError('Esos días de esta semana ya pasaron');
    if (fechas.length === 0) return setFormError('Esos días ya tienen un horario que se superpone');

    setIsSaving(true);
    try {
      await createAvailabilityRequest(token, legajo, fechas, toHora(inicio), toHora(fin));
      setDias([]);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setIsSaving(false);
      load();
    }
  };

  // Copia los horarios de esta semana a la siguiente (mismo día de la semana y horario) y pasa a verla.
  // Se saltean los días que ya pasaron, los que superan los 60 días y los que ya tienen un horario que se pisa
  const copiarALaSiguiente = async () => {
    setFormError('');
    setIsCopying(true);
    try {
      const siguiente = addDays(semana, 7);
      const yaCargados = await getAvailabilityRequest(token, legajo, toIsoDate(siguiente), toIsoDate(addDays(siguiente, 6)));
      // Un pedido por horario, con todas sus fechas (el back carga el mismo horario en varias fechas)
      const porHorario = new Map<string, string[]>();
      let salteados = 0;
      for (const h of horarios) {
        const fecha = toIsoDate(addDays(fromIsoDate(h.fecha), 7));
        if (!editable(fecha) || seSuperpone(yaCargados, fecha, toMinutes(h.horarioInicio), toMinutes(h.horarioFin))) {
          salteados++;
          continue;
        }
        const key = `${h.horarioInicio}-${h.horarioFin}`;
        porHorario.set(key, [...(porHorario.get(key) ?? []), fecha]);
      }
      if (porHorario.size === 0) {
        Alert.alert('Nada para copiar', 'La semana siguiente ya tiene esos horarios cargados o queda fuera de los 60 días.');
        return;
      }
      for (const [key, fechasDelHorario] of porHorario) {
        const [desde, hasta] = key.split('-');
        await createAvailabilityRequest(token, legajo, fechasDelHorario, desde, hasta);
      }
      if (salteados > 0) {
        Alert.alert('Semana copiada', `Se saltearon ${salteados} horarios que ya estaban cargados o quedaban fuera de los 60 días.`);
      }
      irASemana(siguiente);
    } catch (err) {
      setFormError(errorMessage(err));
      load();
    } finally {
      setIsCopying(false);
    }
  };

  const confirmDelete = (horario: Disponibilidad) => {
    Alert.alert(
      'Quitar horario',
      `¿Querés quitar el horario de ${horario.horarioInicio} a ${horario.horarioFin} del ${formatFechaCorta(horario.fecha)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, quitar',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(horario.id);
            try {
              await deleteAvailabilityRequest(token, legajo, horario.id);
              setHorarios((prev) => prev.filter((item) => item.id !== horario.id));
            } catch (err) {
              // 409: hay turnos en ese horario
              Alert.alert('No se pudo quitar', errorMessage(err));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen edges={[]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.violet]} />}
      >
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => irASemana(addDays(semana, -7))}
            hitSlop={spacing.sm}
            style={styles.arrow}
            accessibilityRole="button"
            accessibilityLabel="Semana anterior"
          >
            <Ionicons name="chevron-back" size={24} color={colors.violet} />
          </Pressable>
          <Text style={styles.weekTitle}>{capitalize(formatWeek(semana))}</Text>
          <Pressable
            onPress={() => irASemana(addDays(semana, 7))}
            disabled={!hayMasAdelante}
            hitSlop={spacing.sm}
            style={[styles.arrow, !hayMasAdelante && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Semana siguiente"
          >
            <Ionicons name="chevron-forward" size={24} color={colors.violet} />
          </Pressable>
        </View>

        <View style={styles.buttonsRow}>
          <Chip label="Hoy" selected={esEstaSemana} onPress={() => irASemana(startOfWeek(new Date()))} />
          <Chip
            label={isCopying ? 'Copiando…' : 'Copiar a la próxima semana'}
            onPress={copiarALaSiguiente}
            disabled={isCopying || horarios.length === 0 || !hayMasAdelante}
            style={styles.flex}
          />
        </View>

        {/* La semana día por día: sus horarios o "Libre" */}
        <View style={styles.week}>
          {isLoading ? (
            <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando horarios" />
          ) : loadError ? (
            <View style={styles.gap}>
              <FormMessage message={loadError} />
              <Button variant="secundario" onPress={refresh}>
                Reintentar
              </Button>
            </View>
          ) : (
            fechasSemana.map((fecha) => {
              const delDia = horarios.filter((h) => h.fecha === fecha);
              const pasado = fecha < hoy;
              return (
                <View key={fecha} style={[styles.day, pasado && styles.past]}>
                  <Text style={[styles.dayTitle, fecha === hoy && styles.today]}>
                    {fecha === hoy ? 'Hoy' : capitalize(formatFechaCorta(fecha))}
                  </Text>
                  <View style={styles.ranges}>
                    {delDia.length === 0 ? (
                      <Text style={styles.free}>Libre</Text>
                    ) : (
                      delDia.map((horario) => (
                        <View key={horario.id} style={styles.range}>
                          <Text style={styles.rangeText}>
                            {horario.horarioInicio} a {horario.horarioFin} h
                          </Text>
                          {pasado ? null : deletingId === horario.id ? (
                            <ActivityIndicator color={colors.violet} />
                          ) : (
                            <Pressable
                              onPress={() => confirmDelete(horario)}
                              hitSlop={spacing.sm}
                              accessibilityRole="button"
                              accessibilityLabel={`Quitar horario del ${formatFechaCorta(fecha)} de ${horario.horarioInicio} a ${horario.horarioFin}`}
                            >
                              <Ionicons name="trash-outline" size={20} color={colors.grey} />
                            </Pressable>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cargar horario en esta semana</Text>
          <Text style={styles.hint}>Los días sin horario son tus días libres: nadie puede reservarte.</Text>

          <Section title="Días">
            <View style={styles.wrap}>
              {DIAS.map(({ day, label }) => (
                <Chip key={day} label={label} selected={dias.includes(day)} onPress={() => toggleDia(day)} />
              ))}
            </View>
          </Section>

          <Section title="Horario">
            <View style={styles.steppers}>
              <HoraStepper label="Desde" value={inicio} onChange={setInicio} />
              <HoraStepper label="Hasta" value={fin} onChange={setFin} />
            </View>
          </Section>

          {salteadas > 0 && (
            <Text style={styles.summary}>
              Se saltean {salteadas} {salteadas === 1 ? 'día que ya tiene' : 'días que ya tienen'} un horario que se superpone.
            </Text>
          )}

          {formError !== '' && <FormMessage message={formError} />}

          <Button onPress={save} isLoading={isSaving}>
            Guardar horario
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  container: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  arrow: {
    padding: spacing.sm,
  },
  weekTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  week: {
    marginBottom: spacing.sm,
  },
  day: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  past: {
    opacity: 0.5,
  },
  dayTitle: {
    width: 96,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
    paddingTop: 2,
  },
  today: {
    color: colors.violet,
  },
  ranges: {
    flex: 1,
    gap: spacing.sm,
  },
  range: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  free: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.greyLight,
    paddingTop: 2,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  steppers: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepper: {
    flex: 1,
    gap: spacing.xs,
  },
  stepperLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  stepperButton: {
    padding: spacing.sm + 4,
  },
  stepperValue: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
  summary: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.violet,
    lineHeight: 20,
  },
  loading: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  gap: {
    gap: spacing.md,
  },
});
