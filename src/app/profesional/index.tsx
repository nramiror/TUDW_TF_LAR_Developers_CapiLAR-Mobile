import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatAlergias } from '@/api/alergias';
import { formatEnvases } from '@/api/articulos';
import { ApiError } from '@/api/client';
import {
  FILTROS_ESTADO,
  acceptTurnoRequest,
  addDays,
  addMonths,
  cancelTurnoRequest,
  completeTurnoRequest,
  formatFechaLarga,
  formatMonth,
  formatWeek,
  fromIsoDate,
  getAgendaRangoRequest,
  getPendientesRequest,
  markAbsentRequest,
  minutosHastaInicio,
  rejectTurnoRequest,
  startOfMonth,
  startOfWeek,
  toIsoDate,
  yaTermino,
} from '@/api/turnos';
import type { CompletarTurnoData, FiltroEstado, Turno } from '@/api/turnos';
import { ActionGrid } from '@/components/actionTile/actionTile';
import { AgendaTurnoCard } from '@/components/agendaTurnoCard/agendaTurnoCard';
import { Button } from '@/components/button/button';
import { CompletarModal } from '@/components/completarModal/completarModal';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Greeting } from '@/components/greeting/greeting';
import { OptionsSheet } from '@/components/optionsSheet/optionsSheet';
import type { SheetOption } from '@/components/optionsSheet/optionsSheet';
import { ReasonModal } from '@/components/reasonModal/reasonModal';
import { Screen } from '@/components/screen/screen';
import { SelectField } from '@/components/selectField/selectField';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { fechaToIso, maskFecha } from '@/utils/validation';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// En la vista Hoy la agenda se vuelve a pedir cada minuto: así aparecen las solicitudes
// y cancelaciones nuevas sin tocar nada (hasta tener notificaciones push, PWA-187). Igual que la web
const REFRESCO_MS = 60_000;

// Rango más largo que se puede pedir, como en la web (se pide de a 31 días: son hasta 12 pedidos)
const MAX_DIAS_RANGO = 365;

const ACTIVOS = ['PENDIENTE', 'CONFIRMADO', 'REPROGRAMADO'];
const esCancelado = (turno: Turno) => turno.estado === 'CANCELADO' || turno.estado === 'RECHAZADO';

// Filtro por fecha, mismas opciones que la web (Hoy por defecto)
type FiltroFecha = 'hoy' | 'semana' | 'mes' | 'rango';
const FILTROS_FECHA: { value: FiltroFecha; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'rango', label: 'Rango' },
];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Por día y hora, con los cancelados y rechazados siempre al final de cada día (pedido de Andrea)
const porFechaYHora = (a: Turno, b: Turno) =>
  a.fecha.localeCompare(b.fecha) || Number(esCancelado(a)) - Number(esCancelado(b)) || a.horaInicio.localeCompare(b.horaInicio);

type MotivoPedido = { tipo: 'rechazar' | 'cancelar'; turno: Turno };

