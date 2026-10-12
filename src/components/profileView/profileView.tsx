import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';

import type { Usuario } from '@/api/auth';
import { Button } from '@/components/button/button';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, gradient, radius, spacing } from '@/theme';

const ROL_LABEL: Record<Usuario['rol'], string> = {
  CLIENTE: 'Cliente',
  PROFESIONAL: 'Profesional',
  ADMIN: 'Administrador',
};

type IconName = ComponentProps<typeof Ionicons>['name'];

const DataRow = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <View style={styles.row}>
    <Ionicons name={icon} size={20} color={colors.violet} />
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  </View>
);

interface ProfileViewProps {
  // Secciones propias del rol, entre los datos y cerrar sesión (ej. "Mis servicios" del profesional)
  children?: ReactNode;
}

// Perfil del usuario logueado (cliente o profesional) con cerrar sesión.
// La edición de datos y la foto de perfil se suman más adelante (PATCH /users/me)
export const ProfileView = ({ children }: ProfileViewProps) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initials = `${user.nombre[0] ?? ''}${user.apellido[0] ?? ''}`.toUpperCase();

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', '¿Querés cerrar sesión en este celular?', [
      { text: 'Cancelar', style: 'cancel' },
      // Al borrar la sesión, el layout del rol redirige solo a la bienvenida
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <Screen scroll edges={[]}>
      <View style={styles.header}>
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </LinearGradient>
        <Text style={styles.name}>
          {user.nombre} {user.apellido}
        </Text>
        <Text style={styles.role}>{ROL_LABEL[user.rol]}</Text>
      </View>

      <View style={styles.card}>
        <DataRow icon="mail-outline" label="Correo" value={user.email} />
        <DataRow icon="call-outline" label="Teléfono" value={user.telefono || '—'} />
        {user.rol === 'CLIENTE' && (
          <DataRow icon="medkit-outline" label="Alergias o sensibilidades" value={user.cliente?.alergia || 'Ninguna cargada'} />
        )}
        {user.rol === 'PROFESIONAL' && user.profesional && (
          <DataRow icon="id-card-outline" label="Legajo" value={String(user.profesional.legajo)} />
        )}
      </View>

      {children}

      <Button variant="grey" onPress={confirmLogout}>
        Cerrar sesión
      </Button>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  initials: {
    fontFamily: fonts.title,
    fontSize: fontSizes.xxl,
    color: colors.white,
  },
  name: {
    fontFamily: fonts.title,
    fontSize: fontSizes.xl,
    color: colors.black,
    textAlign: 'center',
  },
  role: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.violet,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.grey,
  },
  rowValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.black,
  },
});
