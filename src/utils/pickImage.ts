import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { FOTO_MAX_BYTES } from '@/api/users';

export type ImageSource = 'camera' | 'library';

// Lado más largo con el que se sube una foto: alcanza para ver el color del cabello y queda muy por debajo de los 2 MB
const MAX_SIDE = 1280;

// Abre la cámara o la galería y devuelve la foto lista para subir (JPG de hasta 1280 px), o null si se canceló.
// Si falta el permiso de la cámara o la foto sigue pesando más de lo que acepta el back, avisa con un Alert
export const pickImage = async (source: ImageSource, options: ImagePicker.ImagePickerOptions = {}) => {
  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Sin permiso de cámara', 'Para sacar fotos, habilitá la cámara para CapiLAR en los ajustes del celular.');
      return null;
    }
  }
  const pickerOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, ...options };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(pickerOptions) : await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled) return null;

  // Las fotos de la cámara salen de varios MB: se achican antes de subirlas
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await (await context.renderAsync()).saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

  if ((new File(image.uri).size ?? 0) > FOTO_MAX_BYTES) {
    Alert.alert('Foto muy pesada', 'Elegí una foto de hasta 2 MB.');
    return null;
  }
  return image.uri;
};
