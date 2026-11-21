import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { API_URL } from '@/api/client';
import { formatDuration, formatPrice, servicePhotoPath } from '@/api/services';
import type { Servicio } from '@/api/services';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

interface ServiceCardProps {
  servicio: Servicio;
  // Sin onPress es solo informativa (ej. arriba de la pantalla de reserva)
  onPress?: () => void;
}

// Servicio del catálogo, igual que la card de la web: cómo se confirma, duración mínima, nombre, descripción,
// precio "Desde" y "Reservar". La foto solo si el salón cargó una (sin foto ya no lleva el cuadrado con la tijera)
export const ServiceCard = ({ servicio, onPress }: ServiceCardProps) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={onPress ? `Reservar ${servicio.tipo}` : servicio.tipo}
  >
    <View style={styles.top}>
      {/* Los que necesitan evaluación quedan pendientes hasta que la profesional los acepta */}
      <View style={[styles.tag, servicio.requiereEvaluacion ? styles.tagEvaluacion : styles.tagInmediata]}>
        <Text style={[styles.tagText, servicio.requiereEvaluacion ? styles.tagTextEvaluacion : styles.tagTextInmediata]}>
          {servicio.requiereEvaluacion ? 'Necesita evaluación' : 'Confirmación inmediata'}
        </Text>
      </View>
      {/* Tiempo mínimo: según el cabello puede llevar más */}
      <View style={styles.duration} accessibilityLabel={`Duración mínima ${formatDuration(servicio.tiempoDuracion)}`}>
        <Ionicons name="time-outline" size={14} color={colors.grey} />
        <Text style={styles.durationText}>Mín. {formatDuration(servicio.tiempoDuracion)}</Text>
      </View>
    </View>

    <View style={styles.body}>
      {servicio.foto ? (
        <Image source={{ uri: `${API_URL}${servicePhotoPath(servicio.id)}` }} style={styles.photo} contentFit="cover" transition={150} />
      ) : null}
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={2}>
          {servicio.tipo}
        </Text>
        {servicio.descripcion ? (
          <Text style={styles.description} numberOfLines={2}>
            {servicio.descripcion}
          </Text>
        ) : null}
      </View>
    </View>

    <View style={styles.bottom}>
      {/* Precio base: el final depende del largo y del estado del cabello */}
      <Text style={styles.price}>
        <Text style={styles.from}>Desde </Text>
        {formatPrice(servicio.precio)}
      </Text>
      {onPress && (
        <View style={styles.reservar}>
          <Text style={styles.reservarText}>Reservar</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.violet} />
        </View>
      )}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  // Más baja (pedido de Andrea): menos padding y separación entre filas
  card: {
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  tagInmediata: {
    backgroundColor: colors.surface,
  },
  tagEvaluacion: {
    backgroundColor: colors.peachSurface,
  },
  tagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tagTextInmediata: {
    color: colors.violet,
  },
  tagTextEvaluacion: {
    color: colors.peachText,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  durationText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  body: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: colors.grey,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  from: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  price: {
    fontFamily: fonts.title,
    fontSize: fontSizes.lg,
    color: colors.black,
  },
  reservar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  reservarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.violet,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
