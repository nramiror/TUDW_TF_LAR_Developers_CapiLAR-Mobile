import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '@/api/services';
import { clientePuedeCancelar, formatFechaLarga, totalCobrado, yaTermino } from '@/api/turnos';
import type { EstadoTurno, Turno } from '@/api/turnos';
import { Button } from '@/components/button/button';
import { colors, fonts, fontSizes, gradient, radius, spacing } from '@/theme';

// Cómo ve el cliente cada estado. RECHAZADO se muestra amable, igual que el mail (el motivo no le llega)
const ESTADO: Record<EstadoTurno, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente de confirmación', color: colors.warning },
  CONFIRMADO: { label: 'Confirmado', color: colors.success },
  REPROGRAMADO: { label: 'Nuevo horario propuesto', color: colors.violet },
  COMPLETADO: { label: 'Completado', color: colors.grey },
  RECHAZADO: { label: 'No se pudo confirmar', color: colors.error },
  CANCELADO: { label: 'Cancelado', color: colors.grey },
  AUSENTE: { label: 'No asististe', color: colors.error },
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface TurnoCardProps {
  turno: Turno;
  onCancel?: () => void;
  onAcceptReschedule?: () => void;
  // Mientras se cancela o se acepta, los botones de esta tarjeta esperan
  isBusy?: boolean;
}

// Turno del cliente en "Mis turnos", con las acciones que permite su estado (mismas reglas que el back)
export const TurnoCard = ({ turno, onCancel, onAcceptReschedule, isBusy = false }: TurnoCardProps) => {
  const estado = ESTADO[turno.estado];
  const puedeCancelar = clientePuedeCancelar(turno);
  // Confirmar asistencia es solo un link opcional del recordatorio; si lo usó, se muestra
  const asistenciaConfirmada = turno.estado === 'CONFIRMADO' && turno.asistenciaConfirmadaEn !== null && !yaTermino(turno);
  // Confirmado, todavía no empezó, pero faltan menos de 12 h: solo el salón lo puede cancelar
  const fueraDePlazo = turno.estado === 'CONFIRMADO' && !puedeCancelar && !yaTermino(turno);

  return (
    // Borde con el degradado de la marca (el padding lo deja ver) y fondo blanco (pedido de Andrea)
    <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.border}>
      <View style={styles.card}>
        <Text style={styles.date}>{capitalize(formatFechaLarga(turno.fecha))}</Text>
        <Text style={styles.time}>
          {turno.horaInicio} a {turno.horaFin} h
        </Text>
        {turno.detalles.map((detalle) => (
          <Text key={detalle.id} style={styles.detail}>
            {detalle.servicio} · {detalle.profesional}
          </Text>
        ))}
        {totalCobrado(turno) !== null && <Text style={styles.total}>Total {formatPrice(totalCobrado(turno) ?? 0)}</Text>}
  
        {turno.estado === 'CANCELADO' && turno.motivo ? <Text style={styles.note}>Motivo: {turno.motivo}</Text> : null}
        {turno.estado === 'REPROGRAMADO' && (
          <Text style={styles.note}>El salón te propuso este horario. Si te queda bien, aceptalo; si no, podés cancelarlo.</Text>
        )}
        {asistenciaConfirmada && (
          <View style={styles.confirmed}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.confirmedText}>Confirmaste tu asistencia</Text>
          </View>
        )}
        {fueraDePlazo && <Text style={styles.note}>Faltan menos de 12 horas: para cancelarlo, comunicate con el salón.</Text>}
  
        {/* Abajo: el estado como texto a la izquierda y los botones chicos a la derecha (pedido de Andrea:
            sin pastilla arriba y con la tarjeta más baja) */}
        <View style={styles.footer}>
          <Text style={[styles.estado, { color: estado.color }]}>{estado.label}</Text>
          <View style={styles.actions}>
            {puedeCancelar && onCancel && (
              <Button variant="grey" size="sm" onPress={onCancel} disabled={isBusy}>
                Cancelar turno
              </Button>
            )}
            {turno.estado === 'REPROGRAMADO' && onAcceptReschedule && (
              <Button size="sm" onPress={onAcceptReschedule} isLoading={isBusy}>
                Aceptar horario
              </Button>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const BORDE = 1.5;

const styles = StyleSheet.create({
  border: {
    padding: BORDE,
    borderRadius: radius.md,
  },
  card: {
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md - BORDE,
    backgroundColor: colors.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  estado: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
  },
  date: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  time: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.violet,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  total: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  confirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  confirmedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  note: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
});
