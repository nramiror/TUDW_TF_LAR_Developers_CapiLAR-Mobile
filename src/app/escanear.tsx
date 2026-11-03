import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { getArticuloPorQrRequest } from '@/api/articulos';
import { ApiError } from '@/api/client';
import { Button } from '@/components/button/button';
import { FormMessage } from '@/components/formMessage/formMessage';
import { Loader } from '@/components/loader/loader';
import { Screen } from '@/components/screen/screen';
import { TextField } from '@/components/textField/textField';
import { useAuth } from '@/context/auth/useAuth';
import { colors, fonts, fontSizes, radius, spacing } from '@/theme';

const errorMessage = (err: unknown) => {
  if (err instanceof ApiError && err.status === 404) return 'Ese código no es de ningún producto del salón.';
  return err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Probá de nuevo.';
};

// F11, desde la pestaña Stock: lee el QR de un producto y abre su detalle (si está dado de baja, el detalle lo avisa).
// Si la cámara no anda o el QR está gastado, el código se puede escribir a mano
export default function Escanear() {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [codigo, setCodigo] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  // La cámara avisa el mismo QR varias veces seguidas: con el ref se busca una sola vez, sin esperar a que cambie el estado
  const buscandoRef = useRef(false);

  const buscar = async (texto: string) => {
    const value = texto.trim();
    if (!token || !value || buscandoRef.current) return;
    buscandoRef.current = true;
    setIsSearching(true);
    setError('');
    try {
      const articulo = await getArticuloPorQrRequest(token, value);
      // replace: al volver del detalle se vuelve a la lista, no a la cámara
      router.replace({ pathname: '/articulo/[articuloId]', params: { articuloId: articulo.id } });
    } catch (err) {
      setError(errorMessage(err));
      buscandoRef.current = false;
    } finally {
      setIsSearching(false);
    }
  };

  // Mientras hay un error en pantalla la cámara no lee, así no se repite el mismo aviso: se sigue con "Escanear otro"
  const scanning = !isSearching && !error;

  if (!permission) return <Loader />;

  return (
    <Screen edges={['bottom']} scroll style={styles.screen}>
      {permission.granted ? (
        <View style={styles.cameraBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanning ? ({ data }) => buscar(data) : undefined}
          />
          <View style={styles.frame} pointerEvents="none" />
        </View>
      ) : (
        <View style={styles.permission}>
          <Text style={styles.text}>Para leer el código QR de los productos, CapiLAR necesita usar la cámara.</Text>
          {permission.canAskAgain ? (
            <Button onPress={requestPermission}>Permitir la cámara</Button>
          ) : (
            // Si se negó dos veces, Android ya no vuelve a preguntar: queda habilitarla en los ajustes
            <Button onPress={() => Linking.openSettings()}>Abrir los ajustes</Button>
          )}
        </View>
      )}

      {permission.granted && !error && (
        <Text style={styles.hint}>{isSearching ? 'Buscando el producto…' : 'Apuntá la cámara al código QR del producto.'}</Text>
      )}

      {error ? (
        <View style={styles.gap}>
          <FormMessage message={error} />
          <Button
            variant="secundario"
            onPress={() => {
              setError('');
              setCodigo('');
            }}
          >
            Escanear otro
          </Button>
        </View>
      ) : null}

      <View style={styles.manual}>
        <TextField
          label="O escribí el código"
          placeholder="ART-7K2M9QXP"
          value={codigo}
          onChangeText={(text) => setCodigo(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => buscar(codigo)}
          hint="Está debajo del QR, en la etiqueta del producto."
        />
        <Button variant="secundario" onPress={() => buscar(codigo)} isLoading={isSearching} disabled={!codigo.trim()}>
          Buscar
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.md,
  },
  cameraBox: {
    aspectRatio: 1,
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Guía para centrar el QR
  frame: {
    width: '65%',
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: radius.lg,
  },
  permission: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.black,
    lineHeight: 22,
  },
  hint: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.grey,
  },
  manual: {
    gap: spacing.sm,
  },
  gap: {
    gap: spacing.md,
  },
});
