import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { getMyServicesRequest, getUpcomingWorkDatesRequest } from '@/api/professionals';
import { formatServiceDuration } from '@/api/services';
import type { Servicio } from '@/api/services';
import { createTurnoRequest, formatFechaCorta, formatFechaLarga, getHorariosLibresRequest, toIsoDate } from '@/api/turnos';
import { searchClientesRequest } from '@/api/users';
import type { ClienteResumen } from '@/api/users';
import { Button } from '@/components/button/button';
import { Chip } from '@/components/chip/chip';
import { HorarioGrid } from '@/components/horarioGrid/horarioGrid';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Se busca desde 2 letras y cuando se deja de escribir un momento
const MIN_BUSQUEDA = 2;
const ESPERA_BUSQUEDA_MS = 400;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

// Datos del cliente, con su alergia en rojo (importante para los servicios con químicos)
const ClienteInfo = ({ cliente }: { cliente: ClienteResumen }) => (
  <View style={styles.clienteInfo}>
    <Text style={styles.clienteNombre}>
      {cliente.nombre} {cliente.apellido}
    </Text>
    <Text style={styles.clienteDato}>{cliente.email}</Text>
    {cliente.telefono ? <Text style={styles.clienteDato}>{cliente.telefono}</Text> : null}
    {cliente.cliente?.alergia ? <Text style={styles.alergia}>Alergia: {cliente.cliente.alergia}</Text> : null}
  </View>
);

