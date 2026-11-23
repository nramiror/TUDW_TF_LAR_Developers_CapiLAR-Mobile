import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FRECUENCIA_LABEL, puedeElegirHorario } from '@/api/series';
import type { EstadoSerie, FechaSerie, Serie } from '@/api/series';
import { formatFechaCorta } from '@/api/turnos';
import type { EstadoTurno } from '@/api/turnos';
import { Chip } from '@/components/chip/chip';
import { GradientCard } from '@/components/gradientCard/gradientCard';
import { colors, fonts, fontSizes, radius, spacing, useAccent } from '@/theme';

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

// F05: una serie de turnos. Las fechas, con lo que pasó en cada una, se despliegan aparte con "Ver fechas" (como en la web;
// pedido de Linda: las series se veían muy largas)
export const SerieCard = ({ serie, para, onElegirHorario, children }: SerieCardProps) => {
  const estado = ESTADO_SERIE[serie.estado];
  const [abierta, setAbierta] = useState(false);
  const accent = useAccent();
  // El violeta de los estados (ej. reprogramado) es el acento: en el profesional pasa a fucsia, con el tono de texto
  const enAcento = (color: string) => (color === colors.violet ? accent.text : color);
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

  // Fechas ocupadas por delante: la clienta puede elegir otro horario (se avisa aunque estén plegadas)
  const ocupadas = fechas.filter((fecha) => puedeElegirHorario(serie, fecha)).length;

  return (
    <GradientCard muted={serie.estado === 'BAJA'} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{serie.servicio}</Text>
        <Text style={[styles.estado, { color: enAcento(estado.color) }]}>{estado.label}</Text>
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
        <Pressable
          onPress={() => setAbierta((prev) => !prev)}
          style={styles.toggle}
          hitSlop={spacing.xs}
          accessibilityRole="button"
          accessibilityState={{ expanded: abierta }}
        >
          <Text style={[styles.toggleText, { color: accent.text }]}>{abierta ? 'Ocultar fechas' : `Ver fechas (${fechas.length})`}</Text>
          <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={16} color={accent.accent} />
          {ocupadas > 0 && (
            <Text style={styles.ocupadas}>
              {ocupadas} {ocupadas === 1 ? 'fecha ocupada' : 'fechas ocupadas'}
              {para === 'cliente' ? ': elegí otro horario' : ''}
            </Text>
          )}
        </Pressable>
      )}

      {abierta && fechas.length > 0 && (
        <View style={styles.fechas}>
          {fechas.map((fecha) => {
            const turno = fecha.turno;
            const estadoTurno = turno ? ESTADO_TURNO[turno.estado] : null;
            return (
              <View key={fecha.fecha} style={styles.fecha}>
                <View style={styles.fechaRow}>
                  <Text style={styles.fechaDia}>{formatFechaCorta(fecha.fecha)}</Text>
                  {turno && estadoTurno ? (
                    <Text style={[styles.fechaEstado, { color: enAcento(estadoTurno.color) }]}>
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

      {children ? <View style={styles.actions}>{children}</View> : null}
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
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
  estado: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
  },
  toggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  toggleText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ocupadas: {
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.peachSurface,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs,
    color: colors.peachText,
  },
  // Botones chicos a la derecha (los arma la pantalla)
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  fechas: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
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
