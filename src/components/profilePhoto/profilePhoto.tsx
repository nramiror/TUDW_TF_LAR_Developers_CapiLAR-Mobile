import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_URL, ApiError } from '@/api/client';
import { FOTO_MAX_BYTES, deletePhotoRequest, uploadPhotoRequest, userPhoto, userPhotoPath } from '@/api/users';
import { OptionsSheet } from '@/components/optionsSheet/optionsSheet';
import type { SheetOption } from '@/components/optionsSheet/optionsSheet';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, gradient, radius } from '@/theme';

const SIZE = 88;

// Recorte cuadrado y algo de compresión: así la foto queda muy por debajo de los 2 MB que acepta el back
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

const showError = (err: unknown) =>
  Alert.alert('No se pudo cambiar la foto', err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.');

// Foto de perfil (o las iniciales sobre el degradado si no tiene). Al tocarla: sacar foto, elegir de la galería o quitarla
export const ProfilePhoto = () => {
  const { user, token, updateUser } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Si la imagen no carga (por ejemplo, sin conexión) se muestran las iniciales
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  if (!user || !token) return null;

  const photo = userPhoto(user);
  const showPhoto = photo !== null && photo !== failedPhoto;
  const initials = `${user.nombre[0] ?? ''}${user.apellido[0] ?? ''}`.toUpperCase();

  const save = async (request: () => ReturnType<typeof deletePhotoRequest>) => {
    setIsSaving(true);
    try {
      updateUser(await request());
    } catch (err) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const pick = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Sin permiso de cámara', 'Para sacarte una foto, habilitá la cámara para CapiLAR en los ajustes del celular.');
        return;
      }
    }
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > FOTO_MAX_BYTES) {
      Alert.alert('Foto muy pesada', 'Elegí una foto de hasta 2 MB.');
      return;
    }
    await save(() => uploadPhotoRequest(token, asset.uri));
  };

  const confirmRemove = () =>
    Alert.alert('Quitar foto', '¿Querés quitar tu foto de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => save(() => deletePhotoRequest(token)) },
    ]);

  const options: SheetOption[] = [
    { label: 'Sacar foto', icon: 'camera-outline', onPress: () => pick('camera') },
    { label: 'Elegir de la galería', icon: 'images-outline', onPress: () => pick('library') },
    ...(photo ? [{ label: 'Quitar foto', icon: 'trash-outline', onPress: confirmRemove, destructive: true } as SheetOption] : []),
  ];

  return (
    <>
      <Pressable
        onPress={() => setIsSheetOpen(true)}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityLabel={photo ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
      >
        {showPhoto ? (
          <Image
            source={{ uri: `${API_URL}${userPhotoPath(user)}`, headers: { Authorization: `Bearer ${token}` } }}
            style={styles.avatar}
            contentFit="cover"
            transition={150}
            onError={() => setFailedPhoto(photo)}
          />
        ) : (
          <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={[styles.avatar, styles.center]}>
            <Text style={styles.initials}>{initials}</Text>
          </LinearGradient>
        )}
        {isSaving && (
          <View style={[styles.avatar, styles.center, styles.overlay]}>
            <ActivityIndicator color={colors.white} />
          </View>
        )}
        <View style={styles.badge}>
          <Ionicons name="camera" size={16} color={colors.white} />
        </View>
      </Pressable>

      <OptionsSheet visible={isSheetOpen} title="Foto de perfil" options={options} onClose={() => setIsSheetOpen(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.full,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  initials: {
    fontFamily: fonts.title,
    fontSize: fontSizes.xxl,
    color: colors.white,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.violet,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