// F03: el profesional carga un turno a nombre de un cliente (pidió por teléfono o vino al salón).
// Se elige cliente, servicio (uno por turno), día y horario libre; el turno nace CONFIRMADO
export default function NuevoTurno() {
  const { user, token } = useAuth();
  const legajo = user?.profesional?.legajo;

  const [busqueda, setBusqueda] = useState('');
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cliente, setCliente] = useState<ClienteResumen | null>(null);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioId, setServicioId] = useState<number | null>(null);
  const [fechas, setFechas] = useState<string[]>([]);
  const [fecha, setFecha] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [hora, setHora] = useState<string | null>(null);

  const [isLoadingDatos, setIsLoadingDatos] = useState(true);
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [horariosVersion, setHorariosVersion] = useState(0);

  // Servicios que hace y días que trabaja (de hoy a 60): no dependen del cliente
  useEffect(() => {
    if (!token || !legajo) return;
    let cancelled = false;
    Promise.all([getMyServicesRequest(token), getUpcomingWorkDatesRequest(token, legajo)])
      .then(([misServicios, dates]) => {
        if (cancelled) return;
        setServicios(misServicios);
        if (misServicios.length === 1) setServicioId(misServicios[0].id);
        const today = toIsoDate(new Date());
        const upcoming = dates.filter((date) => date >= today).sort();
        setFechas(upcoming);
        setFecha(upcoming[0] ?? null);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingDatos(false));
    return () => {
      cancelled = true;
    };
  }, [token, legajo]);

  // Búsqueda de clientes mientras se escribe
  useEffect(() => {
    const texto = busqueda.trim();
    if (!token || cliente || texto.length < MIN_BUSQUEDA) {
      setClientes([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchClientesRequest(token, texto)
        .then((result) => !cancelled && setClientes(result))
        .catch((err) => !cancelled && setError(errorMessage(err)))
        .finally(() => !cancelled && setIsSearching(false));
    }, ESPERA_BUSQUEDA_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, busqueda, cliente]);

  // Horarios libres para ese cliente: descarta también los que ya tiene ocupados con otro turno
  useEffect(() => {
    if (!token || !legajo || !cliente || servicioId === null || !fecha) return;
    let cancelled = false;
    setHora(null);
    setHorarios([]);
    setIsLoadingHorarios(true);
    getHorariosLibresRequest(token, fecha, [{ servicioId, legajo }], { clienteId: cliente.id })
      .then((result) => !cancelled && setHorarios(result.horarios))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setIsLoadingHorarios(false));
    return () => {
      cancelled = true;
    };
  }, [token, legajo, cliente, servicioId, fecha, horariosVersion]);

  if (!user || !token) return <Redirect href="/" />;
  if (!legajo) {
    return (
      <Screen edges={['bottom']}>
        <FormMessage message="Tu usuario no tiene legajo de profesional. Consultá con el administrador del salón." />
      </Screen>
    );
  }

  const servicio = servicios.find((item) => item.id === servicioId);

  const cambiarCliente = () => {
    setCliente(null);
    setHora(null);
    setError('');
  };

  const save = async () => {
    if (!cliente || servicioId === null || !fecha || !hora) return;
    setError('');
    setIsSaving(true);
    try {
      await createTurnoRequest(token, { fecha, horaInicio: hora, items: [{ servicioId, legajo }], clienteId: cliente.id });
      Alert.alert(
        'Turno cargado',
        `${cliente.nombre} ${cliente.apellido} tiene turno confirmado el ${formatFechaLarga(fecha)} a las ${hora} h. Le avisamos por mail.`,
        [{ text: 'Volver a la agenda', onPress: () => router.back() }],
      );
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
      <Section title="¿Para quién?">
        {cliente ? (
          <View style={styles.selected}>
            <ClienteInfo cliente={cliente} />
            <Pressable onPress={cambiarCliente} hitSlop={spacing.sm} accessibilityRole="button">
              <Text style={styles.link}>Cambiar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextField
              label="Buscar cliente"
              placeholder="Nombre, apellido, email o teléfono"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              autoCorrect={false}
              hint="El cliente tiene que tener cuenta en CapiLAR."
            />
            {isSearching ? (
              <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Buscando clientes" />
            ) : busqueda.trim().length >= MIN_BUSQUEDA && clientes.length === 0 ? (
              <Text style={styles.hint}>No encontramos clientes con "{busqueda.trim()}".</Text>
            ) : (
              clientes.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setCliente(item)}
                  style={({ pressed }) => [styles.result, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Elegir a ${item.nombre} ${item.apellido}`}
                >
                  <ClienteInfo cliente={item} />
                  <Ionicons name="chevron-forward" size={20} color={colors.violet} />
                </Pressable>
              ))
            )}
          </>
        )}
      </Section>

      {cliente &&
        (isLoadingDatos ? (
          <ActivityIndicator color={colors.violet} style={styles.loading} />
        ) : (
          <>
            <Section title="¿Qué servicio?">
              {servicios.length === 0 ? (
                <Text style={styles.hint}>Todavía no elegiste tus servicios. Hacelo desde "Mi perfil".</Text>
              ) : (
                <View style={styles.wrap}>
                  {servicios.map((item) => (
                    <Chip key={item.id} label={item.tipo} selected={item.id === servicioId} onPress={() => setServicioId(item.id)} />
                  ))}
                </View>
              )}
              {servicio && <Text style={styles.hint}>Duración: {formatServiceDuration(servicio.tiempoDuracion)}</Text>}
            </Section>

            {servicioId !== null && (
              <Section title="¿Qué día?">
                {fechas.length === 0 ? (
                  <Text style={styles.hint}>No tenés días cargados en los próximos 60 días. Cargalos en "Mis horarios".</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {fechas.map((item) => (
                      <Chip key={item} label={formatFechaCorta(item)} selected={item === fecha} onPress={() => setFecha(item)} />
                    ))}
                  </ScrollView>
                )}
              </Section>
            )}

            {servicioId !== null && fecha && (
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
          </>
        ))}

      {cliente && servicio && fecha && hora && (
        <Text style={styles.note}>
          {servicio.tipo} para {cliente.nombre} {cliente.apellido}, el {formatFechaLarga(fecha)} a las {hora} h. Queda confirmado y le
          avisamos por mail.
        </Text>
      )}

      {error !== '' && <FormMessage message={error} />}

      {hora && (
        <Button onPress={save} isLoading={isSaving}>
          Cargar turno
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
  loading: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.violet,
    backgroundColor: colors.white,
  },
  clienteInfo: {
    flex: 1,
    gap: 2,
  },
  clienteNombre: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  clienteDato: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  alergia: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  link: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.violet,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
});