// Flechas para pasar de semana o de mes
const PeriodNav = ({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) => (
  <View style={styles.periodNav}>
    <Pressable onPress={onPrev} hitSlop={spacing.sm} style={styles.arrow} accessibilityRole="button" accessibilityLabel="Anterior">
      <Ionicons name="chevron-back" size={22} color={colors.violet} />
    </Pressable>
    <Text style={styles.periodLabel}>{label}</Text>
    <Pressable onPress={onNext} hitSlop={spacing.sm} style={styles.arrow} accessibilityRole="button" accessibilityLabel="Siguiente">
      <Ionicons name="chevron-forward" size={22} color={colors.violet} />
    </Pressable>
  </View>
);

// Contador del encabezado de cada día (violeta clarito los turnos, gris los cancelados)
const Count = ({ value, muted = false, label }: { value: number; muted?: boolean; label: string }) => (
  <View style={[styles.count, muted && styles.countMuted]} accessibilityLabel={`${value} ${label}`}>
    <Text style={[styles.countText, muted && styles.countTextMuted]}>{value}</Text>
  </View>
);

// F03/F07: agenda del profesional, como la web (pedido de Linda tras la demo del 75%). Arriba, los atajos y las
// solicitudes pendientes; después los filtros por fecha (Hoy, Semana, Mes, Rango) y por estado, y los turnos de cada día
// en un desplegable. Cada turno muestra su estado abajo y, al lado, la acción principal (Confirmar, Completar) y "Opciones"
export default function Agenda() {
  const { user, token } = useAuth();
  const legajo = user?.profesional?.legajo;
  const navigation = useNavigation();

  const hoy = toIsoDate(new Date());
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('hoy');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [semana, setSemana] = useState(() => startOfWeek(new Date()));
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  // Rango ya aplicado ("YYYY-MM-DD") y lo que se está escribiendo ("DD/MM/AAAA")
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null);
  const [rangoTexto, setRangoTexto] = useState({ desde: '', hasta: '' });
  const [rangoError, setRangoError] = useState('');

  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pendientes, setPendientes] = useState<Turno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Días desplegados o plegados a mano (si no, se usa el valor por defecto)
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  // Turno con una acción en curso
  const [busyId, setBusyId] = useState<number | null>(null);
  const [opcionesDe, setOpcionesDe] = useState<Turno | null>(null);
  const [motivoPedido, setMotivoPedido] = useState<MotivoPedido | null>(null);
  // Turno que se está completando (modal con lo cobrado)
  const [completando, setCompletando] = useState<Turno | null>(null);

  // Fechas que se piden según el filtro (el rango, recién cuando se aplica)
  const periodos: Record<FiltroFecha, [string, string] | null> = {
    hoy: [hoy, hoy],
    semana: [toIsoDate(semana), toIsoDate(addDays(semana, 6))],
    mes: [toIsoDate(mes), toIsoDate(addDays(addMonths(mes, 1), -1))],
    rango: rango ? [rango.desde, rango.hasta] : null,
  };
  const periodo = periodos[filtroFecha];
  const desde = periodo?.[0];
  const hasta = periodo?.[1];

  const load = useCallback(async () => {
    if (!token || !legajo) return;
    try {
      const [delPeriodo, solicitudes] = await Promise.all([
        desde && hasta ? getAgendaRangoRequest(token, legajo, desde, hasta) : Promise.resolve([]),
        getPendientesRequest(token, legajo),
      ]);
      setTurnos(delPeriodo);
      setPendientes(solicitudes);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, legajo, desde, hasta]);

  // Al entrar (por ejemplo, al volver de reprogramar) o al cambiar el período; en Hoy, también cada minuto
  useFocusEffect(
    useCallback(() => {
      load();
      if (filtroFecha !== 'hoy') return;
      const interval = setInterval(load, REFRESCO_MS);
      return () => clearInterval(interval);
    }, [load, filtroFecha]),
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

  // Cambia lo que se pide: se muestra cargando y los días vuelven a su estado por defecto
  const cambiarPeriodo = (cambio: () => void) => {
    cambio();
    setTurnos([]);
    setAbiertos({});
    setIsLoading(true);
  };

  const elegirFiltroFecha = (value: FiltroFecha) => {
    if (value === filtroFecha) return;
    cambiarPeriodo(() => setFiltroFecha(value));
    // El rango sin aplicar no pide nada
    if (value === 'rango' && !rango) setIsLoading(false);
  };

  const aplicarRango = () => {
    const desdeIso = fechaToIso(rangoTexto.desde);
    const hastaIso = fechaToIso(rangoTexto.hasta);
    if (!desdeIso || !hastaIso) {
      setRangoError('Ingresá las dos fechas (DD/MM/AAAA).');
      return;
    }
    if (desdeIso > hastaIso) {
      setRangoError('"Desde" tiene que ser antes que "Hasta".');
      return;
    }
    if (hastaIso > toIsoDate(addDays(fromIsoDate(desdeIso), MAX_DIAS_RANGO))) {
      setRangoError('Elegí un rango de hasta un año.');
      return;
    }
    setRangoError('');
    cambiarPeriodo(() => setRango({ desde: desdeIso, hasta: hastaIso }));
  };

  const conFiltros = filtroFecha !== 'hoy' || filtroEstado !== 'todos';
  const limpiarFiltros = () => {
    setFiltroEstado('todos');
    setSemana(startOfWeek(new Date()));
    setMes(startOfMonth(new Date()));
    if (filtroFecha !== 'hoy') cambiarPeriodo(() => setFiltroFecha('hoy'));
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

  const aceptar = (turno: Turno) => run(turno, () => acceptTurnoRequest(token, turno.id), 'No se pudo confirmar');

  const confirmarMotivo = async (motivo: string) => {
    if (!motivoPedido) return;
    const { tipo, turno } = motivoPedido;
    const ok =
      tipo === 'rechazar'
        ? await run(turno, () => rejectTurnoRequest(token, turno.id, motivo), 'No se pudo rechazar')
        : await run(turno, () => cancelTurnoRequest(token, turno.id, motivo), 'No se pudo cancelar');
    if (ok) setMotivoPedido(null);
  };

  // F12: se abre el modal con lo cobrado y el método de pago; al confirmar se completa
  const confirmarCompletar = async (data: CompletarTurnoData) => {
    if (!completando) return;
    const turno = completando;
    let sinStock: { nombre: string; stock: string }[] = [];
    const ok = await run(
      turno,
      async () => {
        const result = await completeTurnoRequest(token, turno.id, data);
        sinStock = result.sinStock ?? [];
        return result;
      },
      'No se pudo completar',
    );
    if (!ok) return;
    setCompletando(null);
    // F11: los insumos de la ficha se descuentan igual aunque no alcance el stock, pero se avisa
    if (sinStock.length > 0) {
      Alert.alert(
        'Stock en negativo',
        `Con lo que usaste quedaron por debajo de 0:\n${sinStock.map((item) => `• ${item.nombre}: ${formatEnvases(item.stock)}`).join('\n')}\n\nRevisá si falta registrar algún ingreso en Stock.`,
      );
    }
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
        // Para precargar el diagnóstico de su última ficha
        clienteId: String(turno.cliente.id),
        cliente: `${turno.cliente.nombre} ${turno.cliente.apellido}`,
        alergia: formatAlergias(turno.cliente),
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

  // La acción que más se usa en cada estado va como botón en la tarjeta (como en la web); el resto, en "Opciones"
  const principal = (turno: Turno): { label: string; onPress: () => void } | null => {
    if (turno.estado === 'PENDIENTE') return { label: 'Confirmar', onPress: () => aceptar(turno) };
    if (turno.estado === 'CONFIRMADO' && minutosHastaInicio(turno) <= 0) return { label: 'Completar', onPress: () => setCompletando(turno) };
    return null;
  };

  // Lo demás que se puede hacer con cada turno (mismas reglas que el back)
  const opciones = (turno: Turno): SheetOption[] => {
    const terminado = yaTermino(turno);
    const propio = turno.detalles.some((item) => item.legajo === legajo);
    const list: SheetOption[] = [];
    // Se carga con el turno confirmado desde que empieza (registra lo que se hizo); completado, se ve (ya cerrada)
    if (['CONFIRMADO', 'COMPLETADO'].includes(turno.estado) && propio) {
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
    // Las series salen de un turno confirmado o completado que todavía no es de una serie (ni empezó una)
    if (['CONFIRMADO', 'COMPLETADO'].includes(turno.estado) && !turno.serieId && !turno.serieOrigenId && propio) {
      list.push({ label: 'Crear serie', icon: 'repeat-outline', onPress: () => crearSerie(turno) });
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

  const renderTurno = (turno: Turno) => {
    const accion = principal(turno);
    const busy = busyId === turno.id;
    return (
      <AgendaTurnoCard key={turno.id} turno={turno}>
        <Button variant="grey" size="sm" onPress={() => setOpcionesDe(turno)} disabled={busy}>
          Opciones
        </Button>
        {accion && (
          <Button size="sm" onPress={accion.onPress} isLoading={busy}>
            {accion.label}
          </Button>
        )}
      </AgendaTurnoCard>
    );
  };

  const estadoElegido = FILTROS_ESTADO.find((item) => item.value === filtroEstado);
  const visibles = turnos.filter((turno) => !estadoElegido?.estados || estadoElegido.estados.includes(turno.estado)).sort(porFechaYHora);

  // Turnos agrupados por día, en orden
  const porDia = new Map<string, Turno[]>();
  for (const turno of visibles) porDia.set(turno.fecha, [...(porDia.get(turno.fecha) ?? []), turno]);
  // Arranca desplegado hoy o, si el período no lo incluye, el primer día con turnos
  const diaPorDefecto = porDia.has(hoy) ? hoy : [...porDia.keys()][0];
  const estaAbierto = (fecha: string) => abiertos[fecha] ?? fecha === diaPorDefecto;

  const conEstado = filtroEstado === 'todos' ? '' : ` ${estadoElegido?.label.toLowerCase()}`;
  const vacio: Record<FiltroFecha, string> = {
    hoy: `No tenés turnos${conEstado} hoy.`,
    semana: `No tenés turnos${conEstado} esa semana.`,
    mes: `No tenés turnos${conEstado} ese mes.`,
    rango: rango ? `No tenés turnos${conEstado} entre esas fechas.` : 'Elegí desde y hasta qué día ver los turnos.',
  };

  return (
    <Screen edges={[]} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.violet]} />}
      >
        <Greeting subtitle="Esta es tu agenda" />
        <ActionGrid
          actions={[
            { label: 'Nuevo turno para un cliente', icon: 'add-circle-outline', onPress: () => router.push('/nuevo-turno') },
            { label: 'Mis series de turnos', icon: 'repeat-outline', onPress: () => router.push('/series') },
          ]}
        />

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
              Solicitudes pendientes <Text style={styles.violet}>({pendientes.length})</Text>
            </Text>
            <Text style={styles.hint}>Los clientes esperan tu respuesta para que su turno quede confirmado.</Text>
            {pendientes.map((turno) => (
              <AgendaTurnoCard key={turno.id} turno={turno} showFecha hideEstado>
                <Button variant="grey" size="sm" onPress={() => setMotivoPedido({ tipo: 'rechazar', turno })} disabled={busyId === turno.id}>
                  Rechazar
                </Button>
                <Button variant="secundario" size="sm" onPress={() => reprogramar(turno)} disabled={busyId === turno.id}>
                  Otro horario
                </Button>
                <Button size="sm" onPress={() => aceptar(turno)} isLoading={busyId === turno.id}>
                  Confirmar
                </Button>
              </AgendaTurnoCard>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Turnos</Text>

          {/* Filtros como en la web: fecha (con el paso de semana o mes, o el rango) y estado */}
          <View style={styles.filters}>
            {/* Selects en vez de pastillas (pedido de Andrea), en una sola fila como la línea de filtros de la web */}
            <View style={styles.row}>
              <SelectField label="Fecha" value={filtroFecha} options={FILTROS_FECHA} onChange={elegirFiltroFecha} style={styles.flex} />
              <SelectField label="Estado" value={filtroEstado} options={FILTROS_ESTADO} onChange={setFiltroEstado} style={styles.flex} />
            </View>

            {filtroFecha === 'hoy' && <Text style={styles.periodLabel}>{capitalize(formatFechaLarga(hoy))}</Text>}
            {filtroFecha === 'semana' && (
              <PeriodNav
                label={capitalize(formatWeek(semana))}
                onPrev={() => cambiarPeriodo(() => setSemana(addDays(semana, -7)))}
                onNext={() => cambiarPeriodo(() => setSemana(addDays(semana, 7)))}
              />
            )}
            {filtroFecha === 'mes' && (
              <PeriodNav
                label={capitalize(formatMonth(mes))}
                onPrev={() => cambiarPeriodo(() => setMes(addMonths(mes, -1)))}
                onNext={() => cambiarPeriodo(() => setMes(addMonths(mes, 1)))}
              />
            )}
            {filtroFecha === 'rango' && (
              <View style={styles.gap}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <TextField
                      label="Desde"
                      value={rangoTexto.desde}
                      onChangeText={(value) => setRangoTexto((prev) => ({ ...prev, desde: maskFecha(value) }))}
                      placeholder="DD/MM/AAAA"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                  <View style={styles.flex}>
                    <TextField
                      label="Hasta"
                      value={rangoTexto.hasta}
                      onChangeText={(value) => setRangoTexto((prev) => ({ ...prev, hasta: maskFecha(value) }))}
                      placeholder="DD/MM/AAAA"
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
                {rangoError !== '' && <FormMessage message={rangoError} />}
                {/* En una fila a la derecha: con alignSelf, el botón se quedaba sin ancho y se veía como un recuadro vacío */}
                <View style={styles.rowEnd}>
                  <Button variant="secundario" size="sm" onPress={aplicarRango}>
                    Ver turnos
                  </Button>
                </View>
              </View>
            )}

            {conFiltros && (
              <Pressable onPress={limpiarFiltros} hitSlop={spacing.sm} style={styles.clear} accessibilityRole="button">
                <Ionicons name="close" size={16} color={colors.grey} />
                <Text style={styles.clearText}>Limpiar filtros</Text>
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando agenda" />
          ) : porDia.size === 0 ? (
            <Text style={styles.empty}>{vacio[filtroFecha]}</Text>
          ) : filtroFecha === 'hoy' ? (
            visibles.map(renderTurno)
          ) : (
            [...porDia].map(([fecha, delDia]) => {
              const cancelados = delDia.filter(esCancelado).length;
              const abierto = estaAbierto(fecha);
              return (
                <View key={fecha} style={styles.day}>
                  <Pressable
                    onPress={() => setAbiertos((prev) => ({ ...prev, [fecha]: !abierto }))}
                    style={styles.dayHeader}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: abierto }}
                  >
                    <Text style={styles.dayTitle}>
                      {capitalize(formatFechaLarga(fecha))}
                      {fecha === hoy ? ' · hoy' : ''}
                    </Text>
                    <Count value={delDia.length - cancelados} label="turnos" />
                    {cancelados > 0 && <Count value={cancelados} muted label="cancelados" />}
                    <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={colors.grey} />
                  </Pressable>
                  {abierto && <View style={styles.dayList}>{delDia.map(renderTurno)}</View>}
                </View>
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

      <CompletarModal
        turno={completando}
        isLoading={completando !== null && busyId === completando.id}
        onConfirm={confirmarCompletar}
        onClose={() => setCompletando(null)}
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
  violet: {
    color: colors.violet,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  empty: {
    paddingVertical: spacing.lg,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  gap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  rowEnd: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  filters: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    padding: spacing.xs,
  },
  periodLabel: {
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  clearText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  loading: {
    paddingVertical: spacing.lg,
  },
  day: {
    gap: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayTitle: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  dayList: {
    gap: spacing.sm,
  },
  count: {
    minWidth: 24,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.violet,
  },
  countMuted: {
    backgroundColor: colors.mutedSurface,
    borderColor: colors.border,
  },
  countText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.violet,
  },
  countTextMuted: {
    color: colors.grey,
  },
});
