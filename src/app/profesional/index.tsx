import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import {
  MAX_DIAS_ANTICIPACION,
  acceptTurnoRequest,
  addDays,
  cancelTurnoRequest,
  completeTurnoRequest,
  formatFechaCorta,
  formatFechaLarga,
  formatWeek,
  getAgendaRequest,
  getPendientesRequest,
  markAbsentRequest,
  minutosHastaInicio,
  rejectTurnoRequest,
  startOfWeek,
  toIsoDate,
  yaTermino,
} from '@/api/turnos';
import type { Turno } from '@/api/turnos';
import { AgendaTurnoCard } from '@/components/agendaTurnoCard/agendaTurnoCard';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Greeting } from '@/components/greeting/greeting';
import { OptionsSheet } from '@/components/optionsSheet/optionsSheet';
import type { SheetOption } from '@/components/optionsSheet/optionsSheet';
import { ReasonModal } from '@/components/reasonModal/reasonModal';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Mientras la agenda está abierta se vuelve a pedir cada minuto: así aparecen las solicitudes
// y cancelaciones nuevas sin tocar nada (hasta tener notificaciones push, PWA-187)
const REFRESCO_MS = 60_000;

const ACTIVOS = ['PENDIENTE', 'CONFIRMADO', 'REPROGRAMADO'];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type MotivoPedido = { tipo: 'rechazar' | 'cancelar'; turno: Turno };

