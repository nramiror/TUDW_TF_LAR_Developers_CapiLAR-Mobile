import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { forgotPasswordRequest } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { colors, fonts, fontSizes, spacing } from '@/theme';
import { EMAIL_REGEX } from '@/utils/validation';

// F01: pedir el mail de recuperación (POST /auth/forgot-password).
// El link del mail abre la web, donde se elige la contraseña nueva; después se vuelve a entrar desde la app
export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) return setFieldError('Ingresá tu correo electrónico');
    if (!EMAIL_REGEX.test(email.trim())) return setFieldError('Ingresá un correo válido');
    setFieldError('');

    setIsLoading(true);
    try {
      // El back responde siempre lo mismo, exista o no el email
      const { message } = await forgotPasswordRequest(email.trim().toLowerCase());
      setSentMessage(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <Text style={styles.text}>
        Ingresá el correo de tu cuenta y te enviamos un enlace para elegir una contraseña nueva. El enlace vence en 15 minutos.
      </Text>

      {sentMessage ? (
        <>
          <FormMessage type="success" message={sentMessage} />
          <Button variant="secundario" onPress={() => router.back()}>
            Volver a iniciar sesión
          </Button>
        </>
      ) : (
        <>
          <TextField
            label="Correo electrónico"
            placeholder="ej. cliente@capilar.com"
            value={email}
            onChangeText={setEmail}
            error={fieldError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
          {error !== '' && <FormMessage message={error} />}
          <Button onPress={handleSubmit} isLoading={isLoading}>
            Enviar enlace
          </Button>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
    lineHeight: 20,
  },
});
