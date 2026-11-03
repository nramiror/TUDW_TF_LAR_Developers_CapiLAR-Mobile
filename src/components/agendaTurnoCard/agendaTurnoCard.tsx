import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatFechaLarga } from '@/api/turnos';
import type { EstadoTurno, Turno } from '@/api/turnos';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

// Cómo ve el profesional cada estado (el cliente los ve con otros textos en TurnoCard)
const ESTADO: Record<EstadoTurno, { label: string; color: string }> = {
  PENDIENTE: { label: 'Solicitud pendiente', color: colors.warning },
  CONFIRMADO: { label: 'Confirmado', color: colors.success },
  REPROGRAMADO: { label: 'Esperando respuesta del cliente', color: colors.violet },
  COMPLETADO: { label: 'Completado', color: colors.grey },
  RECHAZADO: { label: 'Rechazado', color: colors.error },
  CANCELADO: { label: 'Cancelado', color: colors.grey },
  AUSENTE: { label: 'Ausente', color: colors.error },
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface AgendaTurnoCardProps {
  turno: Turno;
  // En las solicitudes pendientes se muestra la fecha; en la agenda del día ya se sabe
  showFecha?: boolean;
  // Botones según el estado (los arma la pantalla)
  children?: ReactNode;
}

// Turno en la agenda del profesional: horario, cliente (con su alergia, importante para los químicos) y servicios
export const AgendaTurnoCard = ({ turno, showFecha = false, children }: AgendaTurnoCardProps) => {
  const estado = ESTADO[turno.estado];
  const inactivo = turno.estado === 'CANCELADO' || turno.estado === 'RECHAZADO';

  return (
    <View style={[styles.card, inactivo && styles.inactive]}>
      <View style={styles.header}>
        <Text style={styles.time}>
          {turno.horaInicio} a {turno.horaFin} h
        </Text>
        <View style={[styles.badge, { borderColor: estado.color }]}>
          <Text style={[styles.badgeText, { color: estado.color }]}>{estado.label}</Text>
        </View>
      </View>
      {showFecha && <Text style={styles.date}>{capitalize(formatFechaLarga(turno.fecha))}</Text>}

      <Text style={styles.client}>
        {turno.cliente.nombre} {turno.cliente.apellido}
      </Text>
      {turno.estado === 'CONFIRMADO' && turno.asistenciaConfirmadaEn ? (
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.detail, styles.confirmed]}>Confirmó que viene</Text>
        </View>
      ) : null}
      {/* Sin verificar no puede reservar sola: conviene pedirle que revise su mail */}
      {turno.cliente.emailVerificadoEn === null ? (
        <View style={styles.row}>
          <Ionicons name="mail-unread-outline" size={16} color={colors.warning} />
          <Text style={[styles.detail, styles.unverified]}>Email sin verificar</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Ionicons name="call-outline" size={16} color={colors.grey} />
        <Text style={styles.detail}>{turno.cliente.telefono}</Text>
      </View>
      {turno.cliente.alergia ? (
        <View style={styles.row}>
          <Ionicons name="warning-outline" size={16} color={colors.error} />
          <Text style={[styles.detail, styles.alergia]}>Alergia: {turno.cliente.alergia}</Text>
        </View>
      ) : null}
      {turno.detalles.map((detalle) => (
        <View key={detalle.id} style={styles.row}>
          <Ionicons name="cut-outline" size={16} color={colors.grey} />
          <Text style={styles.detail}>{detalle.servicio}</Text>
        </View>
      ))}

      {turno.estado === 'CANCELADO' && turno.motivo ? <Text style={styles.note}>Motivo: {turno.motivo}</Text> : null}
      {turno.estado === 'RECHAZADO' && turno.motivo ? <Text style={styles.note}>Motivo (interno): {turno.motivo}</Text> : null}
      {turno.estado === 'REPROGRAMADO' && <Text style={styles.note}>Le propusiste este horario: se confirma cuando lo acepte.</Text>}

      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  inactive: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  time: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.violet,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
  },
  date: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  client: {
    marginTop: spacing.xs,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detail: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  alergia: {
    fontFamily: fonts.bodySemiBold,
    color: colors.error,
  },
  confirmed: {
    fontFamily: fonts.bodyMedium,
    color: colors.success,
  },
  unverified: {
    color: colors.warning,
  },
  note: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
