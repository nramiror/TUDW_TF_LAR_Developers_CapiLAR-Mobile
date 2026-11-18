import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';

import { formatAlergias } from '@/api/alergias';
import type { Usuario } from '@/api/auth';
import { ApiError } from '@/api/client';
import { deleteAccountRequest } from '@/api/users';
import { EmailVerification } from '@/components/emailVerification/emailVerification';
import { ProfilePhoto } from '@/components/profilePhoto/profilePhoto';
import { Screen } from '@/components/screen/screen';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';
import { isoToFecha } from '@/utils/validation';

const ROL_LABEL: Record<Usuario['rol'], string> = {
  CLIENTE: 'Cliente',
  PROFESIONAL: 'Profesional',
  ADMIN: 'Administrador',
};

type IconName = ComponentProps<typeof Ionicons>['name'];

// Acceso del perfil (editar datos, contraseña, series...): se muestran en una grilla de 2 columnas
export interface ProfileAction {
  label: string;
  icon: IconName;
  onPress: () => void;
}

const ActionTile = ({ label, icon, onPress }: ProfileAction) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]} accessibilityRole="button">
    <View style={styles.tileIcon}>
      <Ionicons name={icon} size={20} color={colors.violet} />
    </View>
    <Text style={styles.tileText} numberOfLines={2}>
      {label}
    </Text>
  </Pressable>
);

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
  // Accesos propios del rol, después de "Editar mis datos" y "Cambiar contraseña"
  actions?: ProfileAction[];
  // Secciones propias del rol, entre los datos y cerrar sesión (ej. "Mis servicios" del profesional)
  children?: ReactNode;
}

// Perfil del usuario logueado (cliente o profesional): foto, datos, editar, cerrar sesión y darse de baja
export const ProfileView = ({ actions = [], children }: ProfileViewProps) => {
  const { user, token, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  if (!user) return null;

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', '¿Querés cerrar sesión en este celular?', [
      { text: 'Cancelar', style: 'cancel' },
      // Al borrar la sesión, el layout del rol redirige solo a la bienvenida
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);

  const deleteAccount = async () => {
    if (!token) return;
    setIsDeleting(true);
    try {
      await deleteAccountRequest(token);
      // El token ya no sirve: se cierra la sesión y el layout del rol vuelve a la bienvenida
      await logout();
    } catch (err) {
      setIsDeleting(false);
      Alert.alert('No se pudo dar de baja', err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');
    }
  };

  // Doble confirmación: es una acción que el usuario no puede deshacer desde la app
  const confirmDelete = () =>
    Alert.alert('Darme de baja', 'Tu cuenta se va a desactivar y no vas a poder volver a entrar con ella.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('¿Estás seguro?', 'Para volver a usar CapiLAR vas a tener que comunicarte con el salón.', [
            { text: 'No, volver', style: 'cancel' },
            { text: 'Sí, darme de baja', style: 'destructive', onPress: deleteAccount },
          ]),
      },
    ]);

  return (
    <Screen scroll edges={[]}>
      <View style={styles.header}>
        <View style={styles.photo}>
          <ProfilePhoto />
        </View>
        <Text style={styles.name}>
          {user.nombre} {user.apellido}
        </Text>
        <Text style={styles.role}>{ROL_LABEL[user.rol]}</Text>
      </View>

      <EmailVerification />

      <View style={styles.card}>
        <DataRow icon="mail-outline" label="Correo" value={user.email} />
        <DataRow icon="call-outline" label="Teléfono" value={user.telefono || '—'} />
        {user.fechaNacimiento && <DataRow icon="gift-outline" label="Fecha de nacimiento" value={isoToFecha(user.fechaNacimiento)} />}
        {user.rol === 'CLIENTE' && (
          <DataRow icon="medkit-outline" label="Alergias o sensibilidades" value={formatAlergias(user.cliente) || 'Ninguna cargada'} />
        )}
        {user.rol === 'PROFESIONAL' && user.profesional && (
          <DataRow icon="id-card-outline" label="Legajo" value={String(user.profesional.legajo)} />
        )}
      </View>

      {/* Grilla de 2 columnas en vez de botones a todo el ancho (pedido de Andrea tras la demo del 75%) */}
      <View style={styles.grid}>
        {[
          { label: 'Editar mis datos', icon: 'create-outline' as const, onPress: () => router.push('/editar-perfil') },
          { label: 'Cambiar contraseña', icon: 'key-outline' as const, onPress: () => router.push('/cambiar-contrasena') },
          ...actions,
        ].map((action) => (
          <ActionTile key={action.label} {...action} />
        ))}
      </View>

      {children}

      {/* Link con ícono en vez de botón: al lado de la grilla, un botón suelto se veía raro */}
      <Pressable onPress={confirmLogout} disabled={isDeleting} hitSlop={8} accessibilityRole="button" style={styles.logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.grey} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>

      <Pressable onPress={confirmDelete} disabled={isDeleting} hitSlop={8} accessibilityRole="button" style={styles.delete}>
        <Text style={styles.deleteText}>{isDeleting ? 'Dando de baja…' : 'Darme de baja'}</Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  photo: {
    marginBottom: spacing.sm,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Dos por fila: cada una ocupa casi la mitad y el gap completa el resto. Ícono a la izquierda y texto al lado
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tilePressed: {
    backgroundColor: colors.surface,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  tileText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs + 1,
    color: colors.black,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  delete: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  deleteText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
});
