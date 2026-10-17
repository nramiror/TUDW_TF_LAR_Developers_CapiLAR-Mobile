import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import type { TextInput } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { spacing } from '@/theme';
import { validatePassword } from '@/utils/validation';

interface FormValues {
  actual: string;
  nueva: string;
  confirmacion: string;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

// Mismas reglas que el registro y que el DTO del back
const validate = (values: FormValues): FieldErrors => {
  const errors: FieldErrors = {};
  if (!values.actual) errors.actual = 'Ingresá tu contraseña actual';
  const nuevaError = validatePassword(values.nueva);
  if (nuevaError) errors.nueva = nuevaError;
  else if (values.nueva === values.actual) errors.nueva = 'La contraseña nueva tiene que ser distinta de la actual';
  if (!values.confirmacion) errors.confirmacion = 'Repetí la contraseña nueva';
  else if (values.confirmacion !== values.nueva) errors.confirmacion = 'Las contraseñas no coinciden';
  return errors;
};

// F01: cambiar la contraseña estando logueado (PATCH /auth/password). Sirve en lugar del recupero por mail,
// cuyo enlace abre la web. El back cierra la sesión en los otros dispositivos; en este celular sigue abierta
export default function CambiarContrasena() {
  const { user, changePassword } = useAuth();
  const nuevaRef = useRef<TextInput>(null);
  const confirmacionRef = useRef<TextInput>(null);

  const [values, setValues] = useState<FormValues>({ actual: '', nueva: '', confirmacion: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sin sesión (o si se cerró mientras estaba abierta) vuelve a la bienvenida
  if (!user) return <Redirect href="/" />;

  const bind = (name: keyof FormValues) => ({
    value: values[name],
    onChangeText: (text: string) => setValues((prev) => ({ ...prev, [name]: text })),
    error: fieldErrors[name],
  });

  const handleSubmit = async () => {
    const errors = validate(values);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await changePassword(values.actual, values.nueva);
      Alert.alert('Contraseña actualizada', 'Si tenías la sesión abierta en otro dispositivo, ahí vas a tener que volver a entrar.', [
        { text: 'Listo', onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <TextField
        label="Contraseña actual"
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        onSubmitEditing={() => nuevaRef.current?.focus()}
        submitBehavior="submit"
        {...bind('actual')}
      />
      <TextField
        ref={nuevaRef}
        label="Contraseña nueva"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        hint="Mínimo 8 caracteres, con al menos una letra y un número"
        returnKeyType="next"
        onSubmitEditing={() => confirmacionRef.current?.focus()}
        submitBehavior="submit"
        {...bind('nueva')}
      />
      <TextField
        ref={confirmacionRef}
        label="Repetir contraseña nueva"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        {...bind('confirmacion')}
      />

      {error !== '' && <FormMessage message={error} />}

      <Button onPress={handleSubmit} isLoading={isLoading}>
        Guardar contraseña
      </Button>
      <Button variant="grey" onPress={() => router.back()} disabled={isLoading}>
        Cancelar
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
});
