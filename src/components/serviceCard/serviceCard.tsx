import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { API_URL } from '@/api/client';
import { formatPrice, formatServiceDuration, servicePhotoPath } from '@/api/services';
import type { Servicio } from '@/api/services';
import { colors, fonts, fontSizes, gradient, radius, spacing } from '@/theme';

interface ServiceCardProps {
  servicio: Servicio;
  onPress?: () => void;
}

// Servicio del catálogo: foto (o el degradado con una tijera), nombre, descripción, duración mínima y precio
export const ServiceCard = ({ servicio, onPress }: ServiceCardProps) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={onPress ? `Reservar ${servicio.tipo}` : servicio.tipo}
  >
    {servicio.foto ? (
      <Image source={{ uri: `${API_URL}${servicePhotoPath(servicio.id)}` }} style={styles.photo} contentFit="cover" transition={150} />
    ) : (
      <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={[styles.photo, styles.placeholder]}>
        <Ionicons name="cut-outline" size={28} color={colors.white} />
      </LinearGradient>
    )}
    <View style={styles.text}>
      <Text style={styles.name}>{servicio.tipo}</Text>
      {servicio.descripcion ? (
        <Text style={styles.description} numberOfLines={2}>
          {servicio.descripcion}
        </Text>
      ) : null}
      <Text style={styles.detail}>
        {formatServiceDuration(servicio.tiempoDuracion)} · {formatPrice(servicio.precio)}
      </Text>
    </View>
    {onPress && <Ionicons name="chevron-forward" size={20} color={colors.greyLight} />}
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  detail: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.violet,
  },
});
