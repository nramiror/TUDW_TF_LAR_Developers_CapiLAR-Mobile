import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { meRequest } from '@/api/auth';
import { ApiError } from '@/api/client';
import { resendVerificationRequest } from '@/api/users';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

// F06: aviso en el perfil del cliente que no verificó su email (sin verificar no puede reservar), con "Reenviar enlace".
// El enlace del mail abre la web: el cliente puede abrirlo desde la compu o el navegador del celu
export const EmailVerification = () => {
  const { user, token, updateUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const pendiente = user?.rol === 'CLIENTE' && user.emailVerificadoEn === null;

  // Al volver al perfil (por ejemplo, después de abrir el enlace) se pregunta al back si ya lo verificó
  useFocusEffect(
    useCallback(() => {
      if (!pendiente || !token) return;
      meRequest(token)
        .then(updateUser)
        .catch(() => undefined);
    }, [pendiente, token, updateUser]),
  );

  if (!pendiente || !token) return null;

  const resend = async () => {
    setIsSending(true);
    setMessage(null);
    try {
      await resendVerificationRequest(token);
      setMessage({ text: `Te mandamos un enlace nuevo a ${user.email}. Revisá también la carpeta de spam.`, type: 'success' });
    } catch (err) {
      // 400 si ya estaba verificado (lo abrió en otro lado): se actualizan los datos y el aviso desaparece
      if (err instanceof ApiError && err.status === 400) {
        updateUser(await meRequest(token).catch(() => user));
      }
      setMessage({ text: err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="mail-unread-outline" size={22} color={colors.warning} />
        <Text style={styles.title}>Verificá tu email</Text>
      </View>
      <Text style={styles.text}>
        Para reservar turnos tenés que verificar tu email. Abrí el enlace que te mandamos a {user.email}.
      </Text>
      {message && <FormMessage message={message.text} type={message.type} />}
      <Button variant="secundario" onPress={resend} isLoading={isSending}>
        Reenviar enlace
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.subtitle,
    fontSize: fontSizes.md,
    color: colors.black,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
});
