import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import type { Usuario } from '@/api/auth';
import { ApiError } from '@/api/client';
import { updateProfileRequest } from '@/api/users';
import type { UpdateProfileData } from '@/api/users';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, spacing } from '@/theme';
import { PHONE_REGEX, fechaToIso, isoToFecha, maskFecha, onlyDigits, validateFechaNacimiento } from '@/utils/validation';

interface FormValues {
  nombre: string;
  apellido: string;
  telefono: string;
  // "DD/MM/AAAA" mientras se edita
  fechaNacimiento: string;
  alergia: string;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const toFormValues = (user: Usuario): FormValues => ({
  nombre: user.nombre,
  apellido: user.apellido,
  telefono: user.telefono ?? '',
  fechaNacimiento: isoToFecha(user.fechaNacimiento),
  alergia: user.cliente?.alergia ?? '',
});

const validate = (values: FormValues): FieldErrors => {
  const errors: FieldErrors = {};
  if (!values.nombre.trim()) errors.nombre = 'Ingresá tu nombre';
  if (!values.apellido.trim()) errors.apellido = 'Ingresá tu apellido';
  if (!values.telefono) errors.telefono = 'Ingresá tu teléfono';
  else if (!PHONE_REGEX.test(values.telefono)) errors.telefono = 'Ingresá entre 8 y 15 números, sin espacios';
  const fechaError = validateFechaNacimiento(values.fechaNacimiento);
  if (fechaError) errors.fechaNacimiento = fechaError;
  return errors;
};

// Solo lo que cambió (el back actualiza los campos enviados). Vaciar la fecha o la alergia las borra (null)
const changes = (user: Usuario, values: FormValues): UpdateProfileData => {
  const data: UpdateProfileData = {};
  const initial = toFormValues(user);
  if (values.nombre.trim() !== initial.nombre) data.nombre = values.nombre.trim();
  if (values.apellido.trim() !== initial.apellido) data.apellido = values.apellido.trim();
  if (values.telefono !== initial.telefono) data.telefono = values.telefono;
  if (values.fechaNacimiento !== initial.fechaNacimiento) data.fechaNacimiento = fechaToIso(values.fechaNacimiento);
  if (user.rol === 'CLIENTE' && values.alergia.trim() !== initial.alergia) data.alergia = values.alergia.trim() || null;
  return data;
};

// F01: editar los datos propios (PATCH /users/me). El email no se edita: es el usuario de la cuenta (igual que en la web)
export default function EditarPerfil() {
  const { user, token, updateUser } = useAuth();
  const [values, setValues] = useState<FormValues | null>(() => (user ? toFormValues(user) : null));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sin sesión (o si se cerró mientras estaba abierta) vuelve a la bienvenida
  if (!user || !token || !values) return <Redirect href="/" />;

  const bind = (name: keyof FormValues) => ({
    value: values[name],
    onChangeText: (text: string) =>
      setValues((prev) =>
        prev && { ...prev, [name]: name === 'telefono' ? onlyDigits(text) : name === 'fechaNacimiento' ? maskFecha(text) : text },
      ),
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

    const data = changes(user, values);
    if (Object.keys(data).length === 0) {
      router.back();
      return;
    }

    setIsLoading(true);
    try {
      updateUser(await updateProfileRequest(token, data));
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scroll edges={['bottom']} style={styles.container}>
      <TextField label="Nombre" autoComplete="given-name" autoCapitalize="words" maxLength={100} {...bind('nombre')} />
      <TextField label="Apellido" autoComplete="family-name" autoCapitalize="words" maxLength={100} {...bind('apellido')} />
      <TextField
        label="Correo electrónico"
        value={user.email}
        editable={false}
        style={styles.readOnly}
        hint="Es tu usuario para entrar, por eso no se puede cambiar"
      />
      <TextField
        label="Teléfono (WhatsApp)"
        placeholder="ej. 2991234567"
        keyboardType="number-pad"
        autoComplete="tel"
        hint="Solo números, con código de área y sin 0 ni 15"
        {...bind('telefono')}
      />
      <TextField
        label="Fecha de nacimiento (opcional)"
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        autoComplete="birthdate-full"
        maxLength={10}
        {...bind('fechaNacimiento')}
      />
      {user.rol === 'CLIENTE' && (
        <TextField
          label="Alergias o sensibilidades (opcional)"
          placeholder="ej. amoníaco"
          hint="Le sirve a tu estilista para elegir los productos"
          maxLength={255}
          {...bind('alergia')}
        />
      )}

      {error !== '' && <FormMessage message={error} />}

      <Button onPress={handleSubmit} isLoading={isLoading}>
        Guardar cambios
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
  readOnly: {
    color: colors.grey,
  },
});