// F03/F07: agenda del profesional. Arriba, las solicitudes pendientes (aceptar o rechazar);
// abajo, la semana día por día con las acciones de cada turno (reprogramar, cancelar, completar, marcar ausente).
// "Nuevo turno" carga un turno a nombre de un cliente; desde un turno confirmado se crea una serie (F05)
export default function Agenda() {
  const { user, token } = useAuth();
  const legajo = user?.profesional?.legajo;
  const navigation = useNavigation();

  const hoy = toIsoDate(new Date());
  const [semana, setSemana] = useState(() => startOfWeek(new Date()));
  const [dia, setDia] = useState(hoy);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pendientes, setPendientes] = useState<Turno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Turno con una acción en curso
  const [busyId, setBusyId] = useState<number | null>(null);
  const [opcionesDe, setOpcionesDe] = useState<Turno | null>(null);
  const [motivoPedido, setMotivoPedido] = useState<MotivoPedido | null>(null);

  const load = useCallback(async () => {
    if (!token || !legajo) return;
    try {
      const [deLaSemana, solicitudes] = await Promise.all([
        getAgendaRequest(token, legajo, toIsoDate(semana), toIsoDate(addDays(semana, 6))),
        getPendientesRequest(token, legajo),
      ]);
      setTurnos(deLaSemana);
      setPendientes(solicitudes);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, legajo, semana]);

  // Al entrar (por ejemplo, al volver de reprogramar) y después cada minuto
  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, REFRESCO_MS);
      return () => clearInterval(interval);
    }, [load]),
  );

  // Contador de solicitudes en la pestaña
  useEffect(() => {
    navigation.setOptions({ tabBarBadge: pendientes.length > 0 ? pendientes.length : undefined });
  }, [navigation, pendientes.length]);

  if (!token || !legajo) {
    return (
      <Screen edges={[]}>
        <FormMessage message="Tu usuario no tiene legajo de profesional. Consultá con el administrador del salón." />
      </Screen>
    );
  }

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const cambiarSemana = (lunes: Date, diaElegido: string) => {
    setSemana(lunes);
    setDia(diaElegido);
    setTurnos([]);
    setIsLoading(true);
  };

  const run = async (turno: Turno, request: () => Promise<Turno>, failTitle: string) => {
    setBusyId(turno.id);
    try {
      const updated = await request();
      setTurnos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setPendientes((prev) => prev.filter((item) => item.id !== updated.id || updated.estado === 'PENDIENTE'));
      return true;
    } catch (err) {
      Alert.alert(failTitle, errorMessage(err));
      // Puede haber cambiado algo (por ejemplo, el cliente canceló mientras tanto): se refresca
      load();
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const aceptar = (turno: Turno) => run(turno, () => acceptTurnoRequest(token, turno.id), 'No se pudo aceptar');

  const confirmarMotivo = async (motivo: string) => {
    if (!motivoPedido) return;
    const { tipo, turno } = motivoPedido;
    const ok =
      tipo === 'rechazar'
        ? await run(turno, () => rejectTurnoRequest(token, turno.id, motivo), 'No se pudo rechazar')
        : await run(turno, () => cancelTurnoRequest(token, turno.id, motivo), 'No se pudo cancelar');
    if (ok) setMotivoPedido(null);
  };

  const completar = (turno: Turno) => {
    Alert.alert('Completar turno', `¿Terminaste el turno de ${turno.cliente.nombre} ${turno.cliente.apellido}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, completar', onPress: () => run(turno, () => completeTurnoRequest(token, turno.id), 'No se pudo completar') },
    ]);
  };

  const marcarAusente = (turno: Turno) => {
    Alert.alert('Marcar ausente', `¿${turno.cliente.nombre} ${turno.cliente.apellido} no vino al turno?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, no vino', style: 'destructive', onPress: () => run(turno, () => markAbsentRequest(token, turno.id), 'No se pudo marcar') },
    ]);
  };

  // F08: la ficha es por servicio; se abre la del servicio de este profesional en el turno
  const fichaTecnica = (turno: Turno) => {
    const detalle = turno.detalles.find((item) => item.legajo === legajo);
    if (!detalle) return;
    router.push({
      pathname: '/ficha/[turnoId]',
      params: {
        turnoId: String(turno.id),
        detalleId: String(detalle.id),
        // Vacío si todavía no tiene ficha (la agenda se recarga al volver, así llega la recién creada)
        fichaId: detalle.fichaId ? String(detalle.fichaId) : '',
        cliente: `${turno.cliente.nombre} ${turno.cliente.apellido}`,
        alergia: turno.cliente.alergia ?? '',
        servicio: detalle.servicio,
        fecha: turno.fecha,
        estado: turno.estado,
      },
    });
  };

  // F05: repetir el servicio de este profesional en el turno, cada tantos días
  const crearSerie = (turno: Turno) => {
    const detalle = turno.detalles.find((item) => item.legajo === legajo);
    if (!detalle) return;
    router.push({
      pathname: '/serie-nueva',
      params: {
        turnoId: String(turno.id),
        detalleId: String(detalle.id),
        cliente: `${turno.cliente.nombre} ${turno.cliente.apellido}`,
        servicio: detalle.servicio,
        fecha: turno.fecha,
        horaInicio: detalle.horaInicio,
      },
    });
  };

  const historial = (turno: Turno) =>
    router.push({
      pathname: '/historial/[clienteId]',
      params: { clienteId: String(turno.cliente.id), cliente: `${turno.cliente.nombre} ${turno.cliente.apellido}` },
    });

  const reprogramar = (turno: Turno) =>
    router.push({
      pathname: '/reprogramar/[turnoId]',
      params: {
        turnoId: String(turno.id),
        fecha: turno.fecha,
        horaInicio: turno.horaInicio,
        cliente: `${turno.cliente.nombre} ${turno.cliente.apellido}`,
        servicios: turno.detalles.map((detalle) => detalle.servicio).join(', '),
        items: JSON.stringify(turno.detalles.map(({ servicioId, legajo: legajoDetalle }) => ({ servicioId, legajo: legajoDetalle }))),
      },
    });

  // Lo que se puede hacer con cada turno (mismas reglas que el back)
  const opciones = (turno: Turno): SheetOption[] => {
    const terminado = yaTermino(turno);
    const list: SheetOption[] = [];
    // Se carga con el turno confirmado desde que empieza (registra lo que se hizo); completado, se ve (ya cerrada)
    if (['CONFIRMADO', 'COMPLETADO'].includes(turno.estado) && turno.detalles.some((item) => item.legajo === legajo)) {
      const noEmpezo = turno.estado === 'CONFIRMADO' && minutosHastaInicio(turno) > 0;
      list.push({
        label: 'Ficha técnica',
        icon: 'clipboard-outline',
        disabled: noEmpezo,
        hint: noEmpezo ? `Se carga desde que empieza el turno (${turno.horaInicio} h)` : undefined,
        onPress: () => fichaTecnica(turno),
      });
    }
    list.push({ label: 'Historial capilar', icon: 'time-outline', onPress: () => historial(turno) });
    // Las series salen de un turno confirmado (el back avisa si ya es parte de una)
    if (turno.estado === 'CONFIRMADO' && turno.detalles.some((item) => item.legajo === legajo)) {
      list.push({ label: 'Crear serie', icon: 'repeat-outline', onPress: () => crearSerie(turno) });
    }
    if (turno.estado === 'PENDIENTE') {
      list.push({ label: 'Aceptar solicitud', icon: 'checkmark-circle-outline', onPress: () => aceptar(turno) });
    }
    if (turno.estado === 'CONFIRMADO' && minutosHastaInicio(turno) <= 0) {
      list.push({ label: 'Marcar como completado', icon: 'checkmark-done-outline', onPress: () => completar(turno) });
    }
    // Desde la hora de fin, igual que el back
    if (turno.estado === 'CONFIRMADO' && terminado) {
      list.push({ label: 'Marcar ausente', icon: 'person-remove-outline', destructive: true, onPress: () => marcarAusente(turno) });
    }
    if (ACTIVOS.includes(turno.estado) && !terminado) {
      list.push({
        label: turno.estado === 'PENDIENTE' ? 'Proponer otro horario' : 'Reprogramar',
        icon: 'calendar-outline',
        onPress: () => reprogramar(turno),
      });
    }
    if (turno.estado === 'PENDIENTE') {
      list.push({
        label: 'Rechazar solicitud',
        icon: 'close-circle-outline',
        destructive: true,
        onPress: () => setMotivoPedido({ tipo: 'rechazar', turno }),
      });
    } else if (ACTIVOS.includes(turno.estado)) {
      list.push({
        label: 'Cancelar turno',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => setMotivoPedido({ tipo: 'cancelar', turno }),
      });
    }
    return list;
  };

  const dias = Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(semana, i)));
  const delDia = turnos.filter((turno) => turno.fecha === dia);
  const activosPorDia = (fecha: string) => turnos.filter((turno) => turno.fecha === fecha && ACTIVOS.includes(turno.estado)).length;
  // Se puede avanzar hasta donde se puede reservar (60 días)
  const hayMasAdelante = toIsoDate(addDays(semana, 7)) <= toIsoDate(addDays(new Date(), MAX_DIAS_ANTICIPACION));
  const esEstaSemana = toIsoDate(semana) === toIsoDate(startOfWeek(new Date()));

  return (
    <Screen edges={[]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.violet]} />}
      >
        <Greeting subtitle="Esta es tu agenda" />
        <Button onPress={() => router.push('/nuevo-turno')}>Nuevo turno para un cliente</Button>
        <Button variant="secundario" onPress={() => router.push('/series')}>
          Mis series de turnos
        </Button>

        {error !== '' && (
          <View style={styles.gap}>
            <FormMessage message={error} />
            <Button variant="secundario" onPress={refresh}>
              Reintentar
            </Button>
          </View>
        )}

        {pendientes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Solicitudes pendientes <Text style={styles.count}>({pendientes.length})</Text>
            </Text>
            <Text style={styles.hint}>Los clientes esperan tu respuesta para que su turno quede confirmado.</Text>
            {pendientes.map((turno) => (
              <AgendaTurnoCard key={turno.id} turno={turno} showFecha>
                <Button onPress={() => aceptar(turno)} isLoading={busyId === turno.id}>
                  Aceptar
                </Button>
                <View style={styles.buttonsRow}>
                  <Button variant="grey" style={styles.flex} onPress={() => setMotivoPedido({ tipo: 'rechazar', turno })} disabled={busyId === turno.id}>
                    Rechazar
                  </Button>
                  <Button variant="secundario" style={styles.flex} onPress={() => reprogramar(turno)} disabled={busyId === turno.id}>
                    Otro horario
                  </Button>
                </View>
              </AgendaTurnoCard>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.weekNav}>
            <Pressable
              onPress={() => cambiarSemana(addDays(semana, -7), toIsoDate(addDays(semana, -7)))}
              hitSlop={spacing.sm}
              style={styles.arrow}
              accessibilityRole="button"
              accessibilityLabel="Semana anterior"
            >
              <Ionicons name="chevron-back" size={24} color={colors.violet} />
            </Pressable>
            <Text style={styles.weekTitle}>{capitalize(formatWeek(semana))}</Text>
            <Pressable
              onPress={() => cambiarSemana(addDays(semana, 7), toIsoDate(addDays(semana, 7)))}
              disabled={!hayMasAdelante}
              hitSlop={spacing.sm}
              style={[styles.arrow, !hayMasAdelante && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel="Semana siguiente"
            >
              <Ionicons name="chevron-forward" size={24} color={colors.violet} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {!esEstaSemana && <Chip label="Volver a hoy" onPress={() => cambiarSemana(startOfWeek(new Date()), hoy)} />}
            {dias.map((fecha) => {
              const cantidad = activosPorDia(fecha);
              const label = `${fecha === hoy ? 'Hoy' : formatFechaCorta(fecha)}${cantidad > 0 ? ` · ${cantidad}` : ''}`;
              return (
                <Chip
                  key={fecha}
                  label={label}
                  selected={fecha === dia}
                  onPress={() => setDia(fecha)}
                  accessibilityLabel={`${formatFechaLarga(fecha)}, ${cantidad} ${cantidad === 1 ? 'turno' : 'turnos'}`}
                />
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>{dia === hoy ? 'Hoy' : capitalize(formatFechaLarga(dia))}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando agenda" />
          ) : delDia.length === 0 ? (
            <Text style={styles.hint}>No tenés turnos este día.</Text>
          ) : (
            delDia.map((turno) => {
              const acciones = opciones(turno);
              return (
                <AgendaTurnoCard key={turno.id} turno={turno}>
                  {acciones.length > 0 && (
                    <Button variant="secundario" onPress={() => setOpcionesDe(turno)} isLoading={busyId === turno.id}>
                      Gestionar turno
                    </Button>
                  )}
                </AgendaTurnoCard>
              );
            })
          )}
        </View>
      </ScrollView>

      <OptionsSheet
        visible={opcionesDe !== null}
        title={opcionesDe ? `${opcionesDe.cliente.nombre} ${opcionesDe.cliente.apellido} · ${opcionesDe.horaInicio} h` : undefined}
        options={opcionesDe ? opciones(opcionesDe) : []}
        onClose={() => setOpcionesDe(null)}
      />

      <ReasonModal
        visible={motivoPedido !== null}
        title={motivoPedido?.tipo === 'rechazar' ? 'Rechazar solicitud' : 'Cancelar turno'}
        description={
          motivoPedido?.tipo === 'rechazar'
            ? 'El motivo queda para el salón: al cliente le llega un aviso amable invitándolo a elegir otro horario.'
            : 'Le avisamos al cliente por mail con este motivo, y el horario queda libre.'
        }
        confirmLabel={motivoPedido?.tipo === 'rechazar' ? 'Rechazar' : 'Cancelar turno'}
        isLoading={motivoPedido !== null && busyId === motivoPedido.turno.id}
        onConfirm={confirmarMotivo}
        onClose={() => setMotivoPedido(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  container: {
    gap: spacing.lg,
    padding: spacing.md,
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
  count: {
    color: colors.violet,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  gap: {
    gap: spacing.md,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
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
  disabled: {
    opacity: 0.3,
  },
  weekTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  row: {
    gap: spacing.sm,
  },
  loading: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
});
