import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FRECUENCIA_LABEL, puedeElegirHorario } from '@/api/series';
import type { EstadoSerie, FechaSerie, Serie } from '@/api/series';
import { formatFechaCorta } from '@/api/turnos';
import type { EstadoTurno } from '@/api/turnos';
import { Chip } from '@/components/chip/chip';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

// La clienta no ve lo que se cayó (cancelado o rechazado): solo lo que tiene por delante o ya hizo
const OCULTOS_CLIENTE: EstadoTurno[] = ['CANCELADO', 'RECHAZADO'];

const ESTADO_SERIE: Record<EstadoSerie, { label: string; color: string }> = {
  ACTIVA: { label: 'Activa', color: colors.success },
  SUSPENDIDA: { label: 'Suspendida', color: colors.warning },
  BAJA: { label: 'Dada de baja', color: colors.grey },
};

const ESTADO_TURNO: Record<EstadoTurno, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: colors.warning },
  CONFIRMADO: { label: 'Confirmado', color: colors.success },
  REPROGRAMADO: { label: 'Nuevo horario propuesto', color: colors.violet },
  COMPLETADO: { label: 'Completado', color: colors.grey },
  RECHAZADO: { label: 'Rechazado', color: colors.error },
  CANCELADO: { label: 'Cancelado', color: colors.grey },
  AUSENTE: { label: 'Ausente', color: colors.error },
};

interface SerieCardProps {
  serie: Serie;
  // La clienta ve con quién; el profesional, para quién
  para: 'cliente' | 'profesional';
  // Solo la clienta: elegir otro horario en una fecha que estaba ocupada
  onElegirHorario?: (fecha: FechaSerie) => void;
  // Acciones de la serie (las arma la pantalla)
  children?: ReactNode;
}

// F05: una serie de turnos con cada fecha y lo que pasó con ella
export const SerieCard = ({ serie, para, onElegirHorario, children }: SerieCardProps) => {
  const estado = ESTADO_SERIE[serie.estado];
  // El profesional ve todas las fechas; la clienta, las que tienen turno vigente o donde puede elegir otro horario
  const fechas =
    para === 'profesional'
      ? serie.fechas
      : serie.fechas.filter((fecha) => (fecha.turno ? !OCULTOS_CLIENTE.includes(fecha.turno.estado) : puedeElegirHorario(serie, fecha)));

  // Una fecha sin turno: en una serie activa y por delante, estaba ocupada al crearla
  const sinTurno = (fecha: FechaSerie) => {
    if (!puedeElegirHorario(serie, fecha)) return 'Sin turno';
    return para === 'cliente' ? `No había lugar a las ${serie.horaInicio}` : 'Ocupada: la clienta puede elegir otro horario';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{serie.servicio}</Text>
        <View style={[styles.badge, { borderColor: estado.color }]}>
          <Text style={[styles.badgeText, { color: estado.color }]}>{estado.label}</Text>
        </View>
      </View>
      <Text style={styles.detail}>
        {para === 'cliente' ? `Con ${serie.profesional}` : `${serie.cliente.nombre} ${serie.cliente.apellido}`}
      </Text>
      <Text style={styles.detail}>
        {FRECUENCIA_LABEL[serie.frecuencia]} a las {serie.horaInicio} h
      </Text>

      {fechas.length === 0 && para === 'cliente' && (
        <Text style={styles.detail}>
          {serie.estado === 'SUSPENDIDA' ? 'Tu estilista suspendió esta serie.' : 'Esta serie no tiene turnos por delante.'}
        </Text>
      )}

      {fechas.length > 0 && (
        <View style={styles.fechas}>
          {fechas.map((fecha) => {
            const turno = fecha.turno;
            const estadoTurno = turno ? ESTADO_TURNO[turno.estado] : null;
            return (
              <View key={fecha.fecha} style={styles.fecha}>
                <View style={styles.fechaRow}>
                  <Text style={styles.fechaDia}>{formatFechaCorta(fecha.fecha)}</Text>
                  {turno && estadoTurno ? (
                    <Text style={[styles.fechaEstado, { color: estadoTurno.color }]}>
                      {turno.horaInicio} h · {estadoTurno.label}
                    </Text>
                  ) : (
                    <Text style={[styles.fechaEstado, styles.sinTurno]}>{sinTurno(fecha)}</Text>
                  )}
                </View>
                {para === 'cliente' && onElegirHorario && puedeElegirHorario(serie, fecha) && (
                  <Chip label="Elegir otro horario" onPress={() => onElegirHorario(fecha)} style={styles.chip} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {children}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
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
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  fechas: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
  },
  fecha: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  fechaDia: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  fechaEstado: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
  },
  sinTurno: {
    color: colors.grey,
  },
  chip: {
    alignSelf: 'flex-start',
  },
});
