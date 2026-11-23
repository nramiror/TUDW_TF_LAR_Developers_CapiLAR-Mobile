import { File, Paths } from 'expo-file-system';

export type SaveImageResult = 'ok' | 'sinPermiso';

// Guarda una imagen en la galería del celular. Acepta un link (YouCam) o una data URL (modo simulado del back):
// primero la deja en la caché de la app y desde ahí la copia a la galería.
// Solo pide permiso de escritura: la app no necesita leer las fotos del usuario
export const saveImageToGallery = async (url: string, nombre: string): Promise<SaveImageResult> => {
  // API "legacy" y cargada recién acá: Expo Go no trae el módulo nativo de la API nueva (ExpoMediaLibraryNext)
  // y, importado arriba, tiraba abajo toda la pantalla al abrirla. Si falla, solo falla el botón
  const MediaLibrary = await import('expo-media-library/legacy');

  const { granted } = await MediaLibrary.requestPermissionsAsync(true);
  if (!granted) return 'sinPermiso';

  // Nombre único: si se guarda dos veces el mismo color, no choca con el archivo anterior
  const archivo = new File(Paths.cache, `${nombre}-${Date.now()}.jpg`);
  const dataUrl = /^data:image\/[\w+.-]+;base64,(.*)$/s.exec(url);
  if (dataUrl) {
    archivo.write(dataUrl[1], { encoding: 'base64' });
  } else {
    await File.downloadFileAsync(url, archivo);
  }

  try {
    await MediaLibrary.saveToLibraryAsync(archivo.uri);
  } finally {
    // La galería ya tiene su copia
    archivo.delete();
  }
  return 'ok';
};
