import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { TextLink } from '@/components/textLink/textLink';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, spacing } from '@/theme';
import { EMAIL_REGEX, PHONE_REGEX, onlyDigits, validatePassword } from '@/utils/validation';

interface FormValues {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  alergia: string;
  contrasena: string;
  confirmacion: string;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  alergia: '',
  contrasena: '',
  confirmacion: '',
};

const validate = (values: FormValues): FieldErrors => {
  const errors: FieldErrors = {};

  if (!values.nombre.trim()) errors.nombre = 'Ingresá tu nombre';
  if (!values.apellido.trim()) errors.apellido = 'Ingresá tu apellido';

  if (!values.email.trim()) errors.email = 'Ingresá tu correo';
  else if (!EMAIL_REGEX.test(values.email.trim())) errors.email = 'Ingresá un correo válido';

  if (!values.telefono) errors.telefono = 'Ingresá tu teléfono';
  else if (!PHONE_REGEX.test(values.telefono)) errors.telefono = 'Ingresá entre 10 y 13 números, sin espacios';

  const passwordError = validatePassword(values.contrasena);
  if (passwordError) errors.contrasena = passwordError;

  if (!values.confirmacion) errors.confirmacion = 'Repetí la contraseña';
  else if (values.confirmacion !== values.contrasena) errors.confirmacion = 'Las contraseñas no coinciden';

  return errors;
};

// F01: crear cuenta de CLIENTE (POST /auth/register). El back devuelve el token: queda logueado
// y el (auth)/_layout lo lleva a su inicio
export default function Registro() {
  const { register } = useAuth();

  const [values, setValues] = useState<FormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const bind = (name: keyof FormValues) => ({
    value: values[name],
    onChangeText: (text: string) => setValues((prev) => ({ ...prev, [name]: name === 'telefono' ? onlyDigits(text) : text })),
    error: fieldErrors[name],
  });

  const handleSubmit = async () => {
    const errors = validate(values);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length > 0) {
      setError('Revisá los campos marcados en rojo.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        nombre: values.nombre.trim(),
        apellido: values.apellido.trim(),
        email: values.email.trim().toLowerCase(),
        telefono: values.telefono,
        contrasena: values.contrasena,
        alergia: values.alergia.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <Text style={styles.subtitle}>Completá tus datos para registrarte en CapiLAR</Text>

      <TextField label="Nombre" autoComplete="given-name" textContentType="givenName" autoCapitalize="words" {...bind('nombre')} />
      <TextField label="Apellido" autoComplete="family-name" textContentType="familyName" autoCapitalize="words" {...bind('apellido')} />
      <TextField
        label="Correo electrónico"
        placeholder="ej. cliente@capilar.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        {...bind('email')}
      />
      <TextField
        label="Teléfono (WhatsApp)"
        placeholder="ej. 2991234567"
        keyboardType="number-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        hint="Solo números, con código de área y sin 0 ni 15"
        {...bind('telefono')}
      />
      <TextField
        label="Alergias o sensibilidades (opcional)"
        placeholder="ej. amoníaco"
        hint="Le sirve a tu estilista para elegir los productos"
        maxLength={255}
        {...bind('alergia')}
      />
      <TextField
        label="Contraseña"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        hint="Mínimo 8 caracteres, con al menos una letra y un número"
        {...bind('contrasena')}
      />
      <TextField label="Repetir contraseña" password autoComplete="new-password" textContentType="newPassword" {...bind('confirmacion')} />

      {error !== '' && <FormMessage message={error} />}

      <Button onPress={handleSubmit} isLoading={isLoading}>
        Crear cuenta
      </Button>

      <View style={styles.links}>
        <TextLink prefix="¿Ya tenés cuenta?" label="Iniciá sesión" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  links: {
    marginTop: spacing.sm,
  },
});
