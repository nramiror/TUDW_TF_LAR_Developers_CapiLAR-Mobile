import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { ImageProps } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { API_URL } from '@/api/client';
import { useAuth } from '@/context/auth/useAuth';
import { colors } from '@/theme';

interface AuthImageProps extends Omit<ImageProps, 'source'> {
  // Ruta del back, ej. "/fichas/3/fotos/7"
  path: string;
}

// Imagen que pide login (fotos de las fichas). Va con el token en el header; como no pasa por apiFetch,
// si falla porque el access token venció (15 min) se renueva una vez y se vuelve a pedir con el nuevo
export const AuthImage = ({ path, style, ...props }: AuthImageProps) => {
  const { token, renewToken } = useAuth();
  // Token con el que ya se reintentó: si falla de nuevo no es la sesión, y así no se renueva en bucle
  const [retriedToken, setRetriedToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (!token || failed) {
    return (
      <View style={[style, styles.placeholder]} accessibilityLabel="No se pudo cargar la foto">
        <Ionicons name="image-outline" size={24} color={colors.greyLight} />
      </View>
    );
  }

  const handleError = async () => {
    if (retriedToken !== token) {
      setRetriedToken(token);
      const newToken = await renewToken(token).catch(() => null);
      if (newToken && newToken !== token) return;
    }
    setFailed(true);
  };

  return (
    <Image
      source={{ uri: `${API_URL}${path}`, headers: { Authorization: `Bearer ${token}` } }}
      style={style}
      contentFit="cover"
      transition={150}
      onError={handleError}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
