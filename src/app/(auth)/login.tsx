import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TextInput } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Logo } from '@/components/logo/logo';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { TextLink } from '@/components/textLink/textLink';
import { ADMIN_SIN_APP_MESSAGE } from '@/context/auth/homeForRole';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';
import { EMAIL_REGEX } from '@/utils/validation';

interface FieldErrors {
  email?: string;
  contrasena?: string;
}

// F01: iniciar sesión con email y contraseña (POST /auth/login). Al entrar, el (auth)/_layout lleva al inicio del rol
export default function Login() {
  const { login, logout } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Ingresá tu correo electrónico';
    else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Ingresá un correo válido';
    if (!contrasena) errors.contrasena = 'Ingresá tu contraseña';
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), contrasena);
      if (user.rol === 'ADMIN') {
        await logout();
        setError(ADMIN_SIN_APP_MESSAGE);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <View style={styles.header}>
        <Logo width={180} />
        <Text style={styles.subtitle}>Ingresá tus credenciales de CapiLAR</Text>
      </View>

      <TextField
        label="Correo electrónico"
        placeholder="ej. cliente@capilar.com"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={passwordRef}
        label="Contraseña"
        password
        value={contrasena}
        onChangeText={setContrasena}
        error={fieldErrors.contrasena}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      {error !== '' && <FormMessage message={error} />}

      <Button onPress={handleSubmit} isLoading={isLoading}>
        Ingresar
      </Button>

      <View style={styles.links}>
        <TextLink prefix="¿No tenés cuenta?" label="Registrate" onPress={() => router.replace('/registro')} />
        <TextLink prefix="¿Olvidaste tu contraseña?" label="Recuperala" onPress={() => router.push('/recuperar')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  links: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
