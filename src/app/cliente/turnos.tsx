import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import {
  acceptRescheduleRequest,
  cancelTurnoRequest,
  confirmAttendanceRequest,
  formatFechaLarga,
  getMyTurnosRequest,
  yaTermino,
} from '@/api/turnos';
import type { Turno } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TurnoCard } from '@/components/turnoCard/turnoCard';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Próximos: los que siguen en pie y no terminaron, del más cercano al más lejano.
// Historial: terminados, cancelados y rechazados, del más nuevo al más viejo (como los manda el back)
const splitTurnos = (turnos: Turno[]) => {
  const activo = (turno: Turno) => ['PENDIENTE', 'CONFIRMADO', 'REPROGRAMADO'].includes(turno.estado) && !yaTermino(turno);
  return [
    { title: 'Próximos', data: turnos.filter(activo).reverse() },
    { title: 'Historial', data: turnos.filter((turno) => !activo(turno)) },
  ].filter((section) => section.data.length > 0);
};

// F03/F04/F06: turnos del cliente, con cancelar (hasta 12 h antes si está confirmado), aceptar una reprogramación
// y confirmar asistencia (lo mismo que el botón del recordatorio, cuyo link abre la web)
export default function MisTurnos() {
  const { token } = useAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Turno con una acción en curso (cancelar, aceptar o confirmar asistencia)
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setTurnos(await getMyTurnosRequest(token));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Al entrar a la pestaña (por ejemplo, después de reservar) se vuelve a pedir la lista
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const run = async (turno: Turno, request: () => Promise<Turno>, failTitle: string) => {
    setBusyId(turno.id);
    try {
      const updated = await request();
      setTurnos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      Alert.alert(failTitle, errorMessage(err));
      // Puede haber cambiado algo del lado del salón (por ejemplo, ya pasaron las 12 h): se refresca
      load();
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = (turno: Turno) => {
    if (!token) return;
    Alert.alert('Cancelar turno', `¿Querés cancelar tu turno del ${formatFechaLarga(turno.fecha)} a las ${turno.horaInicio}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: () => run(turno, () => cancelTurnoRequest(token, turno.id), 'No se pudo cancelar'),
      },
    ]);
  };

  const acceptReschedule = (turno: Turno) => {
    if (!token) return;
    run(turno, () => acceptRescheduleRequest(token, turno.id), 'No se pudo aceptar el horario');
  };

  const confirmAttendance = (turno: Turno) => {
    if (!token) return;
    run(turno, () => confirmAttendanceRequest(token, turno.id), 'No se pudo confirmar la asistencia');
  };

  const empty = isLoading ? (
    <ActivityIndicator color={colors.violet} style={styles.loading} accessibilityLabel="Cargando turnos" />
  ) : error ? (
    <View style={styles.gap}>
      <FormMessage message={error} />
      <Button variant="secundario" onPress={refresh}>
        Reintentar
      </Button>
    </View>
  ) : (
    <View style={styles.gap}>
      <Text style={styles.hint}>Todavía no tenés turnos.</Text>
      <Button onPress={() => router.navigate('/cliente')}>Reservar turno</Button>
    </View>
  );

  return (
    <Screen edges={[]} style={styles.screen}>
      <SectionList
        sections={error && turnos.length === 0 ? [] : splitTurnos(turnos)}
        keyExtractor={(turno) => String(turno.id)}
        renderItem={({ item }) => (
          <TurnoCard
            turno={item}
            onCancel={() => confirmCancel(item)}
            onAcceptReschedule={() => acceptReschedule(item)}
            onConfirmAttendance={() => confirmAttendance(item)}
            isBusy={busyId === item.id}
          />
        )}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        ListHeaderComponent={error && turnos.length > 0 ? <FormMessage message={error} /> : null}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => <View style={styles.separator} />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[colors.violet]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.lg,
    color: colors.black,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  separator: {
    height: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  gap: {
    gap: spacing.md,
  },
});
