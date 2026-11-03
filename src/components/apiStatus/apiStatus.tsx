import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_URL, ApiError, pingRequest } from '@/api/client';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

type Estado = 'probando' | 'ok' | 'error';

// Tarjeta de desarrollo: muestra si el celular llega al backend (GET /).
// Sirve para verificar la IP del .env. Solo se muestra en desarrollo (__DEV__), no en el APK.
export const ApiStatus = () => {
  const [estado, setEstado] = useState<Estado>('probando');
  const [detalle, setDetalle] = useState('');

  const probar = useCallback(async () => {
    setEstado('probando');
    try {
      const respuesta = await pingRequest();
      setEstado('ok');
      setDetalle(typeof respuesta === 'string' ? respuesta : 'Respondió');
    } catch (error) {
      setEstado('error');
      setDetalle(error instanceof ApiError ? error.message : 'Error desconocido');
    }
  }, []);

  useEffect(() => {
    probar();
  }, [probar]);

  return (
    <Pressable onPress={probar} style={styles.card} accessibilityHint="Toca para volver a probar la conexión">
      <View style={styles.row}>
        {estado === 'probando' ? (
          <ActivityIndicator size="small" color={colors.violet} />
        ) : (
          <View style={[styles.dot, { backgroundColor: estado === 'ok' ? colors.success : colors.error }]} />
        )}
        <Text style={styles.label}>
          {estado === 'probando' ? 'Probando conexión…' : estado === 'ok' ? 'Conectado al backend' : 'Sin conexión al backend'}
        </Text>
      </View>
      <Text style={styles.url}>{API_URL}</Text>
      {detalle !== '' && estado !== 'probando' && <Text style={styles.detail}>{detalle}</Text>}
      {estado === 'error' && <Text style={styles.detail}>Revisá la IP en el .env y que la PC y el celular estén en el mismo wifi. Tocá para reintentar.</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.sm,
    color: colors.black,
  },
  url: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
});
